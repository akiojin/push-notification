package com.push.notificationsdk.messaging

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.RemoteMessage

object NotificationDispatcher {
    private const val CHANNEL_ID = "push_notification_sdk_default"

    fun dispatch(context: Context, message: RemoteMessage) {
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(message.notification?.title ?: "Push Notification")
            .setContentText(message.notification?.body ?: "")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()

        NotificationManagerCompat.from(context).notify(message.hashCode(), notification)
        Log.d("NotificationDispatcher", "Notification displayed")
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelExists = manager.notificationChannels.any { it.id == CHANNEL_ID }
            if (!channelExists) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Push Notifications",
                    NotificationManager.IMPORTANCE_DEFAULT
                )
                manager.createNotificationChannel(channel)
            }
        }
    }
}
