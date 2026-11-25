package com.mvmsolo.frontier

import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.HandlerThread

class NativeGameMonitor(context: Context, private val onGameChanged: (NativeGame?) -> Unit) {
    private val appContext = context.applicationContext
    private val thread = HandlerThread("frontier-game-monitor")
    private var handler: Handler? = null
    private var lastEventTime = System.currentTimeMillis()
    private var foregroundPackage: String? = null
    private var hadUsageAccess = false
    @Volatile private var running = false

    fun start(): NativeGameMonitor {
        if (running) return this
        running = true
        thread.start()
        handler = Handler(thread.looper).also { it.post(::poll) }
        return this
    }

    fun stop() {
        running = false
        currentGame = null
        handler?.removeCallbacksAndMessages(null)
        handler = null
        if (thread.isAlive) thread.quitSafely()
    }

    private fun poll() {
        if (!running) return
        val now = System.currentTimeMillis()
        if (!NativePermissionManager.hasUsageAccess(appContext)) {
            hadUsageAccess = false
            foregroundPackage = null
            lastEventTime = now
            publish(null)
            scheduleNext()
            return
        }

        // Re-bootstrap once after permission is granted/re-granted so an already-open game is found.
        if (!hadUsageAccess) {
            hadUsageAccess = true
            foregroundPackage = null
            lastEventTime = now - INITIAL_LOOKBACK_MS
        }

        val manager = appContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        try {
            val events = manager.queryEvents(lastEventTime, now)
            if (events != null) {
                val event = android.app.usage.UsageEvents.Event()
                val batch = mutableListOf<NativeUsageEvent>()
                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    val packageName = event.packageName ?: continue
                    val foreground = foregroundState(event.eventType) ?: continue
                    batch += NativeUsageEvent(packageName, event.timeStamp, foreground)
                }
                foregroundPackage = NativeGameCatalog.reduceForegroundPackage(foregroundPackage, batch)
                lastEventTime = now
                publish(NativeGameCatalog.forPackage(foregroundPackage))
            }
        } catch (_: RuntimeException) {
            // Keep the last verified game during transient UsageStats failures.
        }
        scheduleNext()
    }

    @Suppress("DEPRECATION")
    private fun foregroundState(eventType: Int): Boolean? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        when (eventType) {
            android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED -> true
            android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
            android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED -> false
            else -> null
        }
    } else {
        when (eventType) {
            android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND -> true
            android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND -> false
            else -> null
        }
    }

    private fun publish(game: NativeGame?) {
        currentGame = game
        onGameChanged(game)
    }

    private fun scheduleNext() { if (running) handler?.postDelayed(::poll, POLL_INTERVAL_MS) }

    companion object {
        private const val INITIAL_LOOKBACK_MS = 24 * 60 * 60 * 1000L
        private const val POLL_INTERVAL_MS = 1_500L
        @Volatile var currentGame: NativeGame? = null
            private set
    }
}
