package com.mvmsolo.frontier

import android.app.Notification
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPolicyStoreTest {
    @Test
    fun `suppression requires both user opt-in and a selected game in foreground`() {
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(false, true, false, null))
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, false, false, null))
        assertTrue(NotificationSuppressionPolicy.shouldSuppress(true, true, false, null))
    }

    @Test
    fun `ongoing and critical notification categories are always preserved`() {
        val critical = listOf(
            Notification.CATEGORY_CALL,
            Notification.CATEGORY_ALARM,
            Notification.CATEGORY_NAVIGATION,
            Notification.CATEGORY_SYSTEM,
            Notification.CATEGORY_TRANSPORT,
        )
        assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, true, null))
        critical.forEach { category ->
            assertFalse(NotificationSuppressionPolicy.shouldSuppress(true, true, false, category))
        }
    }
}
