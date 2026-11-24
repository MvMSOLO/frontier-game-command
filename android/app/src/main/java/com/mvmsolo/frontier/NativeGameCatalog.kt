package com.mvmsolo.frontier

data class NativeGame(
    val id: String,
    val name: String,
    val packageNames: List<String>,
)

data class NativeUsageEvent(
    val packageName: String,
    val timestamp: Long,
    val foreground: Boolean,
)

object NativeGameCatalog {
    val games: List<NativeGame> = listOf(
        NativeGame("pubg-mobile", "PUBG MOBILE", listOf("com.tencent.ig", "com.pubg.imobile")),
        NativeGame("call-of-duty-mobile", "Call of Duty: Mobile", listOf("com.activision.callofduty.shooter", "com.garena.game.codm")),
        NativeGame("free-fire", "Free Fire", listOf("com.dts.freefireth", "com.dts.freefiremax", "com.dts.freefire")),
        NativeGame("fortnite", "Fortnite", listOf("com.epicgames.fortnite")),
        NativeGame("mobile-legends", "Mobile Legends: Bang Bang", listOf("com.mobile.legends")),
        NativeGame("wild-rift", "League of Legends: Wild Rift", listOf("com.riotgames.league.wildrift")),
        NativeGame("brawl-stars", "Brawl Stars", listOf("com.supercell.brawlstars")),
        NativeGame("efootball", "eFootball", listOf("com.konami.pesam", "jp.konami.pesam")),
        NativeGame("roblox", "Roblox", listOf("com.roblox.client")),
        NativeGame("genshin-impact", "Genshin Impact", listOf("com.miHoYo.GenshinImpact")),
        NativeGame("asphalt-legends", "Asphalt Legends", listOf("com.gameloft.android.ANMP.GloftA9HM")),
        NativeGame("clash-royale", "Clash Royale", listOf("com.supercell.clashroyale")),
    )

    private val byPackage: Map<String, NativeGame> = games
        .flatMap { game -> game.packageNames.map { packageName -> packageName to game } }
        .toMap()

    fun forPackage(packageName: String?): NativeGame? =
        if (packageName == null) null else byPackage[packageName]

    fun reduceForegroundPackage(currentPackage: String?, events: List<NativeUsageEvent>): String? {
        var activePackage = currentPackage
        events.sortedBy { it.timestamp }.forEach { event ->
            if (event.foreground) activePackage = event.packageName
            else if (activePackage == event.packageName) activePackage = null
        }
        return activePackage
    }

    fun resolveForegroundGame(events: List<NativeUsageEvent>): NativeGame? {
        val latest = events.maxByOrNull { it.timestamp } ?: return null
        if (!latest.foreground) return null
        return forPackage(latest.packageName)
    }
}
