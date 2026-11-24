package com.mvmsolo.frontier

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

object NotificationSuppressionPolicy {
    private val preservedCategories = setOf(
        Notification.CATEGORY_CALL,
        Notification.CATEGORY_ALARM,
        Notification.CATEGORY_NAVIGATION,
        Notification.CATEGORY_SYSTEM,
        Notification.CATEGORY_TRANSPORT,
    )

    fun shouldSuppress(
        enabled: Boolean,
        selectedGameActive: Boolean,
        ongoing: Boolean,
        category: String?,
    ): Boolean =
        enabled && selectedGameActive && !ongoing && category !in preservedCategories
}

class FrontierNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
        val notification = sbn.notification ?: return
        if (!NotificationSuppressionPolicy.shouldSuppress(
                enabled = NotificationPolicyStore.isEnabled(this),
                selectedGameActive = NativeForegroundState.current != null,
                ongoing = (notification.flags and Notification.FLAG_ONGOING_EVENT) != 0,
                category = notification.category,
            )
        ) return

        // Notification content is neither read nor stored.
        cancelNotification(sbn.key)
    }
}
