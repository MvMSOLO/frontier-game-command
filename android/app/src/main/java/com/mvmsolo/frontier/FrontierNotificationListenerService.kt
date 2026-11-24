package com.mvmsolo.frontier

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class FrontierNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!NotificationPolicyStore.isEnabled(this)) return
        if (sbn.packageName == packageName) return
        if (NativeForegroundState.current == null) return
        val notification = sbn.notification ?: return
        if ((notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) return
        if (isAlwaysPreservedCategory(notification.category)) return

        // Notification payload/title/text are never read or persisted.
        cancelNotification(sbn.key)
    }

    private fun isAlwaysPreservedCategory(category: String?): Boolean {
        return category == Notification.CATEGORY_CALL ||
            category == Notification.CATEGORY_ALARM ||
            category == Notification.CATEGORY_NAVIGATION ||
            category == Notification.CATEGORY_SYSTEM ||
            category == Notification.CATEGORY_TRANSPORT
    }
}
