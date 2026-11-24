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

object NativeForegroundState {
    @Volatile
    var current: NativeGame? = null
}

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
    private val byId = games.associateBy { it.id }

    fun forPackage(packageName: String?): NativeGame? =
        if (packageName == null) null else byPackage[packageName]

    fun forId(id: String?): NativeGame? = if (id == null) null else byId[id]

    fun packageNames(): List<String> = games.flatMap { it.packageNames }

    fun reduceForegroundPackage(currentPackage: String?, event: NativeUsageEvent): String? =
        if (event.foreground) event.packageName
        else if (currentPackage == event.packageName) null
        else currentPackage

    fun resolveForegroundGame(events: List<NativeUsageEvent>): NativeGame? {
        val packageName = events
            .sortedBy { it.timestamp }
            .fold<String?, NativeUsageEvent?>(null) { current, event ->
                val currentPackage = current?.let { it.packageName }
                val nextPackage = reduceForegroundPackage(currentPackage, event)
                nextPackage?.let { NativeUsageEvent(it, event.timestamp, true) }
            }
            ?.packageName
        return forPackage(packageName)
    }
}
