# Native SDK Bridge 仕様

**機能ID**: SPEC-bfa1680e
**日付**: 2025-10-30

このドキュメントは、Unreal Engine C++からiOS/Android Native SDKを呼び出すためのブリッジ仕様を定義します。

## 概要

Unreal Engine Pluginは、iOS Native SDK（SPEC-58d1c0d1）とAndroid Native SDK（SPEC-628d6000）を以下の方法で呼び出します：

- **iOS**: Platform File（.mm Objective-C++）- Objective-Cブリッジ
- **Android**: JNI（Java Native Interface）- Java/Kotlinブリッジ

## iOS Bridge仕様（Platform File）

### 前提条件
- iOS Native SDK（SPEC-58d1c0d1）が`.framework`形式で提供される
- `Binaries/IOS/PushNotificationSDK.framework/`に配置
- `PushNotificationSDK.framework/Headers/PushNotificationSDK.h`にObjective-C APIが定義される

### C++側実装（.mm Objective-C++）

```mm
// IOSPlatformBridge.mm
#if PLATFORM_IOS

#import <Foundation/Foundation.h>
#import "PushNotificationSDK/PushNotificationSDK.h"

class FIOSPlatformBridge : public IPlatformBridge
{
public:
    virtual void Initialize(const FString& ApiKey, const FString& Endpoint) override
    {
        NSString* apiKeyNS = ApiKey.GetNSString();
        NSString* endpointNS = Endpoint.GetNSString();

        PushNotificationConfig* config = [[PushNotificationConfig alloc] init];
        config.apiKey = apiKeyNS;
        config.apiEndpoint = endpointNS;
        config.enableLogging = true;

        [[PushNotificationSDK shared] initializeWithConfig:config];
    }

    virtual FString GetDeviceToken() const override
    {
        NSString* token = [[PushNotificationSDK shared] currentDeviceToken];
        if (token == nil)
        {
            return FString();
        }
        return FString(token);
    }

    virtual void RegisterToken(const FString& Token) override
    {
        NSString* tokenNS = Token.GetNSString();
        [[PushNotificationSDK shared] registerToken:tokenNS];
    }

    virtual void SetNotificationCallback(TFunction<void(FString)> Callback) override
    {
        NotificationCallback = Callback;

        [[PushNotificationSDK shared] setNotificationHandler:^(NSDictionary* data) {
            NSError* error = nil;
            NSData* jsonData = [NSJSONSerialization dataWithJSONObject:data
                                                               options:0
                                                                 error:&error];
            if (jsonData != nil)
            {
                NSString* jsonString = [[NSString alloc] initWithData:jsonData
                                                              encoding:NSUTF8StringEncoding];
                FString jsonFString = FString(jsonString);

                // ゲームスレッドで実行
                FGameThreadDispatcher::Get().Enqueue([jsonFString, this]()
                {
                    if (NotificationCallback)
                    {
                        NotificationCallback(jsonFString);
                    }
                });
            }
        }];
    }

    virtual void UpdatePlayerAccountId(const FString& PlayerId) override
    {
        NSString* playerIdNS = PlayerId.GetNSString();
        [[PushNotificationSDK shared] updatePlayerAccountId:playerIdNS];
    }

    virtual void UnregisterToken() override
    {
        [[PushNotificationSDK shared] unregisterToken];
    }

    virtual EPlatformType GetPlatformType() const override
    {
        return EPlatformType::IOS;
    }

private:
    TFunction<void(FString)> NotificationCallback;
};

#endif // PLATFORM_IOS
```

### iOS Native SDK（Objective-C）側実装仕様

**PushNotificationSDK.h**:
```objectivec
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PushNotificationConfig : NSObject

@property (nonatomic, strong) NSString* apiKey;
@property (nonatomic, strong) NSString* apiEndpoint;
@property (nonatomic, assign) BOOL enableLogging;

@end

typedef void (^NotificationHandler)(NSDictionary* data);

@interface PushNotificationSDK : NSObject

+ (instancetype)shared;

- (void)initializeWithConfig:(PushNotificationConfig*)config;
- (nullable NSString*)currentDeviceToken;
- (void)registerToken:(NSString*)token;
- (void)setNotificationHandler:(NotificationHandler)handler;
- (void)updatePlayerAccountId:(NSString*)playerId;
- (void)unregisterToken;

@end

NS_ASSUME_NONNULL_END
```

### メモリ管理注意事項

- **ARC対応**: Automatic Reference Counting有効（Unreal標準）
- **NSString変換**: `FString::GetNSString()`、`FString(NSString*)`使用
- **コールバック**: Blockで保持、FGameThreadDispatcher経由でゲームスレッド実行

## Android Bridge仕様（JNI）

### 前提条件
- Android Native SDK（SPEC-628d6000）が`.aar`形式で提供される
- `Binaries/Android/libs/push-notification-sdk.aar`に配置
- JNIブリッジクラス`PushNotificationJNI`が提供される

### C++側JNI実装

```cpp
// AndroidPlatformBridge.cpp
#if PLATFORM_ANDROID

#include "Android/AndroidJNI.h"
#include "Android/AndroidApplication.h"

class FAndroidPlatformBridge : public IPlatformBridge
{
public:
    virtual void Initialize(const FString& ApiKey, const FString& Endpoint) override
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

        jmethodID InitMethod = Env->GetStaticMethodID(JNIClass, "initialize",
            "(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Z)V");
        if (InitMethod == nullptr)
        {
            UE_LOG(LogPushNotification, Error, TEXT("Failed to find initialize method"));
            Env->DeleteLocalRef(JNIClass);
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

    virtual FString GetDeviceToken() const override
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

    virtual void SetNotificationCallback(TFunction<void(FString)> Callback) override
    {
        NotificationCallback = Callback;

        JNIEnv* Env = FAndroidApplication::GetJavaEnv();
        if (Env == nullptr)
        {
            return;
        }

        jclass JNIClass = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
        if (JNIClass == nullptr)
        {
            return;
        }

        // グローバル参照を保持してJNIコールバック登録
        // （実装詳細は省略、JNI_OnLoad経由でC++関数ポインタ登録）

        Env->DeleteLocalRef(JNIClass);
    }

    virtual void UpdatePlayerAccountId(const FString& PlayerId) override
    {
        JNIEnv* Env = FAndroidApplication::GetJavaEnv();
        if (Env == nullptr)
        {
            return;
        }

        jclass JNIClass = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
        if (JNIClass == nullptr)
        {
            return;
        }

        jmethodID UpdateMethod = Env->GetStaticMethodID(JNIClass, "updatePlayerAccountId", "(Ljava/lang/String;)V");
        if (UpdateMethod == nullptr)
        {
            Env->DeleteLocalRef(JNIClass);
            return;
        }

        jstring PlayerIdJava = Env->NewStringUTF(TCHAR_TO_UTF8(*PlayerId));
        Env->CallStaticVoidMethod(JNIClass, UpdateMethod, PlayerIdJava);

        Env->DeleteLocalRef(PlayerIdJava);
        Env->DeleteLocalRef(JNIClass);
    }

    virtual void UnregisterToken() override
    {
        JNIEnv* Env = FAndroidApplication::GetJavaEnv();
        if (Env == nullptr)
        {
            return;
        }

        jclass JNIClass = FAndroidApplication::FindJavaClass("com/example/pushnotification/PushNotificationJNI");
        if (JNIClass == nullptr)
        {
            return;
        }

        jmethodID UnregisterMethod = Env->GetStaticMethodID(JNIClass, "unregisterToken", "()V");
        if (UnregisterMethod == nullptr)
        {
            Env->DeleteLocalRef(JNIClass);
            return;
        }

        Env->CallStaticVoidMethod(JNIClass, UnregisterMethod);
        Env->DeleteLocalRef(JNIClass);
    }

    virtual EPlatformType GetPlatformType() const override
    {
        return EPlatformType::Android;
    }

private:
    TFunction<void(FString)> NotificationCallback;
};

#endif // PLATFORM_ANDROID
```

### Android Native SDK（JNI）側実装仕様

**PushNotificationJNI.kt**:
```kotlin
package com.example.pushnotification

import android.content.Context
import com.example.pushnotification.config.SDKConfig
import com.google.gson.Gson

object PushNotificationJNI {

    /**
     * SDK初期化（Unreal C++から呼び出し）
     *
     * @param context Androidコンテキスト（UnrealゲームActivity）
     * @param apiKey APIキー
     * @param apiEndpoint APIエンドポイント
     * @param enableLogging ロギング有効化フラグ
     */
    @JvmStatic
    fun initialize(context: Context, apiKey: String, apiEndpoint: String, enableLogging: Boolean) {
        val config = SDKConfig(
            apiKey = apiKey,
            apiEndpoint = apiEndpoint,
            enableLogging = enableLogging
        )
        PushNotificationSDK.initialize(context, config)
    }

    /**
     * デバイストークン取得（Unreal C++から呼び出し）
     *
     * @return デバイストークン（未取得の場合null）
     */
    @JvmStatic
    fun getCurrentToken(): String? {
        return PushNotificationSDK.getCurrentToken()
    }

    /**
     * 通知コールバック設定（Unreal C++から呼び出し）
     *
     * JNI経由でC++関数ポインタを受け取り、通知受信時に呼び出す。
     */
    @JvmStatic
    external fun setNotificationCallback()

    /**
     * プレイヤーアカウントID更新（Unreal C++から呼び出し）
     *
     * @param playerId プレイヤーアカウントID
     */
    @JvmStatic
    fun updatePlayerAccountId(playerId: String) {
        PushNotificationSDK.updatePlayerAccountId(playerId)
    }

    /**
     * トークン登録解除（Unreal C++から呼び出し）
     */
    @JvmStatic
    fun unregisterToken() {
        PushNotificationSDK.unregisterToken()
    }

    /**
     * Native→C++コールバック（内部使用）
     */
    private external fun onNotificationReceivedNative(jsonData: String)
}
```

### スレッド処理注意事項

- **JNI呼び出し**: Unrealゲームスレッドから実行
- **コールバック**: Android別スレッドから呼ばれる
- **FGameThreadDispatcher**: C++側でゲームスレッドに戻す

## Unreal Editor Bridge仕様（疑似実装）

### 前提条件
- Native SDKなし（すべて疑似実装）
- Editor Utility Widgetで疑似通知UI提供

### C++側Editor実装

```cpp
// EditorPlatformBridge.cpp
#if WITH_EDITOR

class FEditorPlatformBridge : public IPlatformBridge
{
public:
    virtual void Initialize(const FString& ApiKey, const FString& Endpoint) override
    {
        UE_LOG(LogPushNotification, Log, TEXT("[Editor] Mock SDK initialized: %s, %s"), *ApiKey, *Endpoint);
    }

    virtual FString GetDeviceToken() const override
    {
        return MockToken;
    }

    virtual void RegisterToken(const FString& Token) override
    {
        UE_LOG(LogPushNotification, Log, TEXT("[Editor] Mock token registered: %s"), *Token);
    }

    virtual void SetNotificationCallback(TFunction<void(FString)> Callback) override
    {
        NotificationCallback = Callback;
    }

    virtual void UpdatePlayerAccountId(const FString& PlayerId) override
    {
        UE_LOG(LogPushNotification, Log, TEXT("[Editor] Mock player ID updated: %s"), *PlayerId);
    }

    virtual void UnregisterToken() override
    {
        UE_LOG(LogPushNotification, Log, TEXT("[Editor] Mock token unregistered"));
    }

    virtual EPlatformType GetPlatformType() const override
    {
        return EPlatformType::Editor;
    }

    // Editor専用：疑似通知送信
    static void SimulateNotification(const FString& JsonData)
    {
        if (NotificationCallback)
        {
            NotificationCallback(JsonData);
        }
    }

private:
    static FString MockToken;
    static TFunction<void(FString)> NotificationCallback;
};

FString FEditorPlatformBridge::MockToken = FGuid::NewGuid().ToString();
TFunction<void(FString)> FEditorPlatformBridge::NotificationCallback;

#endif // WITH_EDITOR
```

## JSON通信フォーマット

### 通知データJSON（Native SDK → Unreal）

```json
{
  "Id": "notification-abc123",
  "Title": "イベント開始！",
  "Body": "限定イベントが始まりました",
  "ImageUrl": "https://example.com/image.jpg",
  "CustomData": {
    "screenId": "event",
    "eventId": "123"
  },
  "Actions": [
    {
      "Id": "action_play",
      "Label": "今すぐプレイ",
      "DeepLink": "mygame://event/123"
    }
  ],
  "Timestamp": 1698675600,
  "Badge": 1,
  "Sound": "default",
  "ChannelId": "event_notifications"
}
```

### Unreal側デシリアライズ

```cpp
// Native SDKコールバック（別スレッド）
void OnNativeCallback(const FString& JsonData)
{
    FGameThreadDispatcher::Get().Enqueue([JsonData]()
    {
        // ゲームスレッドでデシリアライズ
        FPushNotificationData Data;
        if (FJsonObjectConverter::JsonObjectStringToUStruct(JsonData, &Data))
        {
            FString Error;
            if (Data.Validate(Error))
            {
                // デリゲートブロードキャスト
                UPushNotificationSubsystem::Get()->OnNotificationReceived.Broadcast(Data);
            }
            else
            {
                UE_LOG(LogPushNotification, Error, TEXT("Invalid notification data: %s"), *Error);
            }
        }
    });
}
```

## パフォーマンス考慮事項

### 呼び出し頻度
- **Initialize**: 1回のみ（起動時）
- **GetDeviceToken**: 必要時のみ（トークン取得後はキャッシュ）
- **SetNotificationCallback**: 1回のみ（初期化直後）
- **UpdatePlayerAccountId**: ログイン時のみ
- **Callback**: 通知受信時のみ（非同期）

### メモリ使用量
- iOS Platform File: オーバーヘッドほぼゼロ
- Android JNI: JNIEnv*毎に約200バイト
- JSON文字列: 通知データ1件あたり約1KB

### レスポンスタイム
- Platform File呼び出し: <0.1ms
- JNI呼び出し: <1ms
- FGameThreadDispatcher: 次フレーム（最大16ms）

## まとめ

- **iOS**: Platform File（.mm Objective-C++）- 単純、高速
- **Android**: JNI（Java Native Interface）- 若干オーバーヘッド、柔軟
- **Editor**: 疑似実装 - 開発サイクル短縮
- **JSON通信**: プラットフォーム共通フォーマット
- **FGameThreadDispatcher**: Native SDKコールバック→Unrealゲームスレッド変換
