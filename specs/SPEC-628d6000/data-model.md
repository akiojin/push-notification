# Phase 1: データモデル - Android Push通知SDK

**機能ID**: SPEC-628d6000
**日付**: 2025-10-30

## 概要

Android Push通知SDKの内部データモデルを定義する。すべてのモデルはKotlin data classとして実装し、シンプルさを最優先する。

## 設計原則

1. **単一データモデル**: DTOなし、ドメインモデル=APIモデル
2. **イミュータブル**: data class + valで不変性を保証
3. **デフォルト値**: オプション項目はデフォルト値を提供
4. **JSON互換**: Gson/MoshiでシリアライゼーションSerializeNames対応

## 1. SDK設定モデル

### SDKConfig

**目的**: SDK初期化時の設定パラメータ

```kotlin
package com.example.pushnotification.config

data class SDKConfig(
    /**
     * REST API認証キー（X-API-Keyヘッダー値）
     */
    val apiKey: String,

    /**
     * REST APIエンドポイント（例: https://api.example.com）
     */
    val apiEndpoint: String,

    /**
     * デバッグログ出力を有効化
     */
    val enableLogging: Boolean = false,

    /**
     * プレイヤーアカウントID（オプション、後から設定可能）
     */
    val playerAccountId: String? = null,

    /**
     * API接続タイムアウト（秒）
     */
    val connectTimeoutSec: Int = 30,

    /**
     * API読み取りタイムアウト（秒）
     */
    val readTimeoutSec: Int = 30
) {
    init {
        require(apiKey.isNotBlank()) { "API Key must not be blank" }
        require(apiEndpoint.isNotBlank()) { "API Endpoint must not be blank" }
        require(connectTimeoutSec > 0) { "Connect timeout must be positive" }
        require(readTimeoutSec > 0) { "Read timeout must be positive" }
    }
}
```

**検証ルール**:
- apiKey: 空白不可
- apiEndpoint: 空白不可、URL形式（https://〜）
- タイムアウト: 正の整数

## 2. 通知データモデル

### NotificationData

**目的**: サーバーから受信した通知データ

```kotlin
package com.example.pushnotification.models

import com.google.gson.annotations.SerializedName

data class NotificationData(
    /**
     * 通知ID（サーバー側で生成）
     */
    @SerializedName("id")
    val id: String,

    /**
     * 通知タイトル（最大100文字）
     */
    @SerializedName("title")
    val title: String,

    /**
     * 通知本文（最大500文字）
     */
    @SerializedName("body")
    val body: String,

    /**
     * 画像URL（オプション）
     */
    @SerializedName("imageUrl")
    val imageUrl: String? = null,

    /**
     * カスタムデータ（ディープリンク、パラメータなど）
     */
    @SerializedName("customData")
    val customData: Map<String, String>? = null,

    /**
     * アクションボタン（最大3個）
     */
    @SerializedName("actions")
    val actions: List<NotificationAction>? = null,

    /**
     * 通知チャンネルID（Android 8.0+）
     */
    @SerializedName("channelId")
    val channelId: String = "default_channel",

    /**
     * 通知優先度（high, default, low）
     */
    @SerializedName("priority")
    val priority: NotificationPriority = NotificationPriority.DEFAULT
) {
    init {
        require(id.isNotBlank()) { "Notification ID must not be blank" }
        require(title.isNotBlank()) { "Title must not be blank" }
        require(title.length <= 100) { "Title must be 100 characters or less" }
        require(body.isNotBlank()) { "Body must not be blank" }
        require(body.length <= 500) { "Body must be 500 characters or less" }
        actions?.let { require(it.size <= 3) { "Actions must be 3 or less" } }
    }

    /**
     * FCM RemoteMessageからNotificationDataを生成
     */
    companion object {
        fun fromFCMData(data: Map<String, String>): NotificationData {
            return NotificationData(
                id = data["id"] ?: "",
                title = data["title"] ?: "",
                body = data["body"] ?: "",
                imageUrl = data["imageUrl"],
                customData = data.filterKeys { it.startsWith("custom_") }
                    .mapKeys { it.key.removePrefix("custom_") },
                channelId = data["channelId"] ?: "default_channel",
                priority = NotificationPriority.valueOf(
                    data["priority"]?.uppercase() ?: "DEFAULT"
                )
            )
        }
    }
}
```

### NotificationAction

**目的**: 通知のアクションボタン定義

```kotlin
package com.example.pushnotification.models

import com.google.gson.annotations.SerializedName

data class NotificationAction(
    /**
     * アクションID（ユニーク識別子）
     */
    @SerializedName("id")
    val id: String,

    /**
     * ボタンラベル（例: "今すぐプレイ"）
     */
    @SerializedName("label")
    val label: String,

    /**
     * ディープリンクURL（オプション、例: mygame://event/123）
     */
    @SerializedName("deepLink")
    val deepLink: String? = null,

    /**
     * アイコンリソースID（オプション）
     */
    @SerializedName("iconResId")
    val iconResId: Int? = null
) {
    init {
        require(id.isNotBlank()) { "Action ID must not be blank" }
        require(label.isNotBlank()) { "Label must not be blank" }
        require(label.length <= 20) { "Label must be 20 characters or less" }
    }
}
```

### NotificationPriority

**目的**: 通知優先度の列挙型

```kotlin
package com.example.pushnotification.models

enum class NotificationPriority {
    HIGH,    // 緊急通知（ヘッドアップ表示）
    DEFAULT, // 標準通知（サウンド＋バイブ）
    LOW;     // 低優先度（サウンドなし）

    fun toAndroidImportance(): Int {
        return when (this) {
            HIGH -> android.app.NotificationManager.IMPORTANCE_HIGH
            DEFAULT -> android.app.NotificationManager.IMPORTANCE_DEFAULT
            LOW -> android.app.NotificationManager.IMPORTANCE_LOW
        }
    }
}
```

## 3. デバイストークンモデル

### DeviceToken

**目的**: FCMデバイストークンとプレイヤー情報

```kotlin
package com.example.pushnotification.models

import com.google.gson.annotations.SerializedName

data class DeviceToken(
    /**
     * FCMデバイストークン
     */
    @SerializedName("token")
    val token: String,

    /**
     * プラットフォーム（常に"android"）
     */
    @SerializedName("platform")
    val platform: String = "android",

    /**
     * プレイヤーアカウントID（オプション）
     */
    @SerializedName("playerAccountId")
    val playerAccountId: String? = null,

    /**
     * トークン登録日時（ISO 8601形式）
     */
    @SerializedName("createdAt")
    val createdAt: String? = null
) {
    init {
        require(token.isNotBlank()) { "Token must not be blank" }
        require(platform == "android") { "Platform must be 'android'" }
    }
}
```

### TokenUpdate

**目的**: トークン更新リクエスト（プレイヤーアカウントID紐付け）

```kotlin
package com.example.pushnotification.models

import com.google.gson.annotations.SerializedName

data class TokenUpdate(
    /**
     * 新しいプレイヤーアカウントID
     */
    @SerializedName("playerAccountId")
    val playerAccountId: String?
)
```

## 4. 内部状態モデル

### TokenState

**目的**: トークン管理状態（SharedPreferences保存用）

```kotlin
package com.example.pushnotification.internal

data class TokenState(
    /**
     * 現在のFCMトークン
     */
    val currentToken: String? = null,

    /**
     * トークン登録済みフラグ
     */
    val isRegistered: Boolean = false,

    /**
     * 最終登録日時（Unixタイムスタンプ）
     */
    val lastRegisteredAt: Long = 0L,

    /**
     * プレイヤーアカウントID
     */
    val playerAccountId: String? = null
) {
    /**
     * トークンが変更されたか判定
     */
    fun hasTokenChanged(newToken: String): Boolean {
        return currentToken != newToken
    }

    /**
     * 再登録が必要か判定（24時間経過）
     */
    fun needsReRegistration(): Boolean {
        val twentyFourHours = 24 * 60 * 60 * 1000L
        return System.currentTimeMillis() - lastRegisteredAt > twentyFourHours
    }
}
```

## 5. コールバックモデル

### NotificationHandler

**目的**: 通知イベントのコールバックインターフェース

```kotlin
package com.example.pushnotification

interface NotificationHandler {
    /**
     * 通知受信時に呼び出される（フォアグラウンド/バックグラウンド両方）
     *
     * @param data 通知データ
     */
    fun onNotificationReceived(data: NotificationData)

    /**
     * 通知タップ時に呼び出される
     *
     * @param data 通知データ
     */
    fun onNotificationOpened(data: NotificationData)

    /**
     * トークン登録成功時に呼び出される（オプション）
     *
     * @param token 登録されたトークン
     */
    fun onTokenRegistered(token: String) {
        // デフォルト実装: 何もしない
    }

    /**
     * トークン登録失敗時に呼び出される（オプション）
     *
     * @param error エラー情報
     */
    fun onTokenRegistrationFailed(error: SDKError) {
        // デフォルト実装: ログ出力のみ
    }
}
```

## 6. エラーモデル

### SDKError

**目的**: SDK内部で発生するエラー情報

```kotlin
package com.example.pushnotification.models

data class SDKError(
    /**
     * エラーコード
     */
    val code: ErrorCode,

    /**
     * エラーメッセージ
     */
    val message: String,

    /**
     * 原因となった例外（オプション）
     */
    val cause: Throwable? = null
) {
    enum class ErrorCode {
        // 初期化エラー
        INITIALIZATION_FAILED,

        // トークン関連エラー
        TOKEN_FETCH_FAILED,
        TOKEN_REGISTRATION_FAILED,
        TOKEN_UPDATE_FAILED,
        TOKEN_DELETE_FAILED,

        // 通知関連エラー
        NOTIFICATION_DISPLAY_FAILED,
        IMAGE_LOAD_FAILED,

        // API通信エラー
        API_NETWORK_ERROR,
        API_AUTHENTICATION_ERROR,
        API_SERVER_ERROR,
        API_TIMEOUT_ERROR,

        // その他
        UNKNOWN_ERROR
    }

    /**
     * ユーザーフレンドリーなエラーメッセージ
     */
    fun getUserMessage(): String {
        return when (code) {
            ErrorCode.INITIALIZATION_FAILED ->
                "SDK initialization failed. Please check your configuration."
            ErrorCode.TOKEN_FETCH_FAILED ->
                "Failed to fetch device token. Please check Firebase setup."
            ErrorCode.TOKEN_REGISTRATION_FAILED ->
                "Failed to register device token. Please check network connection."
            ErrorCode.API_NETWORK_ERROR ->
                "Network connection error. Please try again later."
            ErrorCode.API_AUTHENTICATION_ERROR ->
                "Authentication failed. Please check your API key."
            else -> "An unexpected error occurred: $message"
        }
    }
}
```

## データフロー

### 1. SDK初期化フロー
```
User → SDKConfig → PushNotificationSDK.initialize()
                    ↓
         SharedPreferences ← TokenState読み込み
                    ↓
         FirebaseMessaging.getToken() → FCMトークン取得
                    ↓
         ApiClient.registerToken() → REST API登録
                    ↓
         TokenState更新 → SharedPreferences保存
```

### 2. 通知受信フロー
```
FCM Server → FCMService.onMessageReceived()
                    ↓
         RemoteMessage.data → NotificationData変換
                    ↓
         NotificationHandler.onNotificationReceived()
                    ↓
         NotificationBuilder.build() → Notification作成
                    ↓
         NotificationManager.notify() → 通知表示
```

### 3. 通知タップフロー
```
User Tap → PendingIntent発火
                    ↓
         Intent.extras → NotificationData取得
                    ↓
         NotificationHandler.onNotificationOpened()
                    ↓
         カスタムデータ解析 → 画面遷移
```

## SharedPreferences保存キー

| キー | データ型 | 説明 |
|------|----------|------|
| `fcm_device_token` | String | 現在のFCMトークン |
| `token_registered` | Boolean | トークン登録済みフラグ |
| `last_registered_at` | Long | 最終登録日時（Unixタイムスタンプ） |
| `player_account_id` | String? | プレイヤーアカウントID |
| `sdk_version` | String | SDK版本 |

## バリデーション

### 通知データバリデーション
- タイトル: 1〜100文字
- 本文: 1〜500文字
- 画像URL: HTTPS URLまたは空
- アクションボタン: 0〜3個
- アクションラベル: 1〜20文字

### SDKConfigバリデーション
- apiKey: 空白不可
- apiEndpoint: HTTPS URL形式
- タイムアウト: 1〜300秒

### デバイストークンバリデーション
- token: 空白不可
- platform: 固定値"android"

## 次のステップ

Phase 1の残りの成果物を作成:
1. `contracts/public-api.kt` - Kotlin公開API仕様
2. `contracts/rest-api.yaml` - REST API連携仕様
3. `quickstart.md` - 開発者向けガイド
