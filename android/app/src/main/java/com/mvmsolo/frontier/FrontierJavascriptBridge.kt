package com.mvmsolo.frontier

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

interface FrontierBridgeHost {
    fun startOverlay(): Boolean
    fun expandOverlay(): Boolean
    fun collapseOverlay()
    fun minimizeOverlay()
    fun stopOverlay()
    fun setAutoDetect(enabled: Boolean): Boolean
    fun setSelectedGames(gameIdsJson: String): Boolean
    fun launchGame(gameId: String): String
    fun getAutoDetectEnabled(): Boolean
    fun getSelectedGameIds(): String
    fun getDetectorStatus(): String
    fun openSetup()
}

class FrontierJavascriptBridge(
    private val context: Context,
    private val host: FrontierBridgeHost,
) {
    @JavascriptInterface
    fun getPermissionStatus(permissionId: String): String =
        NativePermissionManager.status(context, permissionId)

    @JavascriptInterface
    fun openPermissionSettings(permissionId: String): String =
        NativePermissionManager.openSettings(context, permissionId)

    // This returns a cached snapshot only. PackageManager scanning happens on a background executor.
    @JavascriptInterface
    fun getInstalledGames(): String = NativeGameDiscovery.toJson()

    // This returns an atomic in-memory snapshot only; it never queries UsageStats.
    @JavascriptInterface
    fun getForegroundGame(): String {
        val game = NativeForegroundState.current ?: return ""
        val packageName = game.packageNames.firstOrNull().orEmpty()
        return JSONObject()
            .put("id", game.id)
            .put("name", game.name)
            .put("packageName", packageName)
            .toString()
    }

    @JavascriptInterface
    fun startOverlay(): Boolean = host.startOverlay()

    @JavascriptInterface
    fun expandOverlay(): Boolean = host.expandOverlay()

    @JavascriptInterface
    fun collapseOverlay() = host.collapseOverlay()

    @JavascriptInterface
    fun minimizeOverlay() = host.minimizeOverlay()

    @JavascriptInterface
    fun stopOverlay() = host.stopOverlay()

    @JavascriptInterface
    fun setAutoDetect(enabled: Boolean): Boolean = host.setAutoDetect(enabled)

    @JavascriptInterface
    fun setSelectedGames(gameIdsJson: String): Boolean = host.setSelectedGames(gameIdsJson)

    @JavascriptInterface
    fun launchGame(gameId: String): String = host.launchGame(gameId)

    @JavascriptInterface
    fun getAutoDetectEnabled(): Boolean = GameSelectionStore.isAutoDetectEnabled(context)

    @JavascriptInterface
    fun getSelectedGameIds(): String =
        JSONObject().put("ids", JSONArray(GameSelectionStore.selectedGameIds(context))).toString()

    @JavascriptInterface
    fun getDetectorStatus(): String = when {
        !NativePermissionManager.hasUsageAccess(context) -> "permission-required"
        !OverlayService.isRunning(context) -> "disabled"
        !GameSelectionStore.isAutoDetectEnabled(context) -> "monitoring"
        else -> "running"
    }

    @JavascriptInterface
    fun openSetup() = host.openSetup()
}

