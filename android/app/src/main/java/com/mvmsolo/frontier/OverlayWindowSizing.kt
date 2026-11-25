package com.mvmsolo.frontier

import kotlin.math.min

object OverlayWindowSizing {
    fun expandedWidth(displayWidthPx: Int, density: Float): Int {
        val displayWidth = displayWidthPx.coerceAtLeast(1)
        val safeDensity = density.coerceAtLeast(0.5f)
        val dp = { value: Int -> (value * safeDensity).toInt() }
        val available = (displayWidth - dp(16)).coerceAtLeast(1)
        val phoneShare = (displayWidth * 0.72f).toInt()
        return min(min(dp(340), phoneShare), available)
            .coerceAtMost(displayWidth)
            .coerceAtLeast(1)
    }

    fun expandedHeight(displayHeightPx: Int, density: Float): Int {
        val displayHeight = displayHeightPx.coerceAtLeast(1)
        val safeDensity = density.coerceAtLeast(0.5f)
        val dp = { value: Int -> (value * safeDensity).toInt() }
        return min((displayHeight * 0.9f).toInt(), displayHeight - dp(16))
            .coerceAtMost(displayHeight)
            .coerceAtLeast(1)
    }

    fun collapsedWidth(displayWidthPx: Int, density: Float): Int =
        ((38 * density.coerceAtLeast(0.5f)).toInt()).coerceAtLeast(1).coerceAtMost(displayWidthPx.coerceAtLeast(1))

    fun collapsedHeight(displayHeightPx: Int, density: Float): Int =
        ((132 * density.coerceAtLeast(0.5f)).toInt()).coerceAtLeast(1).coerceAtMost(displayHeightPx.coerceAtLeast(1))
}
