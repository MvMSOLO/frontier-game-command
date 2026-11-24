package com.mvmsolo.frontier

data class NativeGame(
    val id: String,
    val name: String,
    val packageNames: List<String>,
)

object NativeGameCatalog {
    val games: List<NativeGame> = listOf(
        NativeGame("pubg-mobile", "PUBG MOBILE", listOf("com.tencent.ig")),
        NativeGame("call-of-duty-mobile", "Call of Duty: Mobile", listOf("com.activision.callofduty.shooter")),
        NativeGame("free-fire", "Free Fire", listOf("com.dts.freefireth", "com.dts.freefiremax")),
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
}
