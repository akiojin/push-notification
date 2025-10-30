/**
 * Unity Push Notification Plugin - Public API Specification
 *
 * 機能ID: SPEC-9c11b38c
 * 日付: 2025-10-30
 *
 * このファイルは公開API仕様を定義します（実装コードではありません）
 */

using System;
using UnityEngine;

namespace PushNotification
{
    /// <summary>
    /// Push Notification Plugin メインエントリポイント
    ///
    /// シングルトンとして提供され、SDK初期化・設定を管理します。
    ///
    /// 使用例:
    /// <code>
    /// var config = new PushNotificationConfig
    /// {
    ///     apiKey = "your-api-key",
    ///     apiEndpoint = "https://api.example.com"
    /// };
    /// PushNotificationManager.Initialize(config);
    /// </code>
    /// </summary>
    public static class PushNotificationManager
    {
        /// <summary>
        /// SDKを初期化します。
        ///
        /// ゲーム起動時に1回だけ呼び出してください。
        /// この関数は非同期で実行され、デバイストークン取得とREST API登録を行います。
        ///
        /// <param name="config">SDK設定オブジェクト</param>
        /// <exception cref="InvalidOperationException">すでに初期化済みの場合</exception>
        /// <exception cref="ArgumentException">不正な設定値の場合</exception>
        ///
        /// 使用例:
        /// <code>
        /// public class GameManager : MonoBehaviour
        /// {
        ///     void Start()
        ///     {
        ///         var config = new PushNotificationConfig
        ///         {
        ///             apiKey = "your-api-key",
        ///             apiEndpoint = "https://api.example.com",
        ///             enableLogging = true
        ///         };
        ///         PushNotificationManager.Initialize(config);
        ///     }
        /// }
        /// </code>
        /// </summary>
        public static void Initialize(PushNotificationConfig config);

        /// <summary>
        /// 通知ハンドラーを設定します。
        ///
        /// 通知受信・タップ時のカスタム処理を実装できます。
        /// 設定しない場合、デフォルトの通知表示のみ行われます。
        ///
        /// <param name="onReceived">通知受信時のコールバック（フォアグラウンド/バックグラウンド両方）</param>
        /// <param name="onOpened">通知タップ時のコールバック</param>
        /// <exception cref="InvalidOperationException">SDK未初期化の場合</exception>
        ///
        /// 使用例:
        /// <code>
        /// PushNotificationManager.SetNotificationHandler(
        ///     onReceived: (data) =>
        ///     {
        ///         Debug.Log($"Received: {data.title}");
        ///     },
        ///     onOpened: (data) =>
        ///     {
        ///         // カスタムデータから画面IDを取得して遷移
        ///         if (data.customData.TryGetValue("screenId", out string screenId))
        ///         {
        ///             NavigateToScreen(screenId);
        ///         }
        ///     }
        /// );
        /// </code>
        /// </summary>
        public static void SetNotificationHandler(
            Action<NotificationData> onReceived,
            Action<NotificationData> onOpened);

        /// <summary>
        /// プレイヤーアカウントIDを更新します。
        ///
        /// ユーザーログイン後にプレイヤーアカウントIDをデバイストークンに紐付けます。
        /// REST APIにPUTリクエストを送信し、サーバー側でトークン更新を行います。
        ///
        /// <param name="playerId">プレイヤーアカウントID</param>
        /// <exception cref="InvalidOperationException">SDK未初期化の場合</exception>
        /// <exception cref="ArgumentException">playerIdが空の場合</exception>
        ///
        /// 使用例:
        /// <code>
        /// // ユーザーログイン成功後
        /// PushNotificationManager.UpdatePlayerAccountId("player-12345");
        /// </code>
        /// </summary>
        public static void UpdatePlayerAccountId(string playerId);

        /// <summary>
        /// デバイストークンを登録解除します。
        ///
        /// ユーザーログアウト時やPush通知オプトアウト時に呼び出します。
        /// REST APIにDELETEリクエストを送信し、サーバー側でトークンを無効化します。
        ///
        /// <exception cref="InvalidOperationException">SDK未初期化の場合</exception>
        ///
        /// 使用例:
        /// <code>
        /// // ユーザーログアウト時
        /// PushNotificationManager.UnregisterToken();
        /// </code>
        /// </summary>
        public static void UnregisterToken();

        /// <summary>
        /// SDK初期化済みフラグを返します。
        /// </summary>
        /// <returns>初期化済みの場合true</returns>
        public static bool IsInitialized { get; }

        /// <summary>
        /// 現在のデバイストークンを取得します。
        /// </summary>
        /// <returns>デバイストークン（未取得の場合null）</returns>
        public static string CurrentDeviceToken { get; }

        /// <summary>
        /// 現在のプラットフォームを取得します。
        /// </summary>
        /// <returns>プラットフォーム種別</returns>
        public static PlatformType CurrentPlatform { get; }

        /// <summary>
        /// エラーコールバックを設定します（オプション）。
        ///
        /// SDK内部エラー発生時に通知を受け取ります。
        ///
        /// <param name="onError">エラーコールバック</param>
        ///
        /// 使用例:
        /// <code>
        /// PushNotificationManager.SetErrorHandler((error) =>
        /// {
        ///     Debug.LogError($"[Push SDK] {error.code}: {error.message}");
        /// });
        /// </code>
        /// </summary>
        public static void SetErrorHandler(Action<SDKError> onError);
    }

    /// <summary>
    /// プラットフォームブリッジ抽象インターフェース
    ///
    /// iOS/Android/Editorの各実装がこのインターフェースを実装します。
    /// 内部使用のみ、公開APIではありません。
    /// </summary>
    internal interface IPlatformBridge
    {
        /// <summary>
        /// Native SDKを初期化します。
        /// </summary>
        /// <param name="apiKey">APIキー</param>
        /// <param name="endpoint">APIエンドポイント</param>
        void Initialize(string apiKey, string endpoint);

        /// <summary>
        /// デバイストークンを取得します。
        /// </summary>
        /// <returns>デバイストークン（未取得の場合null）</returns>
        string GetDeviceToken();

        /// <summary>
        /// デバイストークンをREST APIに登録します。
        /// </summary>
        /// <param name="token">デバイストークン</param>
        void RegisterToken(string token);

        /// <summary>
        /// 通知コールバックを設定します。
        /// </summary>
        /// <param name="callback">JSON文字列を受け取るコールバック</param>
        void SetNotificationCallback(Action<string> callback);

        /// <summary>
        /// プレイヤーアカウントIDを更新します。
        /// </summary>
        /// <param name="playerId">プレイヤーアカウントID</param>
        void UpdatePlayerAccountId(string playerId);

        /// <summary>
        /// デバイストークンを登録解除します。
        /// </summary>
        void UnregisterToken();

        /// <summary>
        /// プラットフォーム種別を取得します。
        /// </summary>
        /// <returns>プラットフォーム種別</returns>
        PlatformType GetPlatformType();
    }

    /// <summary>
    /// Unity Editor専用 - 疑似通知送信ユーティリティ
    ///
    /// Unity Editorでのみ使用可能。実機ビルドでは無視されます。
    /// </summary>
#if UNITY_EDITOR
    public static class EditorNotificationSimulator
    {
        /// <summary>
        /// 疑似通知を送信します。
        ///
        /// Unity Editorでのテスト用に、疑似的に通知を発火させます。
        ///
        /// <param name="data">通知データ</param>
        ///
        /// 使用例:
        /// <code>
        /// var testData = new NotificationData
        /// {
        ///     title = "テスト通知",
        ///     body = "これはテストです",
        ///     customData = new Dictionary<string, string>
        ///     {
        ///         { "screenId", "event" }
        ///     }
        /// };
        /// EditorNotificationSimulator.SendNotification(testData);
        /// </code>
        /// </summary>
        public static void SendNotification(NotificationData data);

        /// <summary>
        /// 疑似デバイストークンを生成します。
        /// </summary>
        /// <returns>疑似トークン（UUID）</returns>
        public static string GenerateMockToken();
    }
#endif

    /// <summary>
    /// プラットフォームファクトリー
    ///
    /// 実行中のプラットフォームに応じて適切なIPlatformBridge実装を返します。
    /// 内部使用のみ。
    /// </summary>
    internal static class PlatformBridgeFactory
    {
        /// <summary>
        /// 現在のプラットフォームに対応するブリッジを作成します。
        /// </summary>
        /// <returns>プラットフォームブリッジ実装</returns>
        /// <exception cref="PlatformNotSupportedException">未対応プラットフォームの場合</exception>
        public static IPlatformBridge CreateBridge();
    }

    /// <summary>
    /// メインスレッドディスパッチャー
    ///
    /// Native SDKコールバック（別スレッド）をUnityメインスレッドで実行します。
    /// 内部使用のみ。
    /// </summary>
    internal class MainThreadDispatcher : MonoBehaviour
    {
        /// <summary>
        /// シングルトンインスタンスを初期化します。
        /// </summary>
        public static void Initialize();

        /// <summary>
        /// アクションをメインスレッドキューに追加します。
        /// </summary>
        /// <param name="action">実行するアクション</param>
        public static void Enqueue(Action action);

        /// <summary>
        /// メインスレッドで即座にアクションを実行します。
        /// </summary>
        /// <param name="action">実行するアクション</param>
        public static void Execute(Action action);
    }

    /// <summary>
    /// トークンストレージ
    ///
    /// デバイストークン・プレイヤーアカウントIDをPlayerPrefsで永続化します。
    /// 内部使用のみ。
    /// </summary>
    internal static class TokenStorage
    {
        /// <summary>
        /// トークン状態を保存します。
        /// </summary>
        /// <param name="state">トークン状態</param>
        public static void Save(TokenState state);

        /// <summary>
        /// トークン状態を読み込みます。
        /// </summary>
        /// <returns>トークン状態（存在しない場合null）</returns>
        public static TokenState Load();

        /// <summary>
        /// トークン状態をクリアします。
        /// </summary>
        public static void Clear();
    }

    /// <summary>
    /// ログユーティリティ
    ///
    /// SDK内部ログを管理します。enableLogging=falseの場合は出力しません。
    /// 内部使用のみ。
    /// </summary>
    internal static class Logger
    {
        /// <summary>
        /// ログ出力有効化フラグを設定します。
        /// </summary>
        /// <param name="enabled">有効化フラグ</param>
        public static void SetEnabled(bool enabled);

        /// <summary>
        /// デバッグログを出力します。
        /// </summary>
        /// <param name="message">メッセージ</param>
        public static void Debug(string message);

        /// <summary>
        /// 情報ログを出力します。
        /// </summary>
        /// <param name="message">メッセージ</param>
        public static void Info(string message);

        /// <summary>
        /// 警告ログを出力します。
        /// </summary>
        /// <param name="message">メッセージ</param>
        public static void Warning(string message);

        /// <summary>
        /// エラーログを出力します。
        /// </summary>
        /// <param name="message">メッセージ</param>
        public static void Error(string message);

        /// <summary>
        /// 例外ログを出力します。
        /// </summary>
        /// <param name="exception">例外</param>
        public static void Exception(Exception exception);
    }
}
