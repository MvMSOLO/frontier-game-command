package com.mvmsolo.frontier

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

object NativePermissionManager {
    const val OVERLAY = "overlay"
    const val USAGE_ACCESS = "usage-access"
    const val NOTIFICATION_ACCESS = "notification-access"

    fun status(context: Context, permissionId: String): String = when (permissionId) {
        OVERLAY -> if (Settings.canDrawOverlays(context)) "granted" else "denied"
        USAGE_ACCESS -> if (hasUsageAccess(context)) "granted" else "denied"
        NOTIFICATION_ACCESS -> if (hasNotificationAccess(context)) "granted" else "denied"
        else -> "unsupported"
    }

    fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return try {
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName,
            ) == AppOpsManager.MODE_ALLOWED
        } catch (_: RuntimeException) {
            false
        }
    }

    fun hasNotificationAccess(context: Context): Boolean {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ) ?: return false
        val expected = ComponentName(
            context,
            FrontierNotificationListenerService::class.java,
        ).flattenToString()
        return enabled.split(':').any { it == expected }
    }

    fun openSettings(context: Context, permissionId: String): String {
        val intent = when (permissionId) {
            OVERLAY -> Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}"),
            )
            USAGE_ACCESS -> Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            NOTIFICATION_ACCESS -> Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            else -> return "unsupported"
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            "unknown"
        } catch (_: Exception) {
            "unsupported"
        }
    }
}
