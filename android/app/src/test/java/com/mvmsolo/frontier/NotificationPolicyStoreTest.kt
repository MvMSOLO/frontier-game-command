package com.mvmsolo.frontier

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationPolicyStoreTest {
    @Test
    fun `notification categories important to user are preserved`() {
        val preserved = listOf(
            android.app.Notification.CATEGORY_CALL,
            android.app.Notification.CATEGORY_ALARM,
            android.app.Notification.CATEGORY_NAVIGATION,
            android.app.Notification.CATEGORY_SYSTEM,
            android.app.Notification.CATEGORY_TRANSPORT,
        )
        assertEquals(true, preserved.all { category ->
            category == android.app.Notification.CATEGORY_CALL ||
                category == android.app.Notification.CATEGORY_ALARM ||
                category == android.app.Notification.CATEGORY_NAVIGATION ||
                category == android.app.Notification.CATEGORY_SYSTEM ||
                category == android.app.Notification.CATEGORY_TRANSPORT
        })
    }
}
