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
        if (!NativePermissionManager.hasUsageAccess(context)) return ""
        val game = foregroundGame() ?: return ""
        val packageName = game.packageNames.firstOrNull { isInstalled(it) } ?: return ""
        return JSONObject()
            .put("id", game.id)
            .put("name", game.name)
            .put("packageName", packageName)
            .toString()
    }

    @JavascriptInterface
    fun startOverlay(): Boolean = host.startOverlay()

    @JavascriptInterface
    fun minimizeOverlay() = host.minimizeOverlay()

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

    private fun foregroundGame(): NativeGame? {
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val events = try {
            manager.queryEvents(now - 6 * 60 * 60 * 1000L, now) ?: return null
        } catch (_: RuntimeException) {
            return null
        }

        val event = android.app.usage.UsageEvents.Event()
        val activityEvents = mutableListOf<NativeUsageEvent>()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val isForeground = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                when (event.eventType) {
                    android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED -> true
                    android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
                    android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED -> false
                    else -> null
                }
            } else {
                @Suppress("DEPRECATION")
                when (event.eventType) {
                    android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND -> true
                    android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND -> false
                    else -> null
                }
            }
            if (isForeground != null) {
                activityEvents += NativeUsageEvent(
                    packageName = event.packageName.orEmpty(),
                    timestamp = event.timeStamp,
                    foreground = isForeground,
                )
            }
        }
        return NativeGameCatalog.resolveForegroundGame(activityEvents)
    }
}
