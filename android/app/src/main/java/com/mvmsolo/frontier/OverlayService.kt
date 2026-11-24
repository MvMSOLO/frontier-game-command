package com.mvmsolo.frontier

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicLong

class OverlayService : Service(), FrontierBridgeHost {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val eventSequence = AtomicLong(0)
    private lateinit var windowManager: WindowManager
    private var overlayWebView: WebView? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    private var windowAdded = false
    private var expanded = false
    private var foregroundMonitor: ForegroundGameMonitor? = null
    private var activeGame: NativeGame? = null
    private var manuallyDismissedGameId: String? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startAsForegroundService()
        createOverlayWebView()
        NativeGameDiscovery.refresh(this) { games ->
            emitNativeEvent(
                "game-library",
                JSONObject().put("availability", "available").put("games", NativeGameDiscovery.toJsonArray()),
            )
        }
        refreshAutoDetect()
        emitPermissionSnapshot()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_EXPAND -> expandOverlay()
            ACTION_MINIMIZE -> collapseOverlay()
            ACTION_STOP -> stopSelf()
            ACTION_SET_AUTO_DETECT -> setAutoDetect(intent.getBooleanExtra(EXTRA_ENABLED, false))
            ACTION_SET_SELECTED_GAMES -> setSelectedGames(intent.getStringExtra(EXTRA_GAME_IDS) ?: "[]")
            ACTION_REFRESH_STATE -> {
                emitPermissionSnapshot()
                refreshAutoDetect()
                NativeGameDiscovery.refresh(this) {
                    emitNativeEvent(
                        "game-library",
                        JSONObject().put("availability", "available").put("games", NativeGameDiscovery.toJsonArray()),
                    )
                }
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    }

    override fun startOverlay(): Boolean {
        if (!android.provider.Settings.canDrawOverlays(this)) return false
        mainHandler.post { resizeOverlay(expand = false) }
        return true
    }

    override fun expandOverlay(): Boolean {
        if (!android.provider.Settings.canDrawOverlays(this)) return false
        mainHandler.post { resizeOverlay(expand = true) }
        return true
    }

    override fun minimizeOverlay() = collapseOverlay()

    override fun collapseOverlay() {
        mainHandler.post {
            manuallyDismissedGameId = activeGame?.id
            resizeOverlay(expand = false)
        }
    }

    override fun stopOverlay() {
        mainHandler.post { stopSelf() }
    }

    override fun setAutoDetect(enabled: Boolean): Boolean {
        if (enabled && !NativePermissionManager.hasUsageAccess(this)) {
            NativePermissionManager.openSettings(this, NativePermissionManager.USAGE_ACCESS)
            emitNativeEvent("detector-state", JSONObject().put("status", "permission-required"))
            return false
        }
        GameSelectionStore.setAutoDetectEnabled(this, enabled)
        refreshAutoDetect()
        return true
    }

    override fun setSelectedGames(gameIdsJson: String): Boolean {
        val saved = GameSelectionStore.setSelectedGameIds(this, gameIdsJson)
        if (saved) {
            emitNativeEvent(
                "selection-state",
                JSONObject().put("selectedGameIds", org.json.JSONArray(GameSelectionStore.selectedGameIds(this))),
            )
        }
        return saved
    }

    override fun launchGame(gameId: String): String = NativeGameDiscovery.launch(this, gameId)

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        mainHandler.post { resizeOverlay(expand = expanded) }
    }

    override fun onDestroy() {
        foregroundMonitor?.stop()
        foregroundMonitor = null
        overlayWebView?.let { webView ->
            if (windowAdded) {
                try {
                    windowManager.removeView(webView)
                } catch (_: IllegalArgumentException) {
                    // Window was removed by Android.
                } catch (_: IllegalStateException) {
                    // Window manager is already shutting down.
                }
            }
            webView.stopLoading()
            webView.removeJavascriptInterface("FrontierAndroid")
            webView.destroy()
        }
        overlayWebView = null
        overlayParams = null
        windowAdded = false
        NativeForegroundState.current = null
        super.onDestroy()
    }

    private fun createOverlayWebView() {
        if (overlayWebView != null || !android.provider.Settings.canDrawOverlays(this)) return
        val webView = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.blockNetworkLoads = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            webViewClient = LocalAssetWebViewClient()
            addJavascriptInterface(
                FrontierJavascriptBridge(this@OverlayService, this@OverlayService),
                "FrontierAndroid",
            )
        }
        overlayWebView = webView
        val params = windowParams(collapsedWidth(), collapsedHeight(), collapsedFlags())
        overlayParams = params
        try {
            windowManager.addView(webView, params)
            windowAdded = true
            webView.loadUrl(LocalAssetWebViewClient.OVERLAY_URL)
        } catch (_: RuntimeException) {
            windowAdded = false
            stopSelf()
        }
    }

    private fun resizeOverlay(expand: Boolean) {
        if (!android.provider.Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }
        val webView = overlayWebView ?: run {
            createOverlayWebView()
            return
        }
        val params = overlayParams ?: return
        expanded = expand
        if (expand) {
            val size = expandedSize()
            params.width = size.first
            params.height = size.second
            params.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        } else {
            params.width = collapsedWidth()
            params.height = collapsedHeight()
            params.flags = collapsedFlags()
            params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_UNCHANGED
        }
        params.gravity = Gravity.START or Gravity.CENTER_VERTICAL
        params.x = 0
        params.y = 0
        try {
            if (windowAdded) {
                windowManager.updateViewLayout(webView, params)
            } else {
                windowManager.addView(webView, params)
                windowAdded = true
                webView.loadUrl(LocalAssetWebViewClient.OVERLAY_URL)
            }
            emitNativeEvent("overlay-state", JSONObject().put("expanded", expanded))
        } catch (_: IllegalArgumentException) {
            windowAdded = false
            try {
                windowManager.addView(webView, params)
                windowAdded = true
            } catch (_: RuntimeException) {
                stopSelf()
            }
        } catch (_: RuntimeException) {
            stopSelf()
        }
    }

    private fun expandedSize(): Pair<Int, Int> {
        val bounds = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            windowManager.currentWindowMetrics.bounds
        } else {
            @Suppress("DEPRECATION")
            android.graphics.Rect(0, 0, resources.displayMetrics.widthPixels, resources.displayMetrics.heightPixels)
        }
        val displayWidth = bounds.width()
        val displayHeight = bounds.height()
        val portrait = displayHeight > displayWidth
        val widthRatio = if (portrait) 0.92f else 0.46f
        val preferredWidth = if (portrait) dp(420) else dp(360)
        val panelWidth = minOf(preferredWidth, (displayWidth * widthRatio).toInt(), displayWidth - dp(20))
            .coerceAtLeast(dp(240))
        val panelHeight = minOf((displayHeight * 0.92f).toInt(), displayHeight - dp(24))
            .coerceAtLeast(dp(300))
        return panelWidth to panelHeight
    }

    private fun collapsedWidth() = dp(42)
    private fun collapsedHeight() = dp(136)

    private fun collapsedFlags() =
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN

    private fun windowParams(width: Int, height: Int, flags: Int) =
        WindowManager.LayoutParams(
            width,
            height,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            flags,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.START or Gravity.CENTER_VERTICAL
            x = 0
            y = 0
        }

    private fun refreshAutoDetect() {
        val enabled = GameSelectionStore.isAutoDetectEnabled(this)
        if (!enabled) {
            foregroundMonitor?.stop()
            foregroundMonitor = null
            NativeForegroundState.current = null
            emitNativeEvent("detector-state", JSONObject().put("status", "disabled"))
            return
        }
        if (!NativePermissionManager.hasUsageAccess(this)) {
            emitNativeEvent("detector-state", JSONObject().put("status", "permission-required"))
            return
        }
        if (foregroundMonitor == null) {
            foregroundMonitor = ForegroundGameMonitor(this) { game, status ->
                mainHandler.post { onForegroundStateChanged(game, status) }
            }
        }
        foregroundMonitor?.start()
    }

    private fun onForegroundStateChanged(game: NativeGame?, status: String) {
        NativeForegroundState.current = game
        activeGame = game
        val payload = JSONObject()
            .put("status", status)
            .put("game", game?.let {
                JSONObject().put("id", it.id).put("name", it.name)
                    .put("packageName", it.packageNames.firstOrNull().orEmpty())
            } ?: JSONObject.NULL)
        emitNativeEvent("game-state", payload)
        if (status == "permission-required" || status == "unavailable") {
            emitNativeEvent("detector-state", JSONObject().put("status", status))
        } else if (status == "running") {
            emitNativeEvent("detector-state", JSONObject().put("status", "running"))
        } else if (game == null) {
            manuallyDismissedGameId = null
            resizeOverlay(expand = false)
        } else if (GameSelectionStore.isAutoDetectEnabled(this) && manuallyDismissedGameId != game.id) {
            resizeOverlay(expand = true)
        }
    }

    private fun emitPermissionSnapshot() {
        val ids = JSONArrayCompat.PERMISSION_IDS
        val states = JSONObject()
        ids.forEach { id -> states.put(id, NativePermissionManager.status(this, id)) }
        emitNativeEvent("permission-state", states)
    }

    private fun emitNativeEvent(type: String, payload: JSONObject) {
        val envelope = JSONObject()
            .put("version", 1)
            .put("sequence", eventSequence.incrementAndGet())
            .put("type", type)
            .put("payload", payload)
        val quoted = JSONObject.quote(envelope.toString())
        mainHandler.post {
            val target = overlayWebView ?: return@post
            if (!windowAdded) return@post
            target.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('frontier:native-event',{detail:JSON.parse($quoted)}));",
                null,
            )
        }
    }

    private fun startAsForegroundService() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.overlay_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Status for the user-enabled FRONTIER game overlay."
                setShowBadge(false)
            },
        )
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_view)
                .setContentTitle(getString(R.string.overlay_notification_title))
                .setContentText(getString(R.string.overlay_notification_text))
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setSmallIcon(android.R.drawable.ic_menu_view)
                .setContentTitle(getString(R.string.overlay_notification_title))
                .setContentText(getString(R.string.overlay_notification_text))
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build()
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val ACTION_EXPAND = "com.mvmsolo.frontier.action.EXPAND"
        const val ACTION_MINIMIZE = "com.mvmsolo.frontier.action.MINIMIZE"
        const val ACTION_STOP = "com.mvmsolo.frontier.action.STOP"
        const val ACTION_SET_AUTO_DETECT = "com.mvmsolo.frontier.action.SET_AUTO_DETECT"
        const val ACTION_SET_SELECTED_GAMES = "com.mvmsolo.frontier.action.SET_SELECTED_GAMES"
        const val ACTION_REFRESH_STATE = "com.mvmsolo.frontier.action.REFRESH_STATE"
        const val EXTRA_ENABLED = "enabled"
        const val EXTRA_GAME_IDS = "game_ids"
        private const val CHANNEL_ID = "frontier_overlay"
        private const val NOTIFICATION_ID = 6041

        fun isRunning(context: Context): Boolean =
            (context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager)
                .getRunningServices(Int.MAX_VALUE)
                .any { it.service.className == OverlayService::class.java.name }

        fun start(context: Context, action: String? = null, extras: Intent? = null) {
            val intent = Intent(context, OverlayService::class.java)
            if (action != null) intent.action = action
            extras?.extras?.let { intent.putExtras(it) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun send(context: Context, action: String, extras: Intent? = null) {
            val intent = Intent(context, OverlayService::class.java).setAction(action)
            extras?.extras?.let { intent.putExtras(it) }
            context.startService(intent)
        }
    }
}

private object JSONArrayCompat {
    val PERMISSION_IDS = listOf("overlay", "usage-access", "notification-access")
}
