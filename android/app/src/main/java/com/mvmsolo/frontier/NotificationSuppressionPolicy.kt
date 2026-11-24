package com.mvmsolo.frontier

import android.app.Notification

object NotificationSuppressionPolicy {
    private val protectedPackages = setOf(
        "android",
        "com.android.systemui",
        "com.android.phone",
        "com.android.server.telecom",
        "com.android.dialer",
        "com.google.android.dialer",
        "com.android.deskclock",
        "com.google.android.deskclock",
        "com.android.providers.downloads",
    )

    fun shouldSuppress(
        enabled: Boolean,
        gameActive: Boolean,
        category: String?,
        flags: Int,
        packageName: String,
    ): Boolean {
        if (!enabled || !gameActive) return false
        if (flags and Notification.FLAG_ONGOING_EVENT != 0) return false
        if (flags and Notification.FLAG_FOREGROUND_SERVICE != 0) return false
        if (category == Notification.CATEGORY_CALL ||
            category == Notification.CATEGORY_ALARM ||
            category == Notification.CATEGORY_REMINDER) return false
        if (packageName in protectedPackages) return false
        return true
    }
}
