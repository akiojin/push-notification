/**
 * Android Push Notification SDK - Public API Specification
 *
 * 機能ID: SPEC-628d6000
 * 日付: 2025-10-30
 *
 * このファイルは公開API仕様を定義します（実装コードではありません）
 */

package com.example.pushnotification

import android.content.Context
import com.example.pushnotification.config.SDKConfig
import com.example.pushnotification.models.NotificationData

/**
 * Push Notification SDK メインエントリポイント
 *
 * シングルトンオブジェクトとして提供され、SDK初期化・設定を管理します。
 *
 * ## 使用例:
 * ```kotlin
 * val config = SDKConfig(
 *     apiKey = "your-api-key",
 *     apiEndpoint = "https://api.example.com"
 * )
 * PushNotificationSDK.initialize(context, config)
 * ```
 */
object PushNotificationSDK {

    /**
     * SDKを初期化します。
     *
     * アプリケーション起動時（Application.onCreate()）に1回だけ呼び出してください。
     * この関数は非同期で実行され、FCMトークン取得とREST API登録を行います。
     *
     * @param context Applicationコンテキスト
     * @param config SDK設定オブジェクト
     * @throws IllegalStateException すでに初期化済みの場合
     * @throws IllegalArgumentException 不正な設定値の場合
     *
     * ## 使用例:
     * ```kotlin
     * class MyApplication : Application() {
     *     override fun onCreate() {
     *         super.onCreate()
     *         val config = SDKConfig(
     *             apiKey = "your-api-key",
     *             apiEndpoint = "https://api.example.com",
     *             enableLogging = true
     *         )
     *         PushNotificationSDK.initialize(this, config)
     *     }
     * }
     * ```
     */
    fun initialize(context: Context, config: SDKConfig)

    /**
     * プレイヤーアカウントIDを更新します。
     *
     * ユーザーログイン後にプレイヤーアカウントIDをデバイストークンに紐付けます。
     * REST APIにPUTリクエストを送信し、サーバー側でトークン更新を行います。
     *
     * @param playerId プレイヤーアカウントID
     * @throws IllegalStateException SDK未初期化の場合
     * @throws IllegalArgumentException playerIdが空の場合
     *
     * ## 使用例:
     * ```kotlin
     * // ユーザーログイン成功後
     * PushNotificationSDK.updatePlayerAccountId("player-12345")
     * ```
     */
    fun updatePlayerAccountId(playerId: String)

    /**
     * デバイストークンを登録解除します。
     *
     * ユーザーログアウト時やPush通知オプトアウト時に呼び出します。
     * REST APIにDELETEリクエストを送信し、サーバー側でトークンを無効化します。
     *
     * @throws IllegalStateException SDK未初期化の場合
     *
     * ## 使用例:
     * ```kotlin
     * // ユーザーログアウト時
     * PushNotificationSDK.unregisterToken()
     * ```
     */
    fun unregisterToken()

    /**
     * 通知ハンドラーを設定します。
     *
     * 通知受信・タップ時のカスタム処理を実装できます。
     * 設定しない場合、デフォルトの通知表示のみ行われます。
     *
     * @param handler NotificationHandlerインターフェース実装
     * @throws IllegalStateException SDK未初期化の場合
     *
     * ## 使用例:
     * ```kotlin
     * PushNotificationSDK.setNotificationHandler(object : NotificationHandler {
     *     override fun onNotificationReceived(data: NotificationData) {
     *         Log.d("Push", "Received: ${data.title}")
     *     }
     *
     *     override fun onNotificationOpened(data: NotificationData) {
     *         // カスタムデータから画面IDを取得して遷移
     *         val screenId = data.customData?.get("screenId")
     *         navigateToScreen(screenId)
     *     }
     * })
     * ```
     */
    fun setNotificationHandler(handler: NotificationHandler)

    /**
     * SDK初期化済みフラグを返します。
     *
     * @return 初期化済みの場合true
     */
    fun isInitialized(): Boolean

    /**
     * 現在のデバイストークンを取得します。
     *
     * @return デバイストークン（未取得の場合null）
     */
    fun getCurrentToken(): String?
}

/**
 * 通知イベントハンドラーインターフェース
 *
 * 通知受信・タップ時のカスタム処理を実装します。
 */
interface NotificationHandler {

    /**
     * 通知受信時に呼び出されます。
     *
     * フォアグラウンド/バックグラウンド両方で呼び出されます。
     * この関数内で重い処理を行うと通知表示が遅延するため、
     * 必要に応じて別スレッドで実行してください。
     *
     * @param data 通知データ
     */
    fun onNotificationReceived(data: NotificationData)

    /**
     * 通知タップ時に呼び出されます。
     *
     * ディープリンク処理や画面遷移をこの関数内で実装します。
     *
     * @param data 通知データ
     */
    fun onNotificationOpened(data: NotificationData)

    /**
     * トークン登録成功時に呼び出されます（オプション）。
     *
     * デフォルト実装は何もしません。
     *
     * @param token 登録されたデバイストークン
     */
    fun onTokenRegistered(token: String) {
        // デフォルト実装: 何もしない
    }

    /**
     * トークン登録失敗時に呼び出されます（オプション）。
     *
     * デフォルト実装は何もしません。
     *
     * @param error エラー情報
     */
    fun onTokenRegistrationFailed(error: SDKError) {
        // デフォルト実装: 何もしない
    }
}

/**
 * 通知チャンネル管理API
 *
 * Android 8.0以降の通知チャンネルを管理します。
 */
object ChannelManager {

    /**
     * 通知チャンネルを作成します。
     *
     * @param id チャンネルID（ユニーク）
     * @param name チャンネル名（ユーザーに表示される）
     * @param importance 通知重要度（IMPORTANCE_HIGH, IMPORTANCE_DEFAULT, IMPORTANCE_LOW）
     * @throws IllegalArgumentException 不正なパラメータの場合
     *
     * ## 使用例:
     * ```kotlin
     * ChannelManager.createChannel(
     *     id = "event_notifications",
     *     name = "イベント通知",
     *     importance = NotificationManager.IMPORTANCE_HIGH
     * )
     * ```
     */
    fun createChannel(id: String, name: String, importance: Int)

    /**
     * 通知チャンネルを削除します。
     *
     * @param id チャンネルID
     */
    fun deleteChannel(id: String)

    /**
     * すべての通知チャンネルを取得します。
     *
     * @return チャンネルIDとチャンネル名のマップ
     */
    fun getAllChannels(): Map<String, String>
}

/**
 * Unity/Unreal Engine JNIブリッジ用API
 *
 * Unity C#やUnreal Engine C++から呼び出すための静的関数を提供します。
 */
object PushNotificationJNI {

    /**
     * SDKを初期化します（JNI用）。
     *
     * @param context Androidコンテキスト
     * @param apiKey APIキー
     * @param apiEndpoint APIエンドポイント
     * @param enableLogging ロギング有効化フラグ
     *
     * ## Unity C#から呼び出す例:
     * ```csharp
     * AndroidJavaClass javaClass = new AndroidJavaClass(
     *     "com.example.pushnotification.PushNotificationJNI"
     * );
     * AndroidJavaObject activity = new AndroidJavaClass("com.unity3d.player.UnityPlayer")
     *     .GetStatic<AndroidJavaObject>("currentActivity");
     *
     * javaClass.CallStatic("initialize", activity, "api-key", "https://api.example.com", true);
     * ```
     */
    @JvmStatic
    fun initialize(context: Context, apiKey: String, apiEndpoint: String, enableLogging: Boolean)

    /**
     * プレイヤーアカウントIDを更新します（JNI用）。
     *
     * @param playerId プレイヤーアカウントID
     */
    @JvmStatic
    fun updatePlayerAccountId(playerId: String)

    /**
     * デバイストークンを登録解除します（JNI用）。
     */
    @JvmStatic
    fun unregisterToken()

    /**
     * 通知コールバックを設定します（JNI用）。
     *
     * @param callback JSON文字列を受け取るコールバック関数
     *
     * ## Unity C#から呼び出す例:
     * ```csharp
     * javaClass.CallStatic("setNotificationCallback", new Action<string>((json) => {
     *     Debug.Log("Notification received: " + json);
     *     // JSONをパースして処理
     * }));
     * ```
     */
    @JvmStatic
    fun setNotificationCallback(callback: (String) -> Unit)

    /**
     * 現在のデバイストークンを取得します（JNI用）。
     *
     * @return デバイストークン（未取得の場合null）
     */
    @JvmStatic
    fun getCurrentToken(): String?
}

/**
 * SDKエラー情報
 */
data class SDKError(
    val code: ErrorCode,
    val message: String,
    val cause: Throwable? = null
) {
    enum class ErrorCode {
        INITIALIZATION_FAILED,
        TOKEN_FETCH_FAILED,
        TOKEN_REGISTRATION_FAILED,
        TOKEN_UPDATE_FAILED,
        TOKEN_DELETE_FAILED,
        NOTIFICATION_DISPLAY_FAILED,
        IMAGE_LOAD_FAILED,
        API_NETWORK_ERROR,
        API_AUTHENTICATION_ERROR,
        API_SERVER_ERROR,
        API_TIMEOUT_ERROR,
        UNKNOWN_ERROR
    }
}
