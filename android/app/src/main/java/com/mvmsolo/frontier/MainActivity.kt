package com.mvmsolo.frontier

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
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
import java.util.Locale

class MainActivity : Activity(), FrontierBridgeHost {
    private lateinit var webView: WebView
    private lateinit var statusLabel: TextView
    private lateinit var brandLabel: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button

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
        brandLabel = TextView(this).apply {
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
        startButton = toolbarButton(getString(R.string.start_overlay))
        stopButton = toolbarButton(getString(R.string.stop_overlay))
        startButton.setOnClickListener {
            if (Settings.canDrawOverlays(this)) startOverlay()
            else NativePermissionManager.openSettings(this, NativePermissionManager.OVERLAY)
        }
        stopButton.setOnClickListener { stopOverlay() }

        toolbar.addView(brandLabel, LinearLayout.LayoutParams(0, dp(36), 1f))
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
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            applyNativeLanguage()
            refreshPermissionLabel()
            webView.evaluateJavascript("window.dispatchEvent(new Event('focus'));", null)
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

    override fun expandOverlay() { startOverlay() }
    override fun updateLanguage() { runOnUiThread { applyNativeLanguage(); refreshPermissionLabel() } }

    override fun minimizeOverlay() {
        startService(Intent(this, OverlayService::class.java).setAction(OverlayService.ACTION_MINIMIZE))
    }

    override fun stopOverlay() {
        stopService(Intent(this, OverlayService::class.java))
    }

    private fun localizedContext(): Context {
        val language = getSharedPreferences(OverlayService.PREFS_NAME, MODE_PRIVATE).getString(OverlayService.KEY_LANGUAGE, "en") ?: "en"
        val configuration = Configuration(resources.configuration)
        configuration.setLocale(Locale.forLanguageTag(language))
        return createConfigurationContext(configuration)
    }

    private fun applyNativeLanguage() {
        if (!::brandLabel.isInitialized) return
        val localized = localizedContext()
        brandLabel.text = localized.getString(R.string.native_brand)
        startButton.text = localized.getString(R.string.start_overlay)
        stopButton.text = localized.getString(R.string.stop_overlay)
    }

    private fun refreshPermissionLabel() {
        if (!::statusLabel.isInitialized) return
        val localized = localizedContext()
        statusLabel.text = if (Settings.canDrawOverlays(this)) localized.getString(R.string.overlay_ready) else localized.getString(R.string.overlay_access_needed)
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
