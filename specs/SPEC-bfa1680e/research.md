# Phase 0: 技術リサーチ

**機能ID**: SPEC-bfa1680e
**日付**: 2025-10-30

このドキュメントは、Unreal Engine Push通知Pluginの実装における技術選択の根拠と代替案の評価を記録します。

## リサーチ1: Unreal Native Platform統合パターン

### 決定
iOS: Platform File（.mm Objective-C++）、Android: JNI（Java Native Interface）

### 理由
- Unreal Engine公式推奨パターン
- プラットフォーム自動検出（PLATFORM_IOS、PLATFORM_ANDROID）
- C++17準拠
- ビルド時の自動ライブラリ埋め込み（Binaries/IOS, Binaries/Android）

### 実装詳細

**iOS Platform File例**（Objective-C++）:
```mm
// IOSPlatformBridge.mm
#if PLATFORM_IOS

#import <Foundation/Foundation.h>
#import "PushNotificationSDK/PushNotificationSDK.h"

void UIOSPlatformBridge::Initialize(const FString& ApiKey, const FString& Endpoint)
{
    NSString* apiKeyNS = ApiKey.GetNSString();
    NSString* endpointNS = Endpoint.GetNSString();

    PushNotificationConfig* config = [[PushNotificationConfig alloc] init];
    config.apiKey = apiKeyNS;
    config.apiEndpoint = endpointNS;
    config.enableLogging = true;

    [[PushNotificationSDK shared] initializeWithConfig:config];
}

FString UIOSPlatformBridge::GetDeviceToken()
{
    NSString* token = [[PushNotificationSDK shared] currentDeviceToken];
    if (token == nil)
    {
        return FString();
    }
    return FString(token);
}

#endif // PLATFORM_IOS
```

**Android JNI例**:
```cpp
// AndroidPlatformBridge.cpp
#if PLATFORM_ANDROID

#include "Android/AndroidJNI.h"
#include "Android/AndroidApplication.h"

void UAndroidPlatformBridge::Initialize(const FString& ApiKey, const FString& Endpoint)
{
    JNIEnv* Env = FAndroidApplication::GetJavaEnv();
    if (Env == nullptr)
    {
        UE_LOG(LogPushNotification, Error, TEXT("Failed to get JNI environment"));
        return;
    }

    jclass JNIClass = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
    if (JNIClass == nullptr)
    {
        UE_LOG(LogPushNotification, Error, TEXT("Failed to find PushNotificationJNI class"));
        return;
    }

    jmethodID InitMethod = Env->GetStaticMethodID(JNIClass, "initialize", "(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Z)V");
    if (InitMethod == nullptr)
    {
        UE_LOG(LogPushNotification, Error, TEXT("Failed to find initialize method"));
        return;
    }

    jobject Activity = FAndroidApplication::GetGameActivityThis();
    jstring ApiKeyJava = Env->NewStringUTF(TCHAR_TO_UTF8(*ApiKey));
    jstring EndpointJava = Env->NewStringUTF(TCHAR_TO_UTF8(*Endpoint));

    Env->CallStaticVoidMethod(JNIClass, InitMethod, Activity, ApiKeyJava, EndpointJava, JNI_TRUE);

    Env->DeleteLocalRef(ApiKeyJava);
    Env->DeleteLocalRef(EndpointJava);
    Env->DeleteLocalRef(JNIClass);
}

FString UAndroidPlatformBridge::GetDeviceToken()
{
    JNIEnv* Env = FAndroidApplication::GetJavaEnv();
    if (Env == nullptr)
    {
        return FString();
    }

    jclass JNIClass = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
    if (JNIClass == nullptr)
    {
        return FString();
    }

    jmethodID GetTokenMethod = Env->GetStaticMethodID(JNIClass, "getCurrentToken", "()Ljava/lang/String;");
    if (GetTokenMethod == nullptr)
    {
        Env->DeleteLocalRef(JNIClass);
        return FString();
    }

    jstring TokenJava = (jstring)Env->CallStaticObjectMethod(JNIClass, GetTokenMethod);
    FString Token;
    if (TokenJava != nullptr)
    {
        const char* TokenChars = Env->GetStringUTFChars(TokenJava, nullptr);
        Token = FString(UTF8_TO_TCHAR(TokenChars));
        Env->ReleaseStringUTFChars(TokenJava, TokenChars);
        Env->DeleteLocalRef(TokenJava);
    }

    Env->DeleteLocalRef(JNIClass);
    return Token;
}

#endif // PLATFORM_ANDROID
```

### 検討した代替案
1. **Third Party Libraryラッパー**: Unreal推奨外、複雑すぎる
2. **Unreal Online Subsystem拡張**: オーバースペック、Push通知に不適
3. **外部プロセス通信**: オーバーヘッド大、リアルタイム性欠如

## リサーチ2: ゲームスレッドコールバック実装

### 決定
GameThreadDispatcher + TQueue<TFunction<void()>> + Tick()

### 理由
- Unreal API制約: 非ゲームスレッドからUnreal APIを呼び出すとクラッシュ
- Native SDK通知コールバックは別スレッドで実行される
- TQueueでスレッドセーフ実装
- Tick()で毎フレームキューをポーリング→ゲームスレッド実行

### 実装詳細

```cpp
// GameThreadDispatcher.h
class PUSHNOTIFICATIONPLUGIN_API FGameThreadDispatcher
{
public:
    static FGameThreadDispatcher& Get();

    void Initialize();
    void Tick(float DeltaTime);
    void Enqueue(TFunction<void()> Function);

private:
    FGameThreadDispatcher() = default;

    TQueue<TFunction<void()>> ExecutionQueue;
    FCriticalSection QueueLock;
};

// GameThreadDispatcher.cpp
void FGameThreadDispatcher::Initialize()
{
    // FTickerDelegate登録（毎フレーム実行）
    FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateLambda([this](float DeltaTime)
    {
        this->Tick(DeltaTime);
        return true; // 継続実行
    }));
}

void FGameThreadDispatcher::Tick(float DeltaTime)
{
    TFunction<void()> Function;
    while (ExecutionQueue.Dequeue(Function))
    {
        Function();
    }
}

void FGameThreadDispatcher::Enqueue(TFunction<void()> Function)
{
    ExecutionQueue.Enqueue(MoveTemp(Function));
}
```

**使用例**（Native SDKコールバック）:
```cpp
// Native SDKからのコールバック（別スレッド）
void OnNotificationReceivedNative(const FString& JsonData)
{
    FGameThreadDispatcher::Get().Enqueue([JsonData]()
    {
        // ゲームスレッドで実行
        FPushNotificationData Data;
        if (FJsonObjectConverter::JsonObjectStringToUStruct(JsonData, &Data))
        {
            UPushNotificationSubsystem::Get()->BroadcastNotificationReceived(Data);
        }
    });
}
```

### 検討した代替案
1. **FRunnable**: Unreal推奨外、スレッドプール管理複雑
2. **AsyncTask**: 非同期開始不可（GameThreadからのみ）
3. **Unreal Coroutines**: オーバースペック、通知処理に不適

## リサーチ3: Unreal Editor疑似通知実装

### 決定
EditorPlatformBridge（IPlatformBridge実装）+ Editor Utility Widget

### 理由
- 実機なしで開発者が動作確認可能（開発サイクル短縮）
- 通知データを手動入力して送信可能
- Editor専用Build.cs分離（Runtime非依存）
- 疑似トークン自動生成（GUID）

### 実装詳細

**EditorPlatformBridge**:
```cpp
// EditorPlatformBridge.h
#if WITH_EDITOR

class PUSHNOTIFICATIONPLUGIN_API FEditorPlatformBridge : public IPlatformBridge
{
public:
    virtual void Initialize(const FString& ApiKey, const FString& Endpoint) override;
    virtual FString GetDeviceToken() const override;
    virtual void RegisterToken(const FString& Token) override;
    virtual void SetNotificationCallback(TFunction<void(FString)> Callback) override;
    virtual void UpdatePlayerAccountId(const FString& PlayerId) override;
    virtual void UnregisterToken() override;
    virtual EPlatformType GetPlatformType() const override;

    // Editor専用：疑似通知送信
    static void SimulatePushNotification(const FString& JsonData);

private:
    static FString MockToken;
    static TFunction<void(FString)> NotificationCallback;
};

// EditorPlatformBridge.cpp
FString FEditorPlatformBridge::MockToken = FGuid::NewGuid().ToString();
TFunction<void(FString)> FEditorPlatformBridge::NotificationCallback;

void FEditorPlatformBridge::Initialize(const FString& ApiKey, const FString& Endpoint)
{
    UE_LOG(LogPushNotification, Log, TEXT("[Editor] Mock SDK initialized: %s, %s"), *ApiKey, *Endpoint);
}

FString FEditorPlatformBridge::GetDeviceToken() const
{
    return MockToken;
}

void FEditorPlatformBridge::SimulatePushNotification(const FString& JsonData)
{
    if (NotificationCallback)
    {
        NotificationCallback(JsonData);
    }
}

#endif // WITH_EDITOR
```

**EditorNotificationToolbar**（Editor Utility Widget）:
```cpp
// EditorNotificationToolbar.h
#if WITH_EDITOR

#include "EditorUtilityWidget.h"
#include "EditorNotificationToolbar.generated.h"

UCLASS()
class PUSHNOTIFICATIONPLUGINEDITOR_API UEditorNotificationToolbar : public UEditorUtilityWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Push Notification")
    FString Title = TEXT("Test Notification");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Push Notification")
    FString Body = TEXT("This is a test notification");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Push Notification")
    FString ImageUrl;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Push Notification")
    TMap<FString, FString> CustomData;

    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    void SendNotification();
};

// EditorNotificationToolbar.cpp
void UEditorNotificationToolbar::SendNotification()
{
    FPushNotificationData Data;
    Data.Title = Title;
    Data.Body = Body;
    Data.ImageUrl = ImageUrl;
    Data.CustomData = CustomData;
    Data.Timestamp = FDateTime::UtcNow().ToUnixTimestamp();

    FString JsonData;
    if (FJsonObjectConverter::UStructToJsonObjectString(Data, JsonData))
    {
        FEditorPlatformBridge::SimulatePushNotification(JsonData);
        UE_LOG(LogPushNotification, Log, TEXT("[Editor] Simulated notification sent: %s"), *JsonData);
    }
}

#endif // WITH_EDITOR
```

### 検討した代替案
1. **疑似機能なし**: 開発サイクル遅延（実機ビルド毎回必要）
2. **Unreal Remote**: 実機接続必要、セットアップ複雑
3. **Firebase Console手動送信**: Editor統合なし、非効率

## リサーチ4: GameInstance永続化使用（トークン永続化）

### 決定
GameInstanceSubsystem（Unreal標準パターン）

### 理由
- Unreal Engine標準パターン、プラットフォーム横断対応
- GameInstanceライフサイクル（レベル遷移時も保持）
- 暗号化不要（デバイストークンは公開情報）
- シンプルなGetSubsystem<T>()アクセス

### 実装詳細

```cpp
// PushNotificationSubsystem.h
UCLASS()
class PUSHNOTIFICATIONPLUGIN_API UPushNotificationSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    // USubsystem interface
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    void InitializePushNotification(const FPushNotificationConfig& Config);

    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    void UpdatePlayerAccountId(const FString& PlayerId);

    UFUNCTION(BlueprintPure, Category = "Push Notification")
    FString GetCurrentDeviceToken() const { return CachedDeviceToken; }

private:
    FString CachedDeviceToken;
    FString CachedPlayerAccountId;
    TSharedPtr<IPlatformBridge> PlatformBridge;
};

// PushNotificationSubsystem.cpp
void UPushNotificationSubsystem::InitializePushNotification(const FPushNotificationConfig& Config)
{
    // GameInstanceに永続化されるため、レベル遷移時も保持
    PlatformBridge->Initialize(Config.ApiKey, Config.ApiEndpoint);
    CachedDeviceToken = PlatformBridge->GetDeviceToken();
}
```

**アクセス例**:
```cpp
// 任意のゲームコードから
UGameInstance* GameInstance = GetWorld()->GetGameInstance();
UPushNotificationSubsystem* PushNotification = GameInstance->GetSubsystem<UPushNotificationSubsystem>();
PushNotification->InitializePushNotification(Config);
```

### 検討した代替案
1. **SaveGame + SaveGameToSlot**: 複雑、ファイルI/O遅い
2. **暗号化ストレージ**: 不要（デバイストークンは秘密情報でない）
3. **SQLite**: オーバースペック、外部依存追加

## リサーチ5: Plugin配布形式

### 決定
.uplugin形式（Git/Marketplace配布）

### 理由
- Unreal Engine 5.3公式サポート
- 依存関係自動解決（.upluginに記録）
- バージョン管理容易（.uplugin VersionNameフィールド）
- Marketplace配布可能

### .uplugin形式

```json
{
    "FileVersion": 3,
    "Version": 1,
    "VersionName": "1.0.0",
    "FriendlyName": "Push Notification Plugin",
    "Description": "Unreal Engine Push Notification Plugin for iOS/Android",
    "Category": "Messaging",
    "CreatedBy": "Your Company",
    "CreatedByURL": "https://example.com",
    "DocsURL": "https://github.com/example/unreal-push-notification",
    "MarketplaceURL": "",
    "SupportURL": "https://example.com/support",
    "EngineVersion": "5.3.0",
    "CanContainContent": true,
    "IsBetaVersion": false,
    "IsExperimentalVersion": false,
    "Installed": false,
    "Modules": [
        {
            "Name": "PushNotificationPlugin",
            "Type": "Runtime",
            "LoadingPhase": "Default",
            "PlatformAllowList": [
                "IOS",
                "Android",
                "Win64",
                "Mac",
                "Linux"
            ]
        },
        {
            "Name": "PushNotificationPluginEditor",
            "Type": "Editor",
            "LoadingPhase": "Default",
            "PlatformAllowList": [
                "Win64",
                "Mac",
                "Linux"
            ]
        }
    ],
    "Plugins": []
}
```

### インストール方法

**手動インストール**:
1. Plugins/PushNotificationPlugin/にコピー
2. .uprojectを再生成
3. Unreal Editorで有効化

**Git経由**:
1. Plugins/ディレクトリでgit submodule add
2. .uprojectを再生成
3. Unreal Editorで有効化

**Marketplace配布**（将来）:
1. Marketplace申請
2. Epic Games審査
3. 自動インストール対応

### 検討した代替案
1. **C++ Source配布**: 統合複雑、バージョン管理困難
2. **Static Library配布**: プラットフォーム別ビルド必要、非推奨
3. **NuGet/Conan**: Unreal非対応、外部ツール必要

## リサーチ6: Native SDK連携（iOS/Android）

### 決定
Binaries/IOS/PushNotificationSDK.framework、Binaries/Android/libs/push-notification-sdk.aar

### 理由
- Unreal自動ビルド統合（Binaries/フォルダ自動検出）
- ビルド時に自動埋め込み（iOS: Xcode、Android: Gradle）
- Platform File/JNI透過的呼び出し
- バージョン管理容易（Git LFS使用推奨）

### ディレクトリ構造

```
Binaries/
├── IOS/
│   └── PushNotificationSDK.framework/
│       ├── PushNotificationSDK（バイナリ）
│       ├── Headers/
│       │   └── PushNotificationSDK.h
│       └── Info.plist
└── Android/
    └── libs/
        └── push-notification-sdk.aar
```

### Unreal Build.cs設定

**iOS .framework埋め込み**:
```csharp
// PushNotificationPlugin.Build.cs
if (Target.Platform == UnrealTargetPlatform.IOS)
{
    string FrameworkPath = Path.Combine(ModuleDirectory, "../../Binaries/IOS/PushNotificationSDK.framework");

    PublicAdditionalFrameworks.Add(
        new Framework(
            "PushNotificationSDK",
            FrameworkPath
        )
    );

    PublicSystemLibraries.Add("c++");
}
```

**Android .aar埋め込み**（UPL XML）:
```xml
<!-- PushNotificationPlugin_UPL.xml -->
<root xmlns:android="http://schemas.android.com/apk/res/android">
    <resourceCopies>
        <copyFile src="$S(PluginDir)/Binaries/Android/libs/push-notification-sdk.aar"
                  dst="$S(BuildDir)/libs/push-notification-sdk.aar"/>
    </resourceCopies>

    <buildGradleAdditions>
        <insert>
            dependencies {
                implementation fileTree(dir: 'libs', include: ['*.aar'])
            }
        </insert>
    </buildGradleAdditions>
</root>
```

### 検討した代替案
1. **ソースコード埋め込み**: Swiftコンパイラ不要、複雑
2. **CocoaPods/Gradle依存**: ビルド時ダウンロード必要、オフライン不可
3. **.a/.so形式**: C/C++のみ、Swift/Kotlin非対応

## まとめ

すべてのリサーチタスクが完了し、技術選択が決定されました。

**主要な技術選択**:
1. ✅ Unreal Native Platform統合: Platform File（iOS）+ JNI（Android）
2. ✅ ゲームスレッドコールバック: GameThreadDispatcher + TQueue<TFunction>
3. ✅ Editor疑似通知: EditorPlatformBridge + Editor Utility Widget
4. ✅ 永続化: GameInstanceSubsystem
5. ✅ 配布形式: .uplugin（Git/Marketplace）
6. ✅ Native SDK連携: Binaries/IOS, Binaries/Android

次のステップ: Phase 1（Design & Contracts）へ進む。
