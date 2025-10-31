package com.push.notificationsdk

import android.app.Application
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.push.notificationsdk.network.DeviceTokenRegistrar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object PushNotificationSdk {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val registrar = DeviceTokenRegistrar()
    private var configuration: Configuration? = null

    data class Configuration(
        val application: Application,
        val apiKey: String,
        val backendUrl: String
    )

    fun initialize(configuration: Configuration) {
        this.configuration = configuration
        registrar.configure(apiKey = configuration.apiKey, backendUrl = configuration.backendUrl)
        requestToken()
    }

    fun requestToken() {
        val config = configuration ?: run {
            Log.w("PushNotificationSdk", "SDK not configured")
            return
        }
        scope.launch {
            runCatching {
                FirebaseMessaging.getInstance().token
            }.onSuccess { task ->
                task.addOnCompleteListener { result ->
                    if (!result.isSuccessful) {
                        Log.e("PushNotificationSdk", "Token fetch failed", result.exception)
                        return@addOnCompleteListener
                    }
                    val token = result.result
                    scope.launch {
                        registrar.registerToken(token)
                    }
                }
            }.onFailure {
                Log.e("PushNotificationSdk", "Token fetch invocation failed", it)
            }
        }
    }
}
