package com.mvmsolo.frontier

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class NativeGameCatalogTest {
    @Test
    fun `catalog has twelve unique frontend ids`() {
        val ids = NativeGameCatalog.games.map { it.id }
        assertEquals(12, ids.size)
        assertEquals(ids.size, ids.toSet().size)
    }

    @Test
    fun `known package aliases resolve to their canonical game`() {
        assertEquals("efootball", NativeGameCatalog.forPackage("jp.konami.pesam")?.id)
        assertEquals("free-fire", NativeGameCatalog.forPackage("com.dts.freefiremax")?.id)
        assertNull(NativeGameCatalog.forPackage("com.example.unknown"))
    }

    @Test
    fun `latest foreground event resolves the currently active supported game`() {
        val events = listOf(
            NativeUsageEvent("com.activision.callofduty.shooter", 10L, true),
            NativeUsageEvent("com.activision.callofduty.shooter", 20L, false),
            NativeUsageEvent("jp.konami.pesam", 30L, true),
        )
        assertEquals("efootball", NativeGameCatalog.resolveForegroundGame(events)?.id)
    }

    @Test
    fun `latest background event and unknown foreground app resolve to no supported game`() {
        val backgroundEvents = listOf(
            NativeUsageEvent("com.konami.pesam", 10L, true),
            NativeUsageEvent("com.konami.pesam", 20L, false),
        )
        val unknownEvents = listOf(
            NativeUsageEvent("com.konami.pesam", 10L, true),
            NativeUsageEvent("com.example.launcher", 20L, true),
        )
        assertNull(NativeGameCatalog.resolveForegroundGame(backgroundEvents))
        assertNull(NativeGameCatalog.resolveForegroundGame(unknownEvents))
    }

    @Test
    fun `foreground reducer clears only the matching background package`() {
        val current = "com.konami.pesam"
        assertEquals(
            current,
            NativeGameCatalog.reduceForegroundPackage(
                current,
                NativeUsageEvent("com.example.other", 20L, false),
            ),
        )
        assertEquals(
            null,
            NativeGameCatalog.reduceForegroundPackage(
                current,
                NativeUsageEvent("com.konami.pesam", 30L, false),
            ),
        )
        assertEquals(
            "com.example.next",
            NativeGameCatalog.reduceForegroundPackage(
                current,
                NativeUsageEvent("com.example.next", 40L, true),
            ),
        )
    }

    @Test
    fun `selected game codec rejects malformed JSON and ignores unknown ids`() {
        assertEquals(setOf("efootball", "pubg-mobile"), GameSelectionCodec.parseSelectedIds("[\"efootball\",\"unknown\",\"pubg-mobile\"]"))
        assertEquals(emptySet<String>(), GameSelectionCodec.parseSelectedIds("{broken"))
    }

    @Test
    fun `every entry has a display name and at least one package alias`() {
        NativeGameCatalog.games.forEach { game ->
            assertNotNull(game.name)
            assertEquals(true, game.packageNames.isNotEmpty())
        }
    }
}
