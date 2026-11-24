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
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.widget.TextView

class OverlayService : Service(), FrontierBridgeHost {
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private var currentView: View? = null
    private var overlayWebView: WebView? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startAsForegroundService()
        showCollapsedHandle()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_MINIMIZE -> showCollapsedHandle()
            ACTION_STOP -> stopSelf()
            else -> if (currentView == null) showCollapsedHandle()
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun startOverlay(): Boolean {
        mainHandler.post { showCollapsedHandle() }
        return true
    }

    override fun minimizeOverlay() {
        mainHandler.post { showCollapsedHandle() }
    }

    override fun stopOverlay() {
        mainHandler.post { stopSelf() }
    }

    override fun onDestroy() {
        removeCurrentView()
        super.onDestroy()
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
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.overlay_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Status for the user-enabled FRONTIER game overlay."
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle(getString(R.string.overlay_notification_title))
            .setContentText(getString(R.string.overlay_notification_text))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun showCollapsedHandle() {
        if (!android.provider.Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }
        removeCurrentView()
        val handle = TextView(this).apply {
            text = "F/"
            textSize = 13f
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            setTextColor(Color.rgb(103, 232, 255))
            contentDescription = "Open FRONTIER left-edge controls"
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.rgb(8, 29, 43), Color.rgb(9, 15, 26)),
            ).apply {
                cornerRadii = floatArrayOf(0f, 12f, 12f, 0f, 0f, 12f, 12f, 0f)
                setStroke(dp(1), Color.argb(190, 75, 220, 246))
            }
            elevation = dp(8).toFloat()
            setOnClickListener { showExpandedPanel() }
        }
        currentView = handle
        windowManager.addView(
            handle,
            windowParams(
                dp(25),
                dp(112),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            ),
        )
    }

    private fun showExpandedPanel() {
        if (!android.provider.Settings.canDrawOverlays(this)) {
            NativePermissionManager.openSettings(this, NativePermissionManager.OVERLAY)
            return
        }
        removeCurrentView()
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
            webViewClient = LocalAssetWebViewClient()
            addJavascriptInterface(
                FrontierJavascriptBridge(this@OverlayService, this@OverlayService),
                "FrontierAndroid",
            )
        }
        overlayWebView = webView
        currentView = webView
        val displayHeight = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            windowManager.currentWindowMetrics.bounds.height()
        } else {
            @Suppress("DEPRECATION")
            resources.displayMetrics.heightPixels
        }
        val panelHeight = (displayHeight * 0.82f).toInt().coerceAtLeast(dp(360))
        windowManager.addView(
            webView,
            windowParams(
                dp(340),
                panelHeight,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            ),
        )
        webView.loadUrl(LocalAssetWebViewClient.OVERLAY_URL)
    }

    private fun windowParams(width: Int, height: Int, flags: Int) =
        WindowManager.LayoutParams(
            width,
            height,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            flags or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.START or Gravity.CENTER_VERTICAL
            x = 0
            y = 0
        }

    private fun removeCurrentView() {
        currentView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (_: IllegalArgumentException) {
                // The system may already have removed the window.
            } catch (_: IllegalStateException) {
                // The window manager may already be shutting down.
            }
        }
        currentView = null
        overlayWebView?.let { webView ->
            webView.stopLoading()
            webView.removeJavascriptInterface("FrontierAndroid")
            webView.destroy()
        }
        overlayWebView = null
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val ACTION_MINIMIZE = "com.mvmsolo.frontier.action.MINIMIZE"
        const val ACTION_STOP = "com.mvmsolo.frontier.action.STOP"
        private const val CHANNEL_ID = "frontier_overlay"
        private const val NOTIFICATION_ID = 6041

        fun start(context: Context) {
            val intent = Intent(context, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
