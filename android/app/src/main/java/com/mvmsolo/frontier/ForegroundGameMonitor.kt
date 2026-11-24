package com.mvmsolo.frontier

import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import java.util.LinkedHashSet

class ForegroundGameMonitor(
    context: Context,
    private val onStateChanged: (NativeGame?, String) -> Unit,
) {
    private val appContext = context.applicationContext
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    private var lastQueryAt = 0L
    private var foregroundPackage: String? = null
    private var emittedGameId: String? = null
    private var candidateGameId: String? = null
    private var pendingEmission: Runnable? = null
    private val processedEventKeys = LinkedHashSet<String>()
    @Volatile private var running = false

    fun start() {
        if (running) return
        if (!NativePermissionManager.hasUsageAccess(appContext)) {
            onStateChanged(null, "permission-required")
            return
        }
        running = true
        val worker = HandlerThread("FRONTIER-ForegroundMonitor")
        worker.start()
        thread = worker
        handler = Handler(worker.looper)
        lastQueryAt = System.currentTimeMillis() - INITIAL_LOOKBACK_MS
        onStateChanged(null, "running")
        handler?.post(::poll)
    }

    fun stop() {
        running = false
        handler?.removeCallbacksAndMessages(null)
        pendingEmission = null
        thread?.quitSafely()
        thread = null
        handler = null
        candidateGameId = null
        emittedGameId = null
        foregroundPackage = null
    }

    private fun poll() {
        if (!running) return
        if (!NativePermissionManager.hasUsageAccess(appContext)) {
            onStateChanged(null, "permission-required")
            stop()
            return
        }

        val now = System.currentTimeMillis()
        val from = (lastQueryAt - OVERLAP_MS).coerceAtLeast(now - MAX_QUERY_WINDOW_MS)
        try {
            val manager = appContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val events = manager.queryEvents(from, now)
            val event = android.app.usage.UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val mapped = mapEvent(event) ?: continue
                val key = "${mapped.timestamp}:${mapped.packageName}:${mapped.foreground}"
                if (processedEventKeys.add(key)) {
                    foregroundPackage = NativeGameCatalog.reduceForegroundPackage(foregroundPackage, mapped)
                }
            }
            trimEventKeys(now - EVENT_KEY_RETENTION_MS)
            lastQueryAt = now
            publishCandidate()
        } catch (_: RuntimeException) {
            onStateChanged(null, "unavailable")
        }

        handler?.postDelayed(::poll, POLL_INTERVAL_MS)
    }

    private fun mapEvent(event: android.app.usage.UsageEvents.Event): NativeUsageEvent? {
        val foreground = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            when (event.eventType) {
                android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED -> true
                android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
                android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED -> false
                else -> null
            }
        } else {
            @Suppress("DEPRECATION")
            when (event.eventType) {
                android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND -> true
                android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND -> false
                else -> null
            }
        } ?: return null

        return NativeUsageEvent(
            packageName = event.packageName.orEmpty(),
            timestamp = event.timeStamp,
            foreground = foreground,
        )
    }

    private fun publishCandidate() {
        val game = NativeGameCatalog.forPackage(foregroundPackage)
            ?.takeIf { GameSelectionStore.isSelected(appContext, it.id) }
        val nextId = game?.id
        if (nextId == candidateGameId || nextId == emittedGameId) return

        candidateGameId = nextId
        pendingEmission?.let { handler?.removeCallbacks(it) }
        val expectedId = nextId
        val emission = Runnable {
            if (!running || candidateGameId != expectedId) return@Runnable
            emittedGameId = expectedId
            val stableGame = expectedId?.let { NativeGameCatalog.forId(it) }
            onStateChanged(stableGame, if (stableGame == null) "idle" else "game-active")
        }
        pendingEmission = emission
        handler?.postDelayed(emission, DEBOUNCE_MS)
    }

    private fun trimEventKeys(cutoff: Long) {
        val iterator = processedEventKeys.iterator()
        while (iterator.hasNext()) {
            val timestamp = iterator.next().substringBefore(':').toLongOrNull() ?: 0L
            if (timestamp < cutoff) iterator.remove()
        }
    }

    companion object {
        private const val INITIAL_LOOKBACK_MS = 25_000L
        private const val OVERLAP_MS = 1_200L
        private const val MAX_QUERY_WINDOW_MS = 45_000L
        private const val EVENT_KEY_RETENTION_MS = 10_000L
        private const val POLL_INTERVAL_MS = 1_250L
        private const val DEBOUNCE_MS = 650L
    }
}
