# データモデル仕様

**機能ID**: SPEC-9c11b38c
**日付**: 2025-10-30

このドキュメントは、Unity Push通知Pluginの内部データモデルを定義します。

## 設計原則

- **単一データモデル**: DTOなし、単一のデータクラスを使用
- **JSON互換**: JsonUtility/Newtonsoft.Json対応
- **不変性**: 可能な限りreadonlyフィールド使用
- **検証ロジック**: コンストラクタまたはプロパティセッターで実施

## エンティティ

### 1. NotificationData

通知データを表すクラス。Native SDKからJSON文字列として受信し、C#オブジェクトにデシリアライズされます。

```csharp
[System.Serializable]
public class NotificationData
{
    /// <summary>
    /// 通知ID（サーバー側で生成）
    /// </summary>
    public string id;

    /// <summary>
    /// 通知タイトル
    /// </summary>
    public string title;

    /// <summary>
    /// 通知本文
    /// </summary>
    public string body;

    /// <summary>
    /// 通知画像URL（オプション）
    /// </summary>
    public string imageUrl;

    /// <summary>
    /// カスタムデータ（Key-Valueペア、JSON文字列から変換）
    /// 例: {"screenId": "event", "eventId": "123"}
    /// </summary>
    public Dictionary<string, string> customData;

    /// <summary>
    /// 通知アクションボタン（オプション、最大3個）
    /// </summary>
    public NotificationAction[] actions;

    /// <summary>
    /// タイムスタンプ（受信日時、UNIX時間）
    /// </summary>
    public long timestamp;

    /// <summary>
    /// バッジ番号（iOS専用、オプション）
    /// </summary>
    public int badge;

    /// <summary>
    /// サウンド設定（オプション、デフォルト"default"）
    /// </summary>
    public string sound = "default";

    /// <summary>
    /// 通知チャンネルID（Android専用、オプション）
    /// </summary>
    public string channelId;
}
```

**検証ルール**:
- `title`: 必須、空文字不可、最大100文字
- `body`: 必須、空文字不可、最大500文字
- `imageUrl`: オプション、URL形式検証
- `customData`: オプション、最大10キー、各値最大1000文字
- `actions`: オプション、最大3個

### 2. NotificationAction

通知アクションボタンを表すクラス。

```csharp
[System.Serializable]
public class NotificationAction
{
    /// <summary>
    /// アクションID（ユニーク）
    /// </summary>
    public string id;

    /// <summary>
    /// ボタンラベル（ユーザーに表示）
    /// </summary>
    public string label;

    /// <summary>
    /// ディープリンクURL（オプション）
    /// 例: "mygame://event/123"
    /// </summary>
    public string deepLink;

    /// <summary>
    /// アイコン名（Android専用、オプション）
    /// </summary>
    public string icon;
}
```

**検証ルール**:
- `id`: 必須、空文字不可、最大50文字
- `label`: 必須、空文字不可、最大30文字
- `deepLink`: オプション、URL形式検証

### 3. PushNotificationConfig

SDK設定クラス。初期化時にPushNotificationManager.Initialize()に渡します。

```csharp
[System.Serializable]
public class PushNotificationConfig
{
    /// <summary>
    /// REST API認証キー
    /// </summary>
    public string apiKey;

    /// <summary>
    /// REST APIエンドポイント
    /// </summary>
    public string apiEndpoint;

    /// <summary>
    /// ログ出力有効化フラグ（デバッグ用）
    /// </summary>
    public bool enableLogging = false;

    /// <summary>
    /// タイムアウト時間（秒、デフォルト30秒）
    /// </summary>
    public int timeoutSeconds = 30;

    /// <summary>
    /// 自動トークン登録フラグ（デフォルトtrue）
    /// </summary>
    public bool autoRegisterToken = true;

    /// <summary>
    /// Editor疑似通知有効化フラグ（デフォルトtrue）
    /// </summary>
    public bool enableEditorSimulation = true;

    /// <summary>
    /// 設定検証
    /// </summary>
    public void Validate()
    {
        if (string.IsNullOrEmpty(apiKey))
            throw new System.ArgumentException("apiKey is required");

        if (string.IsNullOrEmpty(apiEndpoint))
            throw new System.ArgumentException("apiEndpoint is required");

        if (!apiEndpoint.StartsWith("http://") && !apiEndpoint.StartsWith("https://"))
            throw new System.ArgumentException("apiEndpoint must be a valid URL");

        if (timeoutSeconds <= 0 || timeoutSeconds > 300)
            throw new System.ArgumentException("timeoutSeconds must be between 1 and 300");
    }
}
```

**検証ルール**:
- `apiKey`: 必須、空文字不可
- `apiEndpoint`: 必須、URL形式（http/https）
- `timeoutSeconds`: 1〜300秒

### 4. PlatformType

プラットフォーム種別を表す列挙型。

```csharp
public enum PlatformType
{
    /// <summary>
    /// iOS（iPhone/iPad）
    /// </summary>
    iOS,

    /// <summary>
    /// Android
    /// </summary>
    Android,

    /// <summary>
    /// Unity Editor（疑似実装）
    /// </summary>
    Editor,

    /// <summary>
    /// 未対応プラットフォーム
    /// </summary>
    Unsupported
}
```

**使用例**:
```csharp
PlatformType platform = PushNotificationManager.CurrentPlatform;
if (platform == PlatformType.Unsupported)
{
    Debug.LogError("This platform is not supported");
}
```

### 5. SDKError

SDKエラー情報を表すクラス。

```csharp
[System.Serializable]
public class SDKError
{
    /// <summary>
    /// エラーコード
    /// </summary>
    public ErrorCode code;

    /// <summary>
    /// エラーメッセージ
    /// </summary>
    public string message;

    /// <summary>
    /// スタックトレース（デバッグ用）
    /// </summary>
    public string stackTrace;

    /// <summary>
    /// エラー発生時刻（UNIX時間）
    /// </summary>
    public long timestamp;

    public SDKError(ErrorCode code, string message)
    {
        this.code = code;
        this.message = message;
        this.stackTrace = System.Environment.StackTrace;
        this.timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    }
}

public enum ErrorCode
{
    /// <summary>
    /// SDK未初期化
    /// </summary>
    NotInitialized,

    /// <summary>
    /// プラットフォーム未対応
    /// </summary>
    UnsupportedPlatform,

    /// <summary>
    /// トークン取得失敗
    /// </summary>
    TokenFetchFailed,

    /// <summary>
    /// トークン登録失敗
    /// </summary>
    TokenRegistrationFailed,

    /// <summary>
    /// ネットワークエラー
    /// </summary>
    NetworkError,

    /// <summary>
    /// API認証エラー
    /// </summary>
    AuthenticationError,

    /// <summary>
    /// タイムアウト
    /// </summary>
    Timeout,

    /// <summary>
    /// 不正な設定
    /// </summary>
    InvalidConfiguration,

    /// <summary>
    /// Native SDKエラー
    /// </summary>
    NativeSDKError,

    /// <summary>
    /// 不明なエラー
    /// </summary>
    Unknown
}
```

### 6. TokenState

デバイストークンの状態を表す内部クラス（PlayerPrefsに保存）。

```csharp
[System.Serializable]
internal class TokenState
{
    /// <summary>
    /// デバイストークン
    /// </summary>
    public string deviceToken;

    /// <summary>
    /// プレイヤーアカウントID（オプション）
    /// </summary>
    public string playerAccountId;

    /// <summary>
    /// 登録済みフラグ
    /// </summary>
    public bool isRegistered;

    /// <summary>
    /// 最終更新日時（UNIX時間）
    /// </summary>
    public long lastUpdated;

    /// <summary>
    /// プラットフォーム種別
    /// </summary>
    public PlatformType platform;
}
```

## データフロー

### 1. 初期化フロー
```
PushNotificationConfig
  ↓ Validate()
PushNotificationManager.Initialize()
  ↓
IPlatformBridge.Initialize()
  ↓
Native SDK初期化
```

### 2. トークン登録フロー
```
Native SDK → トークン取得
  ↓ JSON文字列
IPlatformBridge.GetDeviceToken()
  ↓
TokenState作成
  ↓ PlayerPrefs保存
REST API登録
```

### 3. 通知受信フロー
```
Native SDK → 通知受信
  ↓ JSON文字列
IPlatformBridge callback
  ↓ MainThreadDispatcher.Enqueue
NotificationData デシリアライズ
  ↓
PushNotificationManager callback
  ↓
開発者コールバック実行
```

## JSON シリアライゼーション例

### NotificationData JSON例
```json
{
  "id": "notification-abc123",
  "title": "イベント開始！",
  "body": "限定イベントが始まりました。今すぐ参加しよう！",
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
  "timestamp": 1698675600,
  "badge": 1,
  "sound": "default",
  "channelId": "event_notifications"
}
```

### TokenState JSON例（PlayerPrefs保存）
```json
{
  "deviceToken": "fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6",
  "playerAccountId": "player-12345",
  "isRegistered": true,
  "lastUpdated": 1698675600,
  "platform": 1
}
```

## バリデーション実装

### NotificationData検証
```csharp
public class NotificationDataValidator
{
    public static bool Validate(NotificationData data, out string error)
    {
        if (string.IsNullOrEmpty(data.title))
        {
            error = "title is required";
            return false;
        }

        if (data.title.Length > 100)
        {
            error = "title must be 100 characters or less";
            return false;
        }

        if (string.IsNullOrEmpty(data.body))
        {
            error = "body is required";
            return false;
        }

        if (data.body.Length > 500)
        {
            error = "body must be 500 characters or less";
            return false;
        }

        if (!string.IsNullOrEmpty(data.imageUrl) && !IsValidUrl(data.imageUrl))
        {
            error = "imageUrl is not a valid URL";
            return false;
        }

        if (data.actions != null && data.actions.Length > 3)
        {
            error = "actions must be 3 or fewer";
            return false;
        }

        error = null;
        return true;
    }

    private static bool IsValidUrl(string url)
    {
        return System.Uri.TryCreate(url, System.UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == System.Uri.UriSchemeHttp || uriResult.Scheme == System.Uri.UriSchemeHttps);
    }
}
```

## 関係図

```
PushNotificationConfig
  └── PushNotificationManager
        ├── IPlatformBridge (iOS/Android/Editor)
        │     └── Native SDK
        ├── TokenState (PlayerPrefs)
        ├── NotificationData
        │     └── NotificationAction[]
        └── SDKError
```

## まとめ

- **6つの主要エンティティ**: NotificationData, NotificationAction, PushNotificationConfig, PlatformType, SDKError, TokenState
- **単一データモデル**: DTOなし、JSON互換
- **検証ロジック**: コンストラクタ/メソッドで実施
- **プラットフォーム横断**: JSON文字列でNative SDKと連携
