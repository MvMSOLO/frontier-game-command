plugins { id("com.android.application") }

android {
    namespace = "com.mvmsolo.frontier"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.mvmsolo.frontier"
        minSdk = 26
        targetSdk = 36
        versionCode = 6
        versionName = "0.6.0"
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isIncludeAndroidResources = false }
}

dependencies { testImplementation("junit:junit:4.13.2") }

val androidWebBundle = rootProject.projectDir.parentFile.resolve("dist-android")
val syncAndroidWebBundle by tasks.registering(Sync::class) {
    from(androidWebBundle)
    into(layout.projectDirectory.dir("src/main/assets/web"))
    doFirst {
        require(androidWebBundle.resolve("index.android.html").isFile) {
            "Missing Android web entry. Run bun run build:android before Gradle."
        }
        require(androidWebBundle.resolve("index.overlay.html").isFile) {
            "Missing overlay web entry. Run bun run build:android before Gradle."
        }
    }
}
tasks.named("preBuild").configure { dependsOn(syncAndroidWebBundle) }
