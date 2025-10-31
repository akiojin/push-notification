package com.push.notificationsdk.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class DeviceTokenRegistrar(
    private val client: OkHttpClient = OkHttpClient()
) {
    private var apiKey: String? = null
    private var backendUrl: String? = null

    fun configure(apiKey: String, backendUrl: String) {
        this.apiKey = apiKey
        this.backendUrl = backendUrl.trimEnd('/')
    }

    suspend fun registerToken(token: String) {
        val apiKey = apiKey ?: throw IllegalStateException("Registrar not configured")
        val backendUrl = backendUrl ?: throw IllegalStateException("Registrar not configured")

        val payload = JSONObject().apply {
            put("token", token)
            put("platform", "ANDROID")
        }

        val request = Request.Builder()
            .url("$backendUrl/api/v1/tokens")
            .post(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
            .addHeader("x-api-key", apiKey)
            .addHeader("Content-Type", "application/json")
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IllegalStateException("Failed to register token: ${response.code}")
            }
        }
    }

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}
