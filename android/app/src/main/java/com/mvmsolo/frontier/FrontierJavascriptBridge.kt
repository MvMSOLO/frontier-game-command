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

class FrontierJavascriptBridge(private val context: Context, private val host: FrontierBridgeHost) {
    @JavascriptInterface fun getPermissionStatus(permissionId: String): String = NativePermissionManager.status(context, permissionId)
    @JavascriptInterface fun openPermissionSettings(permissionId: String): String = NativePermissionManager.openSettings(context, permissionId)

    @JavascriptInterface
    fun getInstalledGames(): String {
        val installed = JSONArray()
        NativeGameCatalog.games.forEach { game ->
            val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return@forEach
            installed.put(JSONObject().put("id", game.id).put("name", game.name).put("packageName", packageName))
        }
        return JSONObject().put("availability", "available").put("games", installed).toString()
    }

    @JavascriptInterface
    fun getForegroundGame(): String {
        val game = NativeGameMonitor.currentGame ?: return ""
        val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return ""
        return JSONObject().put("id", game.id).put("name", game.name).put("packageName", packageName).toString()
    }

    @JavascriptInterface
    fun setLanguage(language: String) {
        val safeLanguage = if (language == "ru") "ru" else "en"
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putString(OverlayService.KEY_LANGUAGE, safeLanguage).apply()
        try { context.startService(android.content.Intent(context, OverlayService::class.java).setAction(OverlayService.ACTION_UPDATE_LANGUAGE)) } catch (_: Exception) { }
    }

    @JavascriptInterface
    fun setSelectedGames(encodedIds: String) {
        val ids = try { JSONArray(encodedIds).let { array -> (0 until array.length()).mapNotNull { array.optString(it).takeIf(String::isNotBlank) }.toSet() } }
        catch (_: Exception) { emptySet() }
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putStringSet(OverlayService.KEY_SELECTED_GAMES, ids).apply()
    }

    @JavascriptInterface
    fun setAutoDetectEnabled(enabled: Boolean) {
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putBoolean(OverlayService.KEY_AUTO_DETECT, enabled).apply()
    }

    @JavascriptInterface
    fun setZeroDistractionEnabled(enabled: Boolean) {
        context.getSharedPreferences(OverlayService.PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ZERO_DISTRACTION, enabled).apply()
    }

    @JavascriptInterface
    fun getDeviceSnapshot(): String {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val memory = android.app.ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memory)
        val battery = context.registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
        val level = battery?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPercent = if (level >= 0 && scale > 0) (level * 100 / scale) else -1
        val thermal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val power = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            when (power.currentThermalStatus) {
                android.os.PowerManager.THERMAL_STATUS_NONE -> "NORMAL"
                android.os.PowerManager.THERMAL_STATUS_LIGHT -> "LIGHT"
                android.os.PowerManager.THERMAL_STATUS_MODERATE -> "MODERATE"
                android.os.PowerManager.THERMAL_STATUS_SEVERE -> "SEVERE"
                android.os.PowerManager.THERMAL_STATUS_CRITICAL -> "CRITICAL"
                android.os.PowerManager.THERMAL_STATUS_EMERGENCY -> "EMERGENCY"
                else -> "SHUTDOWN"
            }
        } else "UNSUPPORTED"
        return JSONObject().put("availableMemoryMb", memory.availMem / (1024 * 1024))
            .put("totalMemoryMb", memory.totalMem / (1024 * 1024)).put("lowMemory", memory.lowMemory)
            .put("batteryPercent", batteryPercent).put("thermalStatus", thermal).toString()
    }

    @JavascriptInterface
    fun launchGame(gameId: String): Boolean {
        val game = NativeGameCatalog.games.firstOrNull { it.id == gameId } ?: return false
        val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return false
        val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        return try { context.startActivity(intent); true } catch (_: Exception) { false }
    }

    @JavascriptInterface fun startOverlay(): Boolean = host.startOverlay()
    @JavascriptInterface fun minimizeOverlay() = host.minimizeOverlay()
    @JavascriptInterface fun expandOverlay() = host.expandOverlay()
    @JavascriptInterface fun stopOverlay() = host.stopOverlay()

    companion object { const val KEY_ZERO_DISTRACTION = "zero_distraction_enabled" }

    private fun isInstalled(packageName: String): Boolean = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) context.packageManager.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
        else {
            @Suppress("DEPRECATION")
            context.packageManager.getApplicationInfo(packageName, 0)
        }
        true
    } catch (_: PackageManager.NameNotFoundException) { false }
}
