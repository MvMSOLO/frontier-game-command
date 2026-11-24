package com.mvmsolo.frontier

import android.content.Context
import android.content.pm.PackageManager
import android.app.usage.UsageStatsManager
import android.os.Build
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

interface FrontierBridgeHost {
    fun startOverlay(): Boolean
    fun minimizeOverlay()
    fun expandOverlay()
    fun stopOverlay()
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

    @JavascriptInterface
    fun getInstalledGames(): String {
        if (!NativePermissionManager.hasUsageAccess(context)) {
            return JSONObject()
                .put("availability", "permission-required")
                .put("games", JSONArray())
                .toString()
        }

        val installed = JSONArray()
        NativeGameCatalog.games.forEach { game ->
            val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return@forEach
            installed.put(
                JSONObject()
                    .put("id", game.id)
                    .put("name", game.name)
                    .put("packageName", packageName),
            )
        }
        return JSONObject()
            .put("availability", "available")
            .put("games", installed)
            .toString()
    }

    @JavascriptInterface
    fun getForegroundGame(): String {
        val game = NativeGameMonitor.currentGame ?: return ""
        val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return ""
        return JSONObject().put("id", game.id).put("name", game.name).put("packageName", packageName).toString()
    }

    @JavascriptInterface
    fun setSelectedGames(encodedIds: String) {
        val ids = try { JSONArray(encodedIds).let { array ->
            (0 until array.length()).mapNotNull { array.optString(it).takeIf(String::isNotBlank) }.toSet()
        } } catch (_: Exception) { emptySet() }
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putStringSet(OverlayService.KEY_SELECTED_GAMES, ids).apply()
    }

    @JavascriptInterface
    fun setAutoDetectEnabled(enabled: Boolean) {
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(OverlayService.KEY_AUTO_DETECT, enabled).apply()
    }

    @JavascriptInterface
    fun launchGame(gameId: String): Boolean {
        val game = NativeGameCatalog.games.firstOrNull { it.id == gameId } ?: return false
        val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return false
        val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        return try { context.startActivity(intent); true } catch (_: Exception) { false }
    }

    @JavascriptInterface
    fun startOverlay(): Boolean = host.startOverlay()

    @JavascriptInterface
    fun minimizeOverlay() = host.minimizeOverlay()

    @JavascriptInterface
    fun expandOverlay() = host.expandOverlay()

    @JavascriptInterface
    fun stopOverlay() = host.stopOverlay()

    private fun isInstalled(packageName: String): Boolean = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.packageManager.getApplicationInfo(
                packageName,
                PackageManager.ApplicationInfoFlags.of(0),
            )
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getApplicationInfo(packageName, 0)
        }
        true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }

}
