package com.mvmsolo.frontier

import android.content.Context
import android.content.pm.PackageManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

data class InstalledNativeGame(
    val id: String,
    val name: String,
    val packageName: String,
)

object NativeGameDiscovery {
    private val executor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "FRONTIER-GameLibrary").apply { isDaemon = true }
    }
    private val cachedGames = AtomicReference<List<InstalledNativeGame>>(emptyList())
    private val hasScanned = java.util.concurrent.atomic.AtomicBoolean(false)

    fun cached(): List<InstalledNativeGame> = cachedGames.get()

    fun refresh(context: Context, onUpdated: ((List<InstalledNativeGame>) -> Unit)? = null) {
        if (!hasScanned.compareAndSet(false, true)) {
            onUpdated?.invoke(cached())
            return
        }
        val appContext = context.applicationContext
        executor.execute {
            val discovered = NativeGameCatalog.games.mapNotNull { game ->
                val installedPackage = game.packageNames.firstOrNull { packageName ->
                    isInstalled(appContext, packageName)
                } ?: return@mapNotNull null
                InstalledNativeGame(game.id, game.name, installedPackage)
            }
            cachedGames.set(discovered)
            onUpdated?.invoke(discovered)
        }
    }

    fun toJsonArray(): JSONArray {
        val games = JSONArray()
        cached().forEach { game ->
            games.put(
                JSONObject()
                    .put("id", game.id)
                    .put("name", game.name)
                    .put("packageName", game.packageName),
            )
        }
        return games
    }

    fun toJson(): String = JSONObject()
        .put("availability", "available")
        .put("games", toJsonArray())
        .toString()

    fun findInstalled(gameId: String): InstalledNativeGame? =
        cached().firstOrNull { it.id == gameId }

    fun launch(context: Context, gameId: String): String {
        val installed = findInstalled(gameId) ?: return "not-installed"
        val intent = try {
            context.packageManager.getLaunchIntentForPackage(installed.packageName)
        } catch (_: RuntimeException) {
            null
        } ?: return "not-launchable"
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            "launched"
        } catch (_: Exception) {
            "not-launchable"
        }
    }

    @Suppress("DEPRECATION")
    private fun isInstalled(context: Context, packageName: String): Boolean = try {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            context.packageManager.getApplicationInfo(
                packageName,
                PackageManager.ApplicationInfoFlags.of(0),
            )
        } else {
            context.packageManager.getApplicationInfo(packageName, 0)
        }
        true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    } catch (_: RuntimeException) {
        false
    }
}
