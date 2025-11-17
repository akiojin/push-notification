# クイックスタートガイド

**機能ID**: SPEC-bfa1680e
**日付**: 2025-10-30

このガイドでは、Unreal Engine Push通知Pluginを使用して、30分以内にPush通知機能を実装する方法を説明します。

## 前提条件

- Unreal Engine 5.3以上
- iOS開発: Xcode 15.0+、Apple Developer Program登録
- Android開発: Android Studio、Google Cloud Consoleアカウント
- REST APIサーバー（SPEC-2d193ce6実装済み）

## 1. Pluginインストール（5分）

### 1.1 .upluginファイルの配置

1. Unreal Engineプロジェクトの`Plugins`ディレクトリに`PushNotificationPlugin`フォルダを配置:

```
MyProject/
├── Plugins/
│   └── PushNotificationPlugin/
│       ├── PushNotificationPlugin.uplugin
│       ├── Source/
│       ├── Resources/
│       └── Content/
├── MyProject.uproject
└── ...
```

1. Unreal Editorを起動し、Edit > Plugins > Installed > Messagingから`Push Notification Plugin`を有効化

2. Editorを再起動

### 1.2 Build.csに依存関係を追加（C++プロジェクトのみ）

`Source/MyProject/MyProject.Build.cs`に以下を追加:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core",
    "CoreUObject",
    "Engine",
    "PushNotificationPlugin" // 追加
});
```

## 2. C++での初期化（3分）

### 2.1 GameMode/GameInstanceでの初期化

`AMyGameMode.h`:

```cpp
#include "PushNotificationSubsystem.h"

UCLASS()
class MYPROJECT_API AMyGameMode : public AGameModeBase
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;

    UFUNCTION()
    void OnNotificationReceived(const FPushNotificationData& Data);

    UFUNCTION()
    void OnNotificationOpened(const FPushNotificationData& Data);
};
```

`AMyGameMode.cpp`:

```cpp
void AMyGameMode::BeginPlay()
{
    Super::BeginPlay();

    // 1. Subsystem取得
    UPushNotificationSubsystem* PushNotification =
        GetGameInstance()->GetSubsystem<UPushNotificationSubsystem>();

    // 2. 設定作成
    FPushNotificationConfig Config;
    Config.ApiKey = TEXT("your-api-key-here");
    Config.ApiEndpoint = TEXT("https://api.example.com");
    Config.bEnableLogging = true; // デバッグ用

    // 3. SDK初期化
    bool bSuccess = PushNotification->Initialize(Config);
    if (!bSuccess)
    {
        UE_LOG(LogTemp, Error, TEXT("Push Notification SDK initialization failed"));
        return;
    }

    // 4. デリゲート設定
    PushNotification->OnNotificationReceived.AddUObject(this, &AMyGameMode::OnNotificationReceived);
    PushNotification->OnNotificationOpened.AddUObject(this, &AMyGameMode::OnNotificationOpened);
}

void AMyGameMode::OnNotificationReceived(const FPushNotificationData& Data)
{
    UE_LOG(LogTemp, Log, TEXT("Notification Received: %s"), *Data.Title);

    // カスタムデータの取得例
    if (Data.CustomData.Contains(TEXT("eventId")))
    {
        FString EventId = Data.CustomData[TEXT("eventId")];
        UE_LOG(LogTemp, Log, TEXT("Event ID: %s"), *EventId);
    }
}

void AMyGameMode::OnNotificationOpened(const FPushNotificationData& Data)
{
    UE_LOG(LogTemp, Log, TEXT("Notification Opened: %s"), *Data.Title);

    // ディープリンク処理例
    for (const FPushNotificationAction& Action : Data.Actions)
    {
        if (!Action.DeepLink.IsEmpty())
        {
            UE_LOG(LogTemp, Log, TEXT("Deep Link: %s"), *Action.DeepLink);
            // ゲーム内画面遷移処理...
        }
    }
}
```

## 3. Blueprintでの初期化（5分）

### 3.1 GameInstanceでの初期化

1. Content BrowserでGameInstanceブループリントを作成（例: `BP_MyGameInstance`）
2. Project Settings > Maps & Modes > Game Instance Classで`BP_MyGameInstance`を指定
3. Event Graphに以下を実装:

```
Event Init
  ↓
Get Push Notification Subsystem (World Context Object: self)
  ↓
Make PushNotificationConfig Struct
  - Api Key: "your-api-key-here"
  - Api Endpoint: "https://api.example.com"
  - Enable Logging: true
  ↓
Initialize Push Notification (Config: ↑)
  ↓
Branch (Condition: Return Value)
  - True: Print String "SDK Initialized"
  - False: Print String "SDK Initialization Failed"
  ↓
On Notification Received BP (Event) → Assign
  ↓
Print String (In String: Notification Data > Title)
```

### 3.2 Blueprint通知ハンドラーの実装

`BP_MyGameInstance` Event Graphに追加:

```
On Notification Received BP (Event)
  - Notification Data (struct)
  ↓
Get Custom Data Value (Notification Data, Key: "eventId")
  ↓
Branch (Out Value is valid?)
  - True: Print String "Event ID: {Out Value}"

On Notification Opened BP (Event)
  - Notification Data (struct)
  ↓
For Each Loop (Array: Notification Data > Actions)
  ↓
Branch (Deep Link is not empty?)
  - True: Open Level (by Object Reference, Deep Link処理)
```

## 4. Editor疑似通知テスト（5分）

Unreal Editorでのテストは`FEditorNotificationSimulator`を使用します。

### 4.1 Editor Utility Widgetでの送信

`Content/Editor/EUW_NotificationSimulator.uasset`を開く:

1. "Title"欄に「テスト通知」を入力
2. "Body"欄に「これはテスト通知です」を入力
3. "Custom Data"に`screenId: event, eventId: 123`を入力
4. "Send Notification"ボタンをクリック
5. Output Logに「Notification Received: テスト通知」が表示される

### 4.2 C++での疑似通知送信

```cpp
#if WITH_EDITOR
void AMyGameMode::SendTestNotification()
{
    FPushNotificationData TestData;
    TestData.Id = TEXT("test-notification-001");
    TestData.Title = TEXT("テスト通知");
    TestData.Body = TEXT("これはテスト通知です");
    TestData.CustomData.Add(TEXT("screenId"), TEXT("event"));
    TestData.CustomData.Add(TEXT("eventId"), TEXT("123"));

    FEditorNotificationSimulator::SendNotification(TestData);
}
#endif
```

## 5. プレイヤーアカウント紐付け（2分）

ユーザーログイン後にプレイヤーアカウントIDを紐付けます。

### 5.1 C++での実装

```cpp
void AMyGameMode::OnUserLoggedIn(const FString& PlayerId)
{
    UPushNotificationSubsystem* PushNotification =
        GetGameInstance()->GetSubsystem<UPushNotificationSubsystem>();

    PushNotification->UpdatePlayerAccountId(PlayerId);
    UE_LOG(LogTemp, Log, TEXT("Player account linked: %s"), *PlayerId);
}
```

### 5.2 Blueprintでの実装

```
On User Logged In (Custom Event)
  - Player Id (String parameter)
  ↓
Get Push Notification Subsystem
  ↓
Update Player Account Id (Player Id: ↑)
  ↓
Print String "Player account linked: {Player Id}"
```

## 6. ログアウト処理（2分）

ユーザーログアウト時にトークンを登録解除します。

### 6.1 C++での実装

```cpp
void AMyGameMode::OnUserLoggedOut()
{
    UPushNotificationSubsystem* PushNotification =
        GetGameInstance()->GetSubsystem<UPushNotificationSubsystem>();

    PushNotification->UnregisterToken();
    UE_LOG(LogTemp, Log, TEXT("Device token unregistered"));
}
```

### 6.2 Blueprintでの実装

```
On User Logged Out (Custom Event)
  ↓
Get Push Notification Subsystem
  ↓
Unregister Token
  ↓
Print String "Device token unregistered"
```

## 7. iOS実機ビルド設定（5分）

### 7.1 Project Settings設定

1. Edit > Project Settings > Platforms > iOS
2. Bundle Identifier: `com.yourcompany.yourproject`
3. Provisioning Profile: 適切なプロファイルを選択
4. Signing Certificate: 開発者証明書を選択

### 7.2 iOSPlatformBridge設定

`Config/DefaultEngine.ini`に以下を追加:

```ini
[/Script/IOSRuntimeSettings.IOSRuntimeSettings]
bEnableRemoteNotificationsSupport=True
```

### 7.3 Capability設定

`Build.cs`で自動的にPush Notifications capabilityが有効化されます（iOS Native SDK依存）。

### 7.4 パッケージング

Package Project > iOS > Package for Distribution

## 8. Android実機ビルド設定（5分）

### 8.1 Project Settings設定

1. Edit > Project Settings > Platforms > Android
2. Package Name: `com.yourcompany.yourproject`
3. Minimum SDK Version: 24 (Android 7.0)
4. Target SDK Version: 34 (Android 14)

### 8.2 google-services.json配置

Firebase Consoleからダウンロードした`google-services.json`を以下に配置:

```
MyProject/
└── Build/
    └── Android/
        └── app/
            └── google-services.json
```

### 8.3 Android Manifest設定

`Config/Android/AndroidManifest.xml`に以下が自動追加されます（Plugin内部処理）:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 8.4 パッケージング

Package Project > Android > Package for Distribution

## 9. エラーハンドリング（3分）

### 9.1 C++でのエラーハンドリング

```cpp
void AMyGameMode::BeginPlay()
{
    Super::BeginPlay();

    UPushNotificationSubsystem* PushNotification =
        GetGameInstance()->GetSubsystem<UPushNotificationSubsystem>();

    // エラーハンドラー設定
    PushNotification->OnError.AddLambda([](const FPushNotificationError& Error)
    {
        UE_LOG(LogTemp, Error, TEXT("[Push SDK] Error %s: %s"),
            *UEnum::GetValueAsString(Error.Code), *Error.Message);
    });

    // 初期化
    FPushNotificationConfig Config;
    Config.ApiKey = TEXT("your-api-key-here");
    Config.ApiEndpoint = TEXT("https://api.example.com");

    if (!PushNotification->Initialize(Config))
    {
        UE_LOG(LogTemp, Error, TEXT("SDK initialization failed"));
    }
}
```

### 9.2 Blueprintでのエラーハンドリング

```
Event Init
  ↓
Get Push Notification Subsystem
  ↓
On Error BP (Event) → Assign
  ↓
Print String (In String: "Error: {Error > Message}")
```

## 10. サンプルマップ実行（5分）

Plugin付属のサンプルマップを実行します。

### 10.1 サンプルマップを開く

Content Browser:
```
Plugins > Push Notification Plugin Content > Maps > SampleMap
```

### 10.2 Play

1. Play in Editor (PIE)をクリック
2. "Initialize SDK"ボタンをクリック → Output Logに「SDK Initialized」
3. "Send Test Notification"ボタンをクリック → 疑似通知が表示される
4. "Update Player ID"ボタンをクリック → プレイヤーアカウントIDが紐付けられる

### 10.3 動作確認

Output Logで以下を確認:
```
LogTemp: SDK Initialized
LogTemp: Notification Received: テスト通知
LogTemp: Event ID: 123
LogTemp: Player account linked: player-12345
```

## トラブルシューティング

### Q1. iOS実機でトークンが取得できない

**A1**: 以下を確認してください:
- Apple Developer ProgramでPush Notifications capabilityが有効化されている
- Provisioning Profileが正しく設定されている
- デバイスがインターネット接続されている
- Output Logでエラーメッセージを確認

### Q2. Android実機でFirebase初期化エラーが出る

**A2**: 以下を確認してください:
- `google-services.json`が正しく配置されている
- Firebase Consoleでプロジェクトが作成されている
- Package Nameが一致している
- Firebase Cloud Messaging APIが有効化されている

### Q3. Editor疑似通知が動作しない

**A3**: 以下を確認してください:
- `FPushNotificationConfig.bEnableEditorSimulation = true`が設定されている
- `#if WITH_EDITOR`マクロで囲まれたコードが正しくコンパイルされている
- `FEditorNotificationSimulator::SendNotification()`が正しく呼ばれている

### Q4. Blueprintで通知ハンドラーが呼ばれない

**A4**: 以下を確認してください:
- `OnNotificationReceivedBP`イベントに"Assign"している
- GameInstanceでの初期化が正しく完了している
- Output Logで「SDK Initialized」が表示されている

## 次のステップ

- [データモデル仕様](./data-model.md)で詳細なデータ構造を確認
- [Public API仕様](./contracts/public-api.h)で全APIメソッドを確認
- [Native Bridge仕様](./contracts/native-bridge.md)でプラットフォーム固有実装を確認
- [実装計画](./plan.md)でアーキテクチャと設計を確認

## まとめ

- **30分以内で統合完了**: Plugin有効化 → 3行のC++コードで初期化
- **Blueprint完全対応**: C++なしでも全機能が使用可能
- **Editor疑似通知**: 実機なしでテスト可能
- **エラーハンドリング**: デリゲートで完全制御
- **iOS/Android両対応**: 単一APIで両プラットフォーム対応
