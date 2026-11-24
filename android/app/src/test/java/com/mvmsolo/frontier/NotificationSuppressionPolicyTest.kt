package com.mvmsolo.frontier

import android.app.Notification
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationSuppressionPolicyTest {
    @Test fun `suppression requires opt in and active game`() {
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(false, true, null, 0, "com.chat.app"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, false, null, 0, "com.chat.app"))
        assertTrue(NotificationSuppressionPolicy.shouldSuppress(true, true, null, 0, "com.chat.app"))
    }

    @Test fun `calls alarms reminders and ongoing notifications are preserved`() {
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, Notification.CATEGORY_CALL, 0, "com.chat.app"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, Notification.CATEGORY_ALARM, 0, "com.clock.app"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, Notification.CATEGORY_REMINDER, 0, "com.calendar.app"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, null, Notification.FLAG_ONGOING_EVENT, "com.chat.app"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, null, Notification.FLAG_FOREGROUND_SERVICE, "com.app.service"))
    }

    @Test fun `critical system packages are preserved`() {
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, null, 0, "com.android.systemui"))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, null, 0, "com.android.phone"))
    }
}
