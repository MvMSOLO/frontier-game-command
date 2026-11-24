package com.mvmsolo.frontier

import android.content.Context

object NotificationPolicyStore {
    private const val PREFS = "frontier_native"
    private const val SUPPRESS_IN_GAME = "suppress_notifications_in_game"

    fun isEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(SUPPRESS_IN_GAME, false)

    fun setEnabled(context: Context, enabled: Boolean): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(SUPPRESS_IN_GAME, enabled)
            .commit()
}
