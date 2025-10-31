package com.push.notificationsdk

import com.push.notificationsdk.network.DeviceTokenRegistrar
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class DeviceTokenRegistrarTest {
    @Test
    fun `registration without configure throws`() {
        val registrar = DeviceTokenRegistrar()
        assertThrows(IllegalStateException::class.java) {
            runBlocking {
                registrar.registerToken("abc")
            }
        }
    }

    @Test
    fun `successful registration performs network call`() {
        val captured = mutableListOf<Request>()
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request()
                captured += request
                Response.Builder()
                    .request(request)
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body("{}".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()

        val registrar = DeviceTokenRegistrar(client)
        registrar.configure(apiKey = "key", backendUrl = "https://example.com")

        runBlocking {
            registrar.registerToken("token")
        }

        val request = captured.single()
        assertEquals("https://example.com/api/v1/tokens", request.url.toString())
        assertEquals("key", request.header("x-api-key"))

        val bodyJson = request.body?.let { body ->
            val buffer = Buffer()
            body.writeTo(buffer)
            buffer.readUtf8()
        } ?: error("Request body missing")

        val body = JSONObject(bodyJson)
        assertEquals("token", body.getString("token"))
        assertEquals("ANDROID", body.getString("platform"))
    }
}
