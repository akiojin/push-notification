package com.push.notificationsdk

import com.push.notificationsdk.network.DeviceTokenRegistrar
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import okio.Timeout
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
        val factory = CapturingCallFactory()
        val registrar = DeviceTokenRegistrar(factory)
        registrar.configure(apiKey = "key", backendUrl = "https://example.com")

        runBlocking {
            registrar.registerToken("token")
        }

        val request = factory.requests.firstOrNull() ?: error("Request not captured")
        assertEquals("https://example.com/api/v1/tokens", request.url.toString())
        assertEquals("key", request.header("x-api-key"))

        assert(factory.bodies.isNotEmpty())
    }
}

private class CapturingCallFactory : Call.Factory {
    val requests = mutableListOf<Request>()
    val bodies = mutableListOf<String>()

    override fun newCall(request: Request): Call {
        val buffer = Buffer()
        request.body?.writeTo(buffer)
        bodies += buffer.readUtf8()
        requests += request
        return createCall(request)
    }

    private fun createCall(request: Request): Call = object : Call {
            override fun request(): Request = request

            override fun execute(): Response = Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body("{}".toResponseBody("application/json".toMediaType()))
                .build()

            override fun enqueue(responseCallback: Callback) {
                throw UnsupportedOperationException("enqueue not supported in tests")
            }

            override fun cancel() {}

            override fun isExecuted(): Boolean = true

            override fun isCanceled(): Boolean = false

            override fun timeout(): Timeout = Timeout.NONE

            override fun clone(): Call = createCall(request)
        }
}
