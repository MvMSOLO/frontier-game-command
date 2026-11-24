package com.mvmsolo.frontier

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity(), FrontierBridgeHost {
    private lateinit var webView: WebView
    private lateinit var statusLabel: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(6, 8, 13)
        window.navigationBarColor = Color.rgb(6, 8, 13)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(6, 8, 13))
        }
        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(7), dp(10), dp(7))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.rgb(13, 29, 43), Color.rgb(7, 12, 20)),
            )
        }
        val brand = TextView(this).apply {
            text = "FRONTIER  /  ANDROID CORE"
            setTextColor(Color.rgb(109, 226, 248))
            textSize = 10f
            typeface = Typeface.MONOSPACE
            letterSpacing = 0.08f
        }
        statusLabel = TextView(this).apply {
            textSize = 8f
            setTextColor(Color.rgb(126, 155, 177))
            typeface = Typeface.MONOSPACE
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
        }
        val startButton = toolbarButton("START LEFT OVERLAY")
        val stopButton = toolbarButton("STOP")
        startButton.setOnClickListener {
            if (Settings.canDrawOverlays(this)) startOverlay()
            else NativePermissionManager.openSettings(this, NativePermissionManager.OVERLAY)
        }
        stopButton.setOnClickListener { stopOverlay() }

        toolbar.addView(brand, LinearLayout.LayoutParams(0, dp(36), 1f))
        toolbar.addView(statusLabel, LinearLayout.LayoutParams(dp(92), dp(36)))
        toolbar.addView(startButton, LinearLayout.LayoutParams(dp(122), dp(36)).apply { leftMargin = dp(6) })
        toolbar.addView(stopButton, LinearLayout.LayoutParams(dp(54), dp(36)).apply { leftMargin = dp(6) })
        root.addView(toolbar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)))

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(6, 8, 13))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.blockNetworkLoads = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            webViewClient = LocalAssetWebViewClient()
            addJavascriptInterface(
                FrontierJavascriptBridge(this@MainActivity, this@MainActivity),
                "FrontierAndroid",
            )
        }
        root.addView(
            webView,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f),
        )
        setContentView(root)
        webView.loadUrl(LocalAssetWebViewClient.APP_URL)
        refreshPermissionLabel()
        NativeGameDiscovery.refresh(this) { games ->
            webView.post {
                val payload = NativeGameDiscovery.toJson()
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('frontier:native-event',{detail:JSON.parse(${org.json.JSONObject.quote(org.json.JSONObject().put(\"version\",1).put(\"sequence\",1).put(\"type\",\"game-library\").put(\"payload\",org.json.JSONObject(payload)).toString())})}));",
                    null,
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            refreshPermissionLabel()
            webView.evaluateJavascript("window.dispatchEvent(new Event('focus'));", null)
            OverlayService.send(this, OverlayService.ACTION_REFRESH_STATE)
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.removeJavascriptInterface("FrontierAndroid")
            webView.destroy()
        }
        super.onDestroy()
    }

    override fun startOverlay(): Boolean {
        if (!Settings.canDrawOverlays(this)) {
            NativePermissionManager.openSettings(this, NativePermissionManager.OVERLAY)
            return false
        }
        return try {
            OverlayService.start(this)
            true
        } catch (_: RuntimeException) {
            false
        }
    }

    override fun expandOverlay(): Boolean = startOverlay()

    override fun collapseOverlay() = minimizeOverlay()

    override fun minimizeOverlay() {
        OverlayService.send(this, OverlayService.ACTION_MINIMIZE)
    }

    override fun stopOverlay() {
        stopService(Intent(this, OverlayService::class.java))
    }

    override fun setAutoDetect(enabled: Boolean): Boolean {
        if (enabled && !NativePermissionManager.hasUsageAccess(this)) {
            NativePermissionManager.openSettings(this, NativePermissionManager.USAGE_ACCESS)
            return false
        }
        GameSelectionStore.setAutoDetectEnabled(this, enabled)
        if (enabled) {
            OverlayService.start(this)
            OverlayService.send(
                this,
                OverlayService.ACTION_SET_AUTO_DETECT,
                Intent().putExtra(OverlayService.EXTRA_ENABLED, true),
            )
        } else {
            OverlayService.send(
                this,
                OverlayService.ACTION_SET_AUTO_DETECT,
                Intent().putExtra(OverlayService.EXTRA_ENABLED, false),
            )
        }
        return true
    }

    override fun setSelectedGames(gameIdsJson: String): Boolean {
        val saved = GameSelectionStore.setSelectedGameIds(this, gameIdsJson)
        if (saved) OverlayService.send(this, OverlayService.ACTION_SET_SELECTED_GAMES, Intent().putExtra(OverlayService.EXTRA_GAME_IDS, gameIdsJson))
        return saved
    }

    override fun launchGame(gameId: String): String = NativeGameDiscovery.launch(this, gameId)

    private fun refreshPermissionLabel() {
        if (!::statusLabel.isInitialized) return
        statusLabel.text = if (Settings.canDrawOverlays(this)) "OVERLAY READY" else "OVERLAY ACCESS NEEDED"
    }

    private fun toolbarButton(label: String) = Button(this).apply {
        text = label
        textSize = 8f
        isAllCaps = false
        setTextColor(Color.rgb(225, 245, 255))
        background = GradientDrawable().apply {
            setColor(Color.rgb(22, 66, 83))
            cornerRadius = dp(7).toFloat()
            setStroke(dp(1), Color.rgb(70, 190, 218))
        }
        minHeight = 0
        minimumHeight = dp(34)
        minWidth = 0
        minimumWidth = dp(42)
        setPadding(dp(4), 0, dp(4), 0)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
