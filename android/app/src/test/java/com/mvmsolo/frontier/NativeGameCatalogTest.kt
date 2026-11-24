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
    fun `every entry has a display name and at least one package alias`() {
        NativeGameCatalog.games.forEach { game ->
            assertNotNull(game.name)
            assertEquals(true, game.packageNames.isNotEmpty())
        }
    }
}
