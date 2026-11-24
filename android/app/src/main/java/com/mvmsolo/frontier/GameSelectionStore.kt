package com.mvmsolo.frontier

import android.content.Context
import org.json.JSONArray

object GameSelectionCodec {
    fun parseSelectedIds(json: String): Set<String> {
        val allowed = NativeGameCatalog.games.map { it.id }.toSet()
        return try {
            val values = JSONArray(json)
            buildSet {
                for (index in 0 until values.length()) {
                    val id = values.optString(index, "")
                    if (id in allowed) add(id)
                }
            }
        } catch (_: Exception) {
            emptySet()
        }
    }
}

object GameSelectionStore {
    private const val PREFS = "frontier_native"
    private const val SELECTED_IDS = "selected_game_ids"
    private const val AUTO_DETECT = "auto_detect_enabled"

    fun selectedGameIds(context: Context): Set<String> =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getStringSet(SELECTED_IDS, emptySet())
            .orEmpty()
            .filter { NativeGameCatalog.forId(it) != null }
            .toSet()

    fun setSelectedGameIds(context: Context, json: String): Boolean {
        val ids = GameSelectionCodec.parseSelectedIds(json)
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(SELECTED_IDS, ids)
            .commit()
    }

    fun isAutoDetectEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(AUTO_DETECT, false)

    fun setAutoDetectEnabled(context: Context, enabled: Boolean): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(AUTO_DETECT, enabled)
            .commit()

    fun isSelected(context: Context, gameId: String): Boolean =
        selectedGameIds(context).contains(gameId)
}
