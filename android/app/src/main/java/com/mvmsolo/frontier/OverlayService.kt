package com.mvmsolo.frontier

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.res.Configuration
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebView

class OverlayService : Service(), FrontierBridgeHost {
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private var overlayWebView: WebView? = null
    private var expanded = false
    private var viewAttached = false
    private var gameMonitor: NativeGameMonitor? = null
    private var manuallyDismissedGameId: String? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startAsForegroundService()
        createPersistentWebView()
        attachOverlay(expanded = true)
        gameMonitor = NativeGameMonitor(this) { game ->
            mainHandler.post {
                if (game == null) {
                    manuallyDismissedGameId = null
                    if (expanded) setExpanded(false)
                } else {
                    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    val selected = prefs.getStringSet(KEY_SELECTED_GAMES, emptySet()).orEmpty()
                    val autoDetect = prefs.getBoolean(KEY_AUTO_DETECT, true)
                    if (autoDetect && game.id in selected && manuallyDismissedGameId != game.id) setExpanded(true)
                }
            }
        }.start()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_MINIMIZE -> setExpanded(false)
            ACTION_EXPAND -> setExpanded(true)
            ACTION_STOP -> stopSelf()
            else -> setExpanded(true)
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun startOverlay(): Boolean { mainHandler.post { setExpanded(true) }; return true }
    override fun expandOverlay() { mainHandler.post { setExpanded(true) } }
    override fun minimizeOverlay() {
        mainHandler.post {
            manuallyDismissedGameId = NativeGameMonitor.currentGame?.id
            setExpanded(false)
        }
    }
    override fun stopOverlay() { mainHandler.post { stopSelf() } }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (viewAttached) attachOverlay(expanded)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        gameMonitor?.stop()
        gameMonitor = null
        detachAndDestroyWebView()
        super.onDestroy()
    }

    private fun createPersistentWebView() {
        if (overlayWebView != null) return
        overlayWebView = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.blockNetworkLoads = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            webViewClient = LocalAssetWebViewClient { dispatchExpandedState(expanded) }
            addJavascriptInterface(FrontierJavascriptBridge(this@OverlayService, this@OverlayService), "FrontierAndroid")
            loadUrl(LocalAssetWebViewClient.OVERLAY_URL)
        }
    }

    private fun attachOverlay(expanded: Boolean) {
        val webView = overlayWebView ?: return
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }
        val params = buildWindowParams(expanded)
        try {
            if (!viewAttached) { windowManager.addView(webView, params); viewAttached = true }
            else windowManager.updateViewLayout(webView, params)
            this.expanded = expanded
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            dispatchExpandedState(expanded)
        } catch (_: WindowManager.BadTokenException) {
            stopSelf()
        } catch (_: IllegalArgumentException) {
            viewAttached = false
            stopSelf()
        }
    }

    private fun setExpanded(value: Boolean) {
        if (expanded == value && viewAttached) return
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }
        attachOverlay(value)
    }

    private fun buildWindowParams(expanded: Boolean): WindowManager.LayoutParams {
        val metrics = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) windowManager.currentWindowMetrics.bounds
        else {
            @Suppress("DEPRECATION")
            android.graphics.Rect(0, 0, resources.displayMetrics.widthPixels, resources.displayMetrics.heightPixels)
        }
        val displayWidth = metrics.width()
        val displayHeight = metrics.height()
        val density = resources.displayMetrics.density
        val width = if (expanded) OverlayWindowSizing.expandedWidth(displayWidth, density)
            else OverlayWindowSizing.collapsedWidth(displayWidth, density)
        val height = if (expanded) OverlayWindowSizing.expandedHeight(displayHeight, density)
            else OverlayWindowSizing.collapsedHeight(displayHeight, density)
        return WindowManager.LayoutParams(width, height, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT).apply { gravity = Gravity.START or Gravity.CENTER_VERTICAL; x = 0; y = 0 }
    }

    private fun dispatchExpandedState(value: Boolean) {
        val js = "window.dispatchEvent(new CustomEvent('frontier-overlay-expanded',{detail:{expanded:$value}}));"
        mainHandler.postDelayed({ overlayWebView?.takeIf { viewAttached }?.evaluateJavascript(js, null) }, 80)
    }

    private fun detachAndDestroyWebView() {
        val webView = overlayWebView ?: return
        if (viewAttached) try { windowManager.removeView(webView) } catch (_: Exception) { }
        viewAttached = false
        overlayWebView = null
        webView.stopLoading()
        webView.removeJavascriptInterface("FrontierAndroid")
        webView.destroy()
    }

    private fun startAsForegroundService() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL_ID, getString(R.string.overlay_channel_name), NotificationManager.IMPORTANCE_LOW).apply {
                description = "Status for the user-enabled FRONTIER game overlay."
                setShowBadge(false)
            })
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID)
        else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder.setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle(getString(R.string.overlay_notification_title))
            .setContentText(getString(R.string.overlay_notification_text))
            .setContentIntent(pendingIntent).setOngoing(true).setCategory(Notification.CATEGORY_SERVICE).build()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val ACTION_MINIMIZE = "com.mvmsolo.frontier.action.MINIMIZE"
        const val ACTION_EXPAND = "com.mvmsolo.frontier.action.EXPAND"
        const val ACTION_STOP = "com.mvmsolo.frontier.action.STOP"
        const val PREFS_NAME = "frontier_native"
        const val KEY_SELECTED_GAMES = "selected_game_ids"
        const val KEY_AUTO_DETECT = "auto_detect"
        private const val CHANNEL_ID = "frontier_overlay"
        private const val NOTIFICATION_ID = 6041
        fun start(context: Context) {
            val intent = Intent(context, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
        }
    }
}
