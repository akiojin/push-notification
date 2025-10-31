package com.push.notificationsdk.messaging

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.push.notificationsdk.PushNotificationSdk

class InternalMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Refreshed token: $token")
        PushNotificationSdk.requestToken()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received: ${remoteMessage.messageId}")
        NotificationDispatcher.dispatch(applicationContext, remoteMessage)
    }

    companion object {
        private const val TAG = "InternalMessagingSvc"

        fun ensureTokenSync() {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                Log.d(TAG, "Token ensure: $token")
                PushNotificationSdk.requestToken()
            }
        }
    }
}
