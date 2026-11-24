package com.mvmsolo.frontier

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream

class LocalAssetWebViewClient(private val onPageFinished: (() -> Unit)? = null) : WebViewClient() {
    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onPageFinished?.invoke()
    }

    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest): WebResourceResponse? {
        val uri = request.url
        if (uri.scheme != "https" || uri.host != LOCAL_HOST) return forbidden()
        val path = uri.path.orEmpty().removePrefix("/")
        if (!path.startsWith("web/") || path.split('/').any { it == ".." }) return forbidden()
        return try {
            val stream = view?.context?.assets?.open(path) ?: throw java.io.FileNotFoundException(path)
            WebResourceResponse(mimeType(path), "UTF-8", 200, "OK", mapOf(
                "Cache-Control" to "no-store",
                "Access-Control-Allow-Origin" to "https://$LOCAL_HOST",
                "X-Content-Type-Options" to "nosniff",
            ), stream)
        } catch (_: Exception) {
            WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", emptyMap(),
                ByteArrayInputStream("Local FRONTIER asset not found".toByteArray()))
        }
    }

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean =
        request.url.host != LOCAL_HOST

    private fun mimeType(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "webp" -> "image/webp"
        "jpg", "jpeg" -> "image/jpeg"
        "ico" -> "image/x-icon"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        "ttf" -> "font/ttf"
        "json" -> "application/json"
        else -> "application/octet-stream"
    }

    private fun forbidden() = WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(),
        ByteArrayInputStream("External resources are blocked".toByteArray()))

    companion object {
        private const val LOCAL_HOST = "appassets.frontier"
        const val APP_URL = "https://appassets.frontier/web/index.android.html"
        const val OVERLAY_URL = "https://appassets.frontier/web/index.overlay.html"
    }
}
