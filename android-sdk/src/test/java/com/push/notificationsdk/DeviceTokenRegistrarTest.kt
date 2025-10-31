package com.push.notificationsdk

import com.push.notificationsdk.network.DeviceTokenRegistrar
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody
import kotlinx.coroutines.runBlocking
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
        val call = mockk<Call>()
        val client = mockk<OkHttpClient>()
        val registrar = DeviceTokenRegistrar(client)
        registrar.configure(apiKey = "key", backendUrl = "https://example.com")

        val response = mockk<Response>()
        every { response.isSuccessful } returns true
        every { response.close() } returns Unit
        every { call.execute() } returns response
        every { client.newCall(any<Request>()) } returns call

        runBlocking {
            registrar.registerToken("token")
        }

        verify { client.newCall(any<Request>()) }
        verify { call.execute() }
    }
}
