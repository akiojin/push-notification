# データモデル仕様

**機能ID**: SPEC-bfa1680e
**日付**: 2025-10-30

このドキュメントは、Unreal Engine Push通知Pluginの内部データモデルを定義します。

## 設計原則

- **単一データモデル**: DTOなし、単一のFStructを使用
- **Unreal Reflection対応**: USTRUCT()、UPROPERTY()使用
- **Blueprint公開**: BlueprintType、BlueprintReadWrite指定
- **検証ロジック**: Validate()関数で実施

## エンティティ

### 1. FPushNotificationData

通知データを表すFStruct。Native SDKからJSON文字列として受信し、UStructにデシリアライズされます。

```cpp
USTRUCT(BlueprintType)
struct FPushNotificationData
{
    GENERATED_BODY()

    /**  通知ID（サーバー側で生成） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Id;

    /** 通知タイトル */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Title;

    /** 通知本文 */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Body;

    /** 通知画像URL（オプション） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString ImageUrl;

    /** カスタムデータ（Key-Valueペア、JSON文字列から変換）
     * 例: {"screenId": "event", "eventId": "123"}
     */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    TMap<FString, FString> CustomData;

    /** 通知アクションボタン（オプション、最大3個） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    TArray<FPushNotificationAction> Actions;

    /** タイムスタンプ（受信日時、UNIX時間） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    int64 Timestamp = 0;

    /** バッジ番号（iOS専用、オプション） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    int32 Badge = 0;

    /** サウンド設定（オプション、デフォルト"default"） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Sound = TEXT("default");

    /** 通知チャンネルID（Android専用、オプション） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString ChannelId;

    /** データ検証 */
    bool Validate(FString& OutError) const;
};
```

**検証ルール**:
- `Title`: 必須、空文字不可、最大100文字
- `Body`: 必須、空文字不可、最大500文字
- `ImageUrl`: オプション、URL形式検証
- `CustomData`: オプション、最大10キー、各値最大1000文字
- `Actions`: オプション、最大3個

### 2. FPushNotificationAction

通知アクションボタンを表すFStruct。

```cpp
USTRUCT(BlueprintType)
struct FPushNotificationAction
{
    GENERATED_BODY()

    /** アクションID（ユニーク） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Id;

    /** ボタンラベル（ユーザーに表示） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Label;

    /** ディープリンクURL（オプション）
     * 例: "mygame://event/123"
     */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString DeepLink;

    /** アイコン名（Android専用、オプション） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Icon;
};
```

**検証ルール**:
- `Id`: 必須、空文字不可、最大50文字
- `Label`: 必須、空文字不可、最大30文字
- `DeepLink`: オプション、URL形式検証

### 3. FPushNotificationConfig

SDK設定クラス。初期化時にUPushNotificationSubsystem::Initialize()に渡します。

```cpp
USTRUCT(BlueprintType)
struct FPushNotificationConfig
{
    GENERATED_BODY()

    /** REST API認証キー */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString ApiKey;

    /** REST APIエンドポイント */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString ApiEndpoint;

    /** ログ出力有効化フラグ（デバッグ用） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    bool bEnableLogging = false;

    /** タイムアウト時間（秒、デフォルト30秒） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    int32 TimeoutSeconds = 30;

    /** 自動トークン登録フラグ（デフォルトtrue） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    bool bAutoRegisterToken = true;

    /** Editor疑似通知有効化フラグ（デフォルトtrue） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    bool bEnableEditorSimulation = true;

    /** 設定検証 */
    bool Validate(FString& OutError) const;
};
```

**検証ルール**:
- `ApiKey`: 必須、空文字不可
- `ApiEndpoint`: 必須、URL形式（http/https）
- `TimeoutSeconds`: 1〜300秒

### 4. EPlatformType

プラットフォーム種別を表す列挙型。

```cpp
UENUM(BlueprintType)
enum class EPlatformType : uint8
{
    /** iOS（iPhone/iPad） */
    IOS UMETA(DisplayName = "iOS"),

    /** Android */
    Android UMETA(DisplayName = "Android"),

    /** Unreal Editor（疑似実装） */
    Editor UMETA(DisplayName = "Editor"),

    /** 未対応プラットフォーム */
    Unsupported UMETA(DisplayName = "Unsupported")
};
```

**使用例**:
```cpp
EPlatformType Platform = UPushNotificationSubsystem::Get()->GetCurrentPlatform();
if (Platform == EPlatformType::Unsupported)
{
    UE_LOG(LogPushNotification, Error, TEXT("This platform is not supported"));
}
```

### 5. FPushNotificationError

SDKエラー情報を表すFStruct。

```cpp
USTRUCT(BlueprintType)
struct FPushNotificationError
{
    GENERATED_BODY()

    /** エラーコード */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    EErrorCode Code = EErrorCode::Unknown;

    /** エラーメッセージ */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString Message;

    /** スタックトレース（デバッグ用） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    FString StackTrace;

    /** エラー発生時刻（UNIX時間） */
    UPROPERTY(BlueprintReadWrite, Category = "Push Notification")
    int64 Timestamp = 0;

    FPushNotificationError() = default;

    FPushNotificationError(EErrorCode InCode, const FString& InMessage)
        : Code(InCode)
        , Message(InMessage)
        , Timestamp(FDateTime::UtcNow().ToUnixTimestamp())
    {
    }
};

UENUM(BlueprintType)
enum class EErrorCode : uint8
{
    /** SDK未初期化 */
    NotInitialized UMETA(DisplayName = "Not Initialized"),

    /** プラットフォーム未対応 */
    UnsupportedPlatform UMETA(DisplayName = "Unsupported Platform"),

    /** トークン取得失敗 */
    TokenFetchFailed UMETA(DisplayName = "Token Fetch Failed"),

    /** トークン登録失敗 */
    TokenRegistrationFailed UMETA(DisplayName = "Token Registration Failed"),

    /** ネットワークエラー */
    NetworkError UMETA(DisplayName = "Network Error"),

    /** API認証エラー */
    AuthenticationError UMETA(DisplayName = "Authentication Error"),

    /** タイムアウト */
    Timeout UMETA(DisplayName = "Timeout"),

    /** 不正な設定 */
    InvalidConfiguration UMETA(DisplayName = "Invalid Configuration"),

    /** Native SDKエラー */
    NativeSDKError UMETA(DisplayName = "Native SDK Error"),

    /** 不明なエラー */
    Unknown UMETA(DisplayName = "Unknown")
};
```

### 6. FTokenState

デバイストークンの状態を表す内部Struct（GameInstanceに保存）。

```cpp
struct FTokenState
{
    /** デバイストークン */
    FString DeviceToken;

    /** プレイヤーアカウントID（オプション） */
    FString PlayerAccountId;

    /** 登録済みフラグ */
    bool bIsRegistered = false;

    /** 最終更新日時（UNIX時間） */
    int64 LastUpdated = 0;

    /** プラットフォーム種別 */
    EPlatformType Platform = EPlatformType::Unsupported;
};
```

## データフロー

### 1. 初期化フロー
```
FPushNotificationConfig
  ↓ Validate()
UPushNotificationSubsystem::Initialize()
  ↓
IPlatformBridge::Initialize()
  ↓
Native SDK初期化
```

### 2. トークン登録フロー
```
Native SDK → トークン取得
  ↓ JSON文字列
IPlatformBridge::GetDeviceToken()
  ↓
FTokenState作成
  ↓ GameInstanceに保存
REST API登録
```

### 3. 通知受信フロー
```
Native SDK → 通知受信
  ↓ JSON文字列
IPlatformBridge callback
  ↓ FGameThreadDispatcher::Enqueue
FJsonObjectConverter::JsonObjectStringToUStruct
  ↓
UPushNotificationSubsystem デリゲートブロードキャスト
  ↓
開発者デリゲート実行
```

## JSON シリアライゼーション例

### FPushNotificationData JSON例
```json
{
  "Id": "notification-abc123",
  "Title": "イベント開始！",
  "Body": "限定イベントが始まりました。今すぐ参加しよう！",
  "ImageUrl": "https://example.com/images/event-banner.jpg",
  "CustomData": {
    "screenId": "event",
    "eventId": "123"
  },
  "Actions": [
    {
      "Id": "action_play",
      "Label": "今すぐプレイ",
      "DeepLink": "mygame://event/123"
    },
    {
      "Id": "action_later",
      "Label": "後で通知"
    }
  ],
  "Timestamp": 1698675600,
  "Badge": 1,
  "Sound": "default",
  "ChannelId": "event_notifications"
}
```

### FTokenState保存例（GameInstanceメモリ）
```cpp
FTokenState State;
State.DeviceToken = TEXT("fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6");
State.PlayerAccountId = TEXT("player-12345");
State.bIsRegistered = true;
State.LastUpdated = 1698675600;
State.Platform = EPlatformType::IOS;
```

## バリデーション実装

### FPushNotificationData検証
```cpp
bool FPushNotificationData::Validate(FString& OutError) const
{
    if (Title.IsEmpty())
    {
        OutError = TEXT("Title is required");
        return false;
    }

    if (Title.Len() > 100)
    {
        OutError = TEXT("Title must be 100 characters or less");
        return false;
    }

    if (Body.IsEmpty())
    {
        OutError = TEXT("Body is required");
        return false;
    }

    if (Body.Len() > 500)
    {
        OutError = TEXT("Body must be 500 characters or less");
        return false;
    }

    if (!ImageUrl.IsEmpty() && !FPlatformHttp::IsValidUrl(ImageUrl))
    {
        OutError = TEXT("ImageUrl is not a valid URL");
        return false;
    }

    if (Actions.Num() > 3)
    {
        OutError = TEXT("Actions must be 3 or fewer");
        return false;
    }

    return true;
}
```

### FPushNotificationConfig検証
```cpp
bool FPushNotificationConfig::Validate(FString& OutError) const
{
    if (ApiKey.IsEmpty())
    {
        OutError = TEXT("ApiKey is required");
        return false;
    }

    if (ApiEndpoint.IsEmpty())
    {
        OutError = TEXT("ApiEndpoint is required");
        return false;
    }

    if (!ApiEndpoint.StartsWith(TEXT("http://")) && !ApiEndpoint.StartsWith(TEXT("https://")))
    {
        OutError = TEXT("ApiEndpoint must be a valid URL (http:// or https://)");
        return false;
    }

    if (TimeoutSeconds <= 0 || TimeoutSeconds > 300)
    {
        OutError = TEXT("TimeoutSeconds must be between 1 and 300");
        return false;
    }

    return true;
}
```

## Delegate定義

### 通知受信デリゲート
```cpp
/** 通知受信時に呼ばれるデリゲート */
DECLARE_MULTICAST_DELEGATE_OneParam(FOnNotificationReceived, const FPushNotificationData&);

/** 通知タップ時に呼ばれるデリゲート */
DECLARE_MULTICAST_DELEGATE_OneParam(FOnNotificationOpened, const FPushNotificationData&);

/** エラー発生時に呼ばれるデリゲート */
DECLARE_MULTICAST_DELEGATE_OneParam(FOnPushNotificationError, const FPushNotificationError&);
```

### Blueprint公開デリゲート
```cpp
/** Blueprint公開：通知受信イベント */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnNotificationReceivedDynamic, const FPushNotificationData&, NotificationData);

/** Blueprint公開：通知タップイベント */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnNotificationOpenedDynamic, const FPushNotificationData&, NotificationData);
```

## 関係図

```
FPushNotificationConfig
  └── UPushNotificationSubsystem
        ├── IPlatformBridge (iOS/Android/Editor)
        │     └── Native SDK
        ├── FTokenState (GameInstance)
        ├── FPushNotificationData
        │     └── TArray<FPushNotificationAction>
        ├── FOnNotificationReceived (Delegate)
        ├── FOnNotificationOpened (Delegate)
        └── FPushNotificationError
```

## まとめ

- **6つの主要エンティティ**: FPushNotificationData, FPushNotificationAction, FPushNotificationConfig, EPlatformType, FPushNotificationError, FTokenState
- **単一データモデル**: DTOなし、JSON互換（FJsonObjectConverter使用）
- **検証ロジック**: Validate()関数で実施
- **Blueprint完全対応**: USTRUCT(BlueprintType)、UPROPERTY(BlueprintReadWrite)
- **プラットフォーム横断**: JSON文字列でNative SDKと連携
- **デリゲート**: C++（Multicast）とBlueprint（Dynamic）両対応
