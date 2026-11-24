package com.mvmsolo.frontier

import kotlin.math.min

object OverlayWindowSizing {
    fun expandedWidth(displayWidthPx: Int, density: Float): Int {
        val displayWidth = displayWidthPx.coerceAtLeast(1)
        val dp = { value: Int -> (value * density).toInt() }
        val available = (displayWidth - dp(16)).coerceAtLeast(1)
        return min(min(dp(390), (displayWidth * 0.78f).toInt()), available)
            .coerceAtMost(displayWidth)
            .coerceAtLeast(1)
    }

    fun expandedHeight(displayHeightPx: Int, density: Float): Int {
        val displayHeight = displayHeightPx.coerceAtLeast(1)
        val dp = { value: Int -> (value * density).toInt() }
        return min((displayHeight * 0.9f).toInt(), displayHeight - dp(16))
            .coerceAtMost(displayHeight)
            .coerceAtLeast(1)
    }

    fun collapsedWidth(displayWidthPx: Int, density: Float): Int =
        ((38 * density).toInt()).coerceAtLeast(1).coerceAtMost(displayWidthPx.coerceAtLeast(1))

    fun collapsedHeight(displayHeightPx: Int, density: Float): Int =
        ((132 * density).toInt()).coerceAtLeast(1).coerceAtMost(displayHeightPx.coerceAtLeast(1))
}
