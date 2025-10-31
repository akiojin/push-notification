# Quickstart: Android Push Notification SDK

**機能ID**: SPEC-628d6000
**日付**: 2025-10-30

## 概要

このガイドでは、Android Push Notification SDKをAndroidアプリに統合し、最初のPush通知を受信するまでの手順を説明します。

**所要時間**: 30分以内

## 前提条件

- Android Studio Arctic Fox以降
- Kotlin 1.9+
- Android API Level 24+（Android 7.0+）
- Firebaseプロジェクトが作成済み
- REST APIサーバーがデプロイ済み（SPEC-2d193ce6）

## ステップ1: Firebase設定

### 1.1 google-services.jsonを配置

Firebaseコンソールからダウンロードした`google-services.json`をアプリモジュールのルートに配置します。

```
app/
├── build.gradle.kts
├── google-services.json  ← ここに配置
└── src/
```

### 1.2 Gradleプラグイン追加

**プロジェクトレベル build.gradle.kts**:
```kotlin
buildscript {
    dependencies {
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

**アプリレベル build.gradle.kts**:
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")  // ← 追加
}
```

## ステップ2: SDK依存関係追加

**アプリレベル build.gradle.kts**:
```kotlin
dependencies {
    // Push Notification SDK
    implementation("com.example:push-notification-android-sdk:1.0.0")

    // Firebase Cloud Messaging
    implementation("com.google.firebase:firebase-messaging:23.3.1")

    // Kotlin Coroutines（オプション、SDKが内部使用）
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

Gradleを同期します:
```bash
./gradlew sync
```

## ステップ3: AndroidManifest.xml設定

**app/src/main/AndroidManifest.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.myapp">

    <!-- インターネット権限（必須） -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.MyApp">

        <!-- Firebase Messaging Service（必須） -->
        <service
            android:name="com.example.pushnotification.FCMService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- デフォルト通知アイコン -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />

        <!-- デフォルト通知カラー -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/notification_color" />

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

## ステップ4: SDK初期化

### 4.1 Applicationクラス作成

**MyApplication.kt**:
```kotlin
package com.example.myapp

import android.app.Application
import com.example.pushnotification.PushNotificationSDK
import com.example.pushnotification.config.SDKConfig

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // SDK設定
        val config = SDKConfig(
            apiKey = "your-api-key-here",
            apiEndpoint = "https://api.example.com",
            enableLogging = true  // デバッグ時はtrue
        )

        // SDK初期化（3行のコード）
        PushNotificationSDK.initialize(this, config)
    }
}
```

**AndroidManifest.xmlで指定**:
```xml
<application
    android:name=".MyApplication"
    ...>
```

### 4.2 通知ハンドラー設定（オプション）

**MainActivity.kt**:
```kotlin
package com.example.myapp

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.pushnotification.PushNotificationSDK
import com.example.pushnotification.NotificationHandler
import com.example.pushnotification.models.NotificationData
import android.util.Log

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 通知ハンドラー登録
        PushNotificationSDK.setNotificationHandler(object : NotificationHandler {
            override fun onNotificationReceived(data: NotificationData) {
                Log.d("Push", "Received: ${data.title}")
                // カスタム処理
            }

            override fun onNotificationOpened(data: NotificationData) {
                Log.d("Push", "Opened: ${data.title}")
                // 画面遷移処理
                val screenId = data.customData?.get("screenId")
                when (screenId) {
                    "event" -> navigateToEventScreen()
                    "friend" -> navigateToFriendScreen()
                }
            }
        })
    }

    private fun navigateToEventScreen() {
        // イベント画面に遷移
    }

    private fun navigateToFriendScreen() {
        // フレンド画面に遷移
    }
}
```

## ステップ5: 通知許可リクエスト（Android 13+）

**MainActivity.kt**:
```kotlin
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Android 13以降は通知許可が必要
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_CODE_POST_NOTIFICATIONS
                )
            }
        }
    }

    companion object {
        private const val REQUEST_CODE_POST_NOTIFICATIONS = 1001
    }
}
```

## ステップ6: ProGuard/R8設定（リリースビルド）

**app/proguard-rules.pro**:
```proguard
# Push Notification SDK
-keep class com.example.pushnotification.** { *; }
-keepclassmembers class com.example.pushnotification.** { *; }

# Firebase Cloud Messaging
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
```

## ステップ7: テスト通知送信

### 7.1 デバイストークン確認

ログで確認:
```bash
adb logcat | grep "PushNotificationSDK"
```

出力例:
```
PushNotificationSDK: Device token registered: fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6
```

### 7.2 REST APIから通知送信

**curlコマンド例**:
```bash
curl -X POST https://api.example.com/api/notifications \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テスト通知",
    "body": "これはテスト通知です",
    "tokens": ["fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6"]
  }'
```

### 7.3 Firebase Consoleから送信

Firebase Console > Cloud Messaging > 新しい通知
1. 通知テキスト入力
2. 対象デバイストークン指定
3. 送信

## ステップ8: 高度な機能

### 8.1 プレイヤーアカウントID紐付け

ユーザーログイン後:
```kotlin
// ユーザーログイン成功後
PushNotificationSDK.updatePlayerAccountId("player-12345")
```

### 8.2 カスタム通知チャンネル作成

```kotlin
import android.app.NotificationManager
import com.example.pushnotification.ChannelManager

ChannelManager.createChannel(
    id = "event_notifications",
    name = "イベント通知",
    importance = NotificationManager.IMPORTANCE_HIGH
)
```

### 8.3 リッチ通知送信

**REST API経由**:
```json
{
  "title": "イベント開始！",
  "body": "限定イベントが始まりました",
  "imageUrl": "https://example.com/images/event-banner.jpg",
  "customData": {
    "screenId": "event",
    "eventId": "123"
  },
  "actions": [
    {
      "id": "action_play",
      "label": "今すぐプレイ",
      "deepLink": "mygame://event/123"
    },
    {
      "id": "action_later",
      "label": "後で通知"
    }
  ],
  "tokens": ["fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6"]
}
```

## トラブルシューティング

### 問題1: トークンが取得できない

**症状**: ログに「Token fetch failed」エラー

**解決策**:
1. `google-services.json`が正しく配置されているか確認
2. Firebase Consoleでアプリが登録されているか確認
3. インターネット接続を確認

### 問題2: 通知が表示されない

**症状**: 通知受信はするが表示されない

**解決策**:
1. Android 13以降は通知許可が必要
2. 通知チャンネルが正しく作成されているか確認
3. アプリが通知をブロックしていないか設定確認

### 問題3: ProGuard/R8でクラッシュ

**症状**: リリースビルドでクラッシュ

**解決策**:
1. `proguard-rules.pro`にKeepルールが正しく設定されているか確認
2. Logcatでクラッシュログを確認
3. R8の`--stacktrace`オプションで詳細確認

## 次のステップ

1. **Unity統合**: Unity C#バインディング実装（別SPEC）
2. **Unreal Engine統合**: Unreal Engine C++ラッパー実装（別SPEC）
3. **本番環境デプロイ**: Firebase Production環境設定
4. **モニタリング**: Firebase Analytics統合

## サポート

- **ドキュメント**: [API仕様](./contracts/public-api.kt)
- **サンプルアプリ**: `android-sdk/samples/`
- **Issues**: GitHub Issues
