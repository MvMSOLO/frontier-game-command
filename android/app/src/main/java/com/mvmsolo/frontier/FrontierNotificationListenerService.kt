package com.mvmsolo.frontier

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class FrontierNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val prefs = getSharedPreferences(OverlayService.PREFS_NAME, MODE_PRIVATE)
        if (!prefs.getBoolean(FrontierJavascriptBridge.KEY_ZERO_DISTRACTION, false)) return
        if (NativeGameMonitor.currentGame == null) return
        val notification = sbn.notification
        if (notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return
        if (notification.category == Notification.CATEGORY_CALL ||
            notification.category == Notification.CATEGORY_ALARM ||
            notification.category == Notification.CATEGORY_REMINDER) return
        if (sbn.packageName == packageName) return
        try { cancelNotification(sbn.key) } catch (_: SecurityException) { }
    }
}
