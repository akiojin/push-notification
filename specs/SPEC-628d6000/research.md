# Phase 0: 技術リサーチ - Android Push通知SDK

**機能ID**: SPEC-628d6000
**日付**: 2025-10-30

## 概要

Android Native Push通知SDKの技術実現可能性を調査し、最適なライブラリと実装アプローチを決定する。

## 1. Firebase Cloud Messaging（FCM）統合

### 1.1 FCM SDK選定

**決定**: Firebase Cloud Messaging SDK v23.0+を使用

**理由**:
- Google公式SDK、Android Push通知の業界標準
- HTTP/2対応で高速・低レイテンシ
- 自動トークン更新・再接続機能内蔵
- Kotlin Coroutines対応

**統合アプローチ**:
```kotlin
class FCMService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // トークン取得・更新時に自動呼び出し
        TokenManager.registerToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // 通知受信時に呼び出し
        val data = remoteMessage.data
        NotificationHandler.show(data)
    }
}
```

**設定要件**:
- `google-services.json`ファイル配置（Firebaseプロジェクト設定）
- AndroidManifest.xmlにService登録

### 1.2 トークン管理戦略

**トークン取得**:
```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // REST APIに登録
    }
}
```

**トークン永続化**:
- SharedPreferencesに保存（暗号化なし、FCMトークンは公開情報）
- キー: `fcm_device_token`
- トークン更新検知: `onNewToken()`コールバック

**トークン無効化**:
- アプリアンインストール: FCMが自動検知、配信失敗を返す
- 手動削除: `FirebaseMessaging.getInstance().deleteToken()`

## 2. REST API通信

### 2.1 HTTPクライアント選定

**決定**: Retrofit 2.9+ + OkHttp 4.12+

**理由**:
- 宣言的APIクライアント定義（インターフェース＋アノテーション）
- Kotlin Coroutines統合（suspend関数）
- Interceptorでヘッダー（X-API-Key）自動追加
- JSON自動シリアライゼーション（Gson/Moshi）
- エラーハンドリング・リトライ機能

**実装例**:
```kotlin
interface TokenService {
    @POST("/api/tokens")
    suspend fun registerToken(
        @Header("X-API-Key") apiKey: String,
        @Body token: DeviceToken
    ): Response<Unit>

    @PUT("/api/tokens/{token}")
    suspend fun updateToken(
        @Path("token") token: String,
        @Header("X-API-Key") apiKey: String,
        @Body update: TokenUpdate
    ): Response<Unit>

    @DELETE("/api/tokens/{token}")
    suspend fun deleteToken(
        @Path("token") token: String,
        @Header("X-API-Key") apiKey: String
    ): Response<Unit>
}
```

### 2.2 リトライロジック

**Exponential Backoffアルゴリズム**:
```kotlin
class RetryInterceptor : Interceptor {
    override fun intercept(chain: Chain): Response {
        var request = chain.request()
        var response = chain.proceed(request)
        var tryCount = 0

        while (!response.isSuccessful && tryCount < 3) {
            tryCount++
            val delay = (2.0.pow(tryCount) * 1000).toLong() // 2秒, 4秒, 8秒
            Thread.sleep(delay)
            response = chain.proceed(request)
        }

        return response
    }
}
```

**対象エラー**:
- 5xx Server Error（サーバー側障害）
- ネットワークタイムアウト
- DNS解決失敗

**リトライしないエラー**:
- 4xx Client Error（APIキー不正など）
- 認証エラー（401 Unauthorized）

## 3. 画像読み込み（リッチ通知）

### 3.1 画像ライブラリ選定

**決定**: Coil 2.5+

**理由**:
- Kotlin First設計、Coroutines対応
- 軽量（Glideより小さい）
- Bitmap変換API提供
- キャッシュ管理内蔵（メモリ＋ディスク）
- NotificationCompat.BigPictureStyle統合が簡単

**実装例**:
```kotlin
val imageLoader = ImageLoader(context)
val request = ImageRequest.Builder(context)
    .data(imageUrl)
    .target { drawable ->
        val bitmap = (drawable as BitmapDrawable).bitmap
        val notification = NotificationCompat.Builder(context, channelId)
            .setStyle(NotificationCompat.BigPictureStyle()
                .bigPicture(bitmap))
            .build()
        notificationManager.notify(notificationId, notification)
    }
    .build()
imageLoader.enqueue(request)
```

### 3.2 画像キャッシュ戦略

**メモリキャッシュ**:
- LRU（Least Recently Used）キャッシュ
- 最大サイズ: 端末メモリの10%

**ディスクキャッシュ**:
- 最大サイズ: 100MB
- 有効期限: 7日間

**画像サイズ制限**:
- 最大ファイルサイズ: 1MB
- 推奨解像度: 512x256px
- タイムアウト: 10秒

## 4. 通知チャンネル管理（Android 8.0+）

### 4.1 NotificationChannel API

**デフォルトチャンネル作成**:
```kotlin
val channelId = "default_channel"
val channelName = "Default Notifications"
val importance = NotificationManager.IMPORTANCE_DEFAULT

val channel = NotificationChannel(channelId, channelName, importance).apply {
    description = "General push notifications"
    enableLights(true)
    lightColor = Color.BLUE
    enableVibration(true)
    vibrationPattern = longArrayOf(0, 500, 200, 500)
}

notificationManager.createNotificationChannel(channel)
```

### 4.2 通知重要度レベル

| 重要度 | 説明 | サウンド | バイブ | ヘッドアップ表示 |
|--------|------|----------|--------|------------------|
| IMPORTANCE_HIGH | 緊急 | ○ | ○ | ○ |
| IMPORTANCE_DEFAULT | 標準 | ○ | ○ | × |
| IMPORTANCE_LOW | 低 | × | × | × |
| IMPORTANCE_MIN | 最小 | × | × | × |

**推奨設定**: IMPORTANCE_DEFAULT（標準通知）

## 5. ProGuard/R8難読化対応

### 5.1 Keep Rules設定

**必須Keepルール**（`proguard-rules.pro`）:
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

# Gson/Moshi (JSON)
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
```

### 5.2 R8最適化設定

**build.gradle.kts**:
```kotlin
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

## 6. Unity/Unreal Engine JNIブリッジ

### 6.1 JNI Wrapper実装

**Kotlin側実装**:
```kotlin
object PushNotificationJNI {
    @JvmStatic
    fun initialize(context: Context, apiKey: String, apiEndpoint: String) {
        val config = SDKConfig(apiKey, apiEndpoint)
        PushNotificationSDK.initialize(context, config)
    }

    @JvmStatic
    fun setNotificationCallback(callback: (String) -> Unit) {
        PushNotificationSDK.setNotificationHandler(object : NotificationHandler {
            override fun onNotificationReceived(data: NotificationData) {
                callback(data.toJson())
            }
        })
    }
}
```

### 6.2 Unity統合

**Unity C#コード**:
```csharp
AndroidJavaClass javaClass = new AndroidJavaClass("com.example.pushnotification.PushNotificationJNI");
AndroidJavaObject currentActivity = new AndroidJavaClass("com.unity3d.player.UnityPlayer")
    .GetStatic<AndroidJavaObject>("currentActivity");

javaClass.CallStatic("initialize", currentActivity, "api-key", "https://api.example.com");
```

### 6.3 Unreal Engine統合

**Unreal C++コード**:
```cpp
#if PLATFORM_ANDROID
#include "Android/AndroidJNI.h"
#include "Android/AndroidApplication.h"

void InitializePushNotification() {
    JNIEnv* Env = FAndroidApplication::GetJavaEnv();
    jclass Class = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
    jmethodID Method = Env->GetStaticMethodID(Class, "initialize", "(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V");

    jobject Activity = FAndroidApplication::GetGameActivityThis();
    jstring ApiKey = Env->NewStringUTF("api-key");
    jstring ApiEndpoint = Env->NewStringUTF("https://api.example.com");

    Env->CallStaticVoidMethod(Class, Method, Activity, ApiKey, ApiEndpoint);
}
#endif
```

### 6.4 .aar形式パッケージング

**build.gradle.kts**:
```kotlin
android {
    libraryVariants.all {
        val variant = this
        val taskName = "assemble${variant.name.capitalize()}Aar"

        tasks.register(taskName) {
            dependsOn(variant.assemble)
            doLast {
                copy {
                    from(variant.outputs.first().outputFile)
                    into("$buildDir/outputs/unity")
                    rename { "PushNotificationSDK.aar" }
                }
            }
        }
    }
}
```

## 7. テスト戦略

### 7.1 Unit Testing

**ツール**: JUnit 5 + Mockito + Robolectric 4.11+

**対象**:
- TokenManager（トークン永続化・取得）
- NotificationBuilder（通知作成ロジック）
- ChannelManager（チャンネル管理）
- ApiClient（Retrofit Mock）

### 7.2 Integration Testing

**Firebase Emulator使用**:
```bash
firebase emulators:start --only auth,firestore
```

**テスト対象**:
- FCMトークン取得・更新
- 通知受信・表示
- REST API通信（Mock Server: WireMock）
- 画像読み込み（Coil + OkHttp MockWebServer）

### 7.3 E2E Testing

**サンプルアプリ**:
- 実デバイス/エミュレータでの動作確認
- Firebase Test Lab使用（複数デバイス自動テスト）
- Android 7.0〜14互換性テスト

## 8. パフォーマンス目標

### 8.1 初期化時間

**目標**: 5秒以内

**最適化**:
- FCMトークン取得を非同期化（Coroutines）
- SharedPreferences読み込みをバックグラウンドスレッド化
- 不要な初期化処理の遅延実行

### 8.2 メモリ使用量

**目標**: 10MB以下

**最適化**:
- 画像キャッシュサイズ制限
- 不要なBitmapの即時recycle()
- WeakReferenceでContextを保持

### 8.3 API呼び出し時間

**目標**: 3秒以内

**最適化**:
- OkHttp接続プーリング
- HTTP/2多重化
- gzip圧縮

## 決定事項まとめ

| 項目 | 選定技術 | バージョン | 理由 |
|------|----------|------------|------|
| FCM | Firebase Cloud Messaging SDK | v23.0+ | 公式SDK、HTTP/2対応 |
| HTTPクライアント | Retrofit + OkHttp | 2.9+ / 4.12+ | Coroutines統合、Interceptor |
| 画像読み込み | Coil | 2.5+ | 軽量、Kotlin First |
| JSON | Gson | 2.10+ | Retrofit標準、シンプル |
| テスト | JUnit 5 + Mockito + Robolectric | 5.10+ / 5.7+ / 4.11+ | Android標準 |
| ビルド | Gradle + Kotlin DSL | 8.0+ | Kotlin統合 |

## 要明確化の解決

すべての技術的不明点は業界標準アプローチで解決可能。追加の明確化不要。

## 次のステップ

Phase 1に進む:
1. data-model.md作成（SDK内部データモデル）
2. contracts/public-api.kt作成（Kotlin APIシグネチャ）
3. contracts/rest-api.yaml作成（REST API仕様）
4. quickstart.md作成（開発者向けガイド）
