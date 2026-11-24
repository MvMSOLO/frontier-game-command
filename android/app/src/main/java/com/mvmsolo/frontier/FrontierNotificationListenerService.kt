package com.mvmsolo.frontier

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class FrontierNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val enabled = getSharedPreferences(OverlayService.PREFS_NAME, MODE_PRIVATE)
            .getBoolean(FrontierJavascriptBridge.KEY_ZERO_DISTRACTION, false)
        val shouldSuppress = NotificationSuppressionPolicy.shouldSuppress(
            enabled = enabled,
            gameActive = NativeGameMonitor.currentGame != null,
            category = sbn.notification.category,
            flags = sbn.notification.flags,
            packageName = sbn.packageName,
        )
        if (!shouldSuppress) return
        try { cancelNotification(sbn.key) } catch (_: SecurityException) { }
    }
}
