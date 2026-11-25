package com.mvmsolo.frontier

import org.junit.Assert.assertTrue
import org.junit.Test

class OverlayWindowSizingTest {
    @Test
    fun `expanded overlay preserves at least twenty two percent of a normal display`() {
        val width = OverlayWindowSizing.expandedWidth(393, 1f)
        assertTrue(width <= 393 * 0.78f)
        assertTrue(width < 393)
    }

    @Test
    fun `expanded overlay never exceeds compact display bounds`() {
        listOf(180, 220, 320, 393, 900).forEach { displayWidth ->
            val width = OverlayWindowSizing.expandedWidth(displayWidth, 1f)
            assertTrue("width $width exceeded display $displayWidth", width in 1..displayWidth)
        }
        listOf(180, 240, 360, 430, 1200).forEach { displayHeight ->
            val height = OverlayWindowSizing.expandedHeight(displayHeight, 1f)
            assertTrue("height $height exceeded display $displayHeight", height in 1..displayHeight)
        }
    }

    @Test
    fun `collapsed handle also stays within very small display bounds`() {
        assertTrue(OverlayWindowSizing.collapsedWidth(20, 1f) <= 20)
        assertTrue(OverlayWindowSizing.collapsedHeight(80, 1f) <= 80)
    }

    @Test
    fun `density aware sizing remains bounded on high density phones`() {
        val displayWidthPx = 1080
        val width = OverlayWindowSizing.expandedWidth(displayWidthPx, 3f)
        assertTrue(width <= displayWidthPx)
        assertTrue(width <= 390 * 3)
    }
    @Test
    fun `expanded overlay keeps enough gameplay visible on a 393dp phone`() {
        val width = OverlayWindowSizing.expandedWidth(393, 1f)
        assertTrue("overlay width $width must not exceed 72% of the display", width <= 393 * 0.72f)
    }

}
