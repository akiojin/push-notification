# Native SDK Bridge 仕様

**機能ID**: SPEC-9c11b38c
**日付**: 2025-10-30

このドキュメントは、Unity C#からiOS/Android Native SDKを呼び出すためのブリッジ仕様を定義します。

## 概要

Unity Pluginは、iOS Native SDK（SPEC-58d1c0d1）とAndroid Native SDK（SPEC-628d6000）を以下の方法で呼び出します：

- **iOS**: DllImport（P/Invoke）- Extern C関数呼び出し
- **Android**: AndroidJavaClass（JNI）- Java静的メソッド呼び出し

## iOS Bridge仕様（DllImport）

### 前提条件
- iOS Native SDK（SPEC-58d1c0d1）が`.framework`形式で提供される
- `Plugins/iOS/PushNotificationSDK.framework/`に配置
- `PushNotificationSDK.h`にExtern C関数が定義される

### C#側DllImport宣言

```csharp
#if UNITY_IOS && !UNITY_EDITOR
using System.Runtime.InteropServices;

internal class IOSBridge : IPlatformBridge
{
    // SDK初期化
    [DllImport("__Internal")]
    private static extern void PushSDK_Initialize(string apiKey, string endpoint, bool enableLogging);

    // デバイストークン取得
    [DllImport("__Internal")]
    private static extern string PushSDK_GetDeviceToken();

    // デバイストークン登録
    [DllImport("__Internal")]
    private static extern void PushSDK_RegisterToken(string token);

    // プレイヤーアカウントID更新
    [DllImport("__Internal")]
    private static extern void PushSDK_UpdatePlayerAccountId(string playerId);

    // トークン登録解除
    [DllImport("__Internal")]
    private static extern void PushSDK_UnregisterToken();

    // 通知コールバック設定
    [DllImport("__Internal")]
    private static extern void PushSDK_SetNotificationCallback(NotificationCallback callback);

    // コールバック型定義
    public delegate void NotificationCallback(string jsonData);
}
#endif
```

### iOS Native SDK（Extern C）側実装仕様

**PushNotificationSDK.h**:
```objective-c
#ifdef __cplusplus
extern "C" {
#endif

// コールバック型定義
typedef void (*NotificationCallback)(const char* jsonData);

// SDK初期化
void PushSDK_Initialize(const char* apiKey, const char* endpoint, bool enableLogging);

// デバイストークン取得（即座に返す、未取得の場合NULL）
const char* PushSDK_GetDeviceToken();

// デバイストークン登録（非同期、内部でREST API呼び出し）
void PushSDK_RegisterToken(const char* token);

// プレイヤーアカウントID更新（非同期）
void PushSDK_UpdatePlayerAccountId(const char* playerId);

// トークン登録解除（非同期）
void PushSDK_UnregisterToken();

// 通知コールバック設定
void PushSDK_SetNotificationCallback(NotificationCallback callback);

#ifdef __cplusplus
}
#endif
```

### iOS実装例（Swift → Extern C）

```swift
import Foundation

// グローバルコールバック（Extern Cからアクセス可能）
private var g_notificationCallback: NotificationCallback? = nil

@_cdecl("PushSDK_Initialize")
public func PushSDK_Initialize(
    apiKey: UnsafePointer<CChar>,
    endpoint: UnsafePointer<CChar>,
    enableLogging: Bool
) {
    let apiKeyString = String(cString: apiKey)
    let endpointString = String(cString: endpoint)

    let config = PushNotificationConfig(
        apiKey: apiKeyString,
        apiEndpoint: endpointString,
        enableLogging: enableLogging
    )

    PushNotificationSDK.initialize(config: config)
}

@_cdecl("PushSDK_GetDeviceToken")
public func PushSDK_GetDeviceToken() -> UnsafePointer<CChar>? {
    guard let token = PushNotificationSDK.currentDeviceToken else {
        return nil
    }
    return strdup(token)
}

@_cdecl("PushSDK_SetNotificationCallback")
public func PushSDK_SetNotificationCallback(callback: @escaping NotificationCallback) {
    g_notificationCallback = callback

    PushNotificationSDK.setNotificationHandler { data in
        let jsonData = try? JSONEncoder().encode(data)
        if let jsonString = String(data: jsonData!, encoding: .utf8) {
            callback(strdup(jsonString))
        }
    }
}
```

### メモリ管理注意事項

- **文字列返却**: `strdup()`で確保、C#側で解放不要（GCが自動管理）
- **コールバック**: グローバル変数で保持（ARC対象外）
- **引数文字列**: `String(cString:)`で即座にコピー

## Android Bridge仕様（AndroidJavaClass）

### 前提条件
- Android Native SDK（SPEC-628d6000）が`.aar`形式で提供される
- `Plugins/Android/push-notification-sdk.aar`に配置
- JNIブリッジクラス`PushNotificationJNI`が提供される

### C#側AndroidJavaClass使用

```csharp
#if UNITY_ANDROID && !UNITY_EDITOR
using UnityEngine;

internal class AndroidBridge : IPlatformBridge
{
    private AndroidJavaClass _jniClass;
    private AndroidJavaObject _activity;

    public AndroidBridge()
    {
        // UnityPlayerActivity取得
        _activity = new AndroidJavaClass("com.unity3d.player.UnityPlayer")
            .GetStatic<AndroidJavaObject>("currentActivity");

        // JNIブリッジクラス取得
        _jniClass = new AndroidJavaClass("com.example.pushnotification.PushNotificationJNI");
    }

    public void Initialize(string apiKey, string endpoint)
    {
        _jniClass.CallStatic("initialize", _activity, apiKey, endpoint, true);
    }

    public string GetDeviceToken()
    {
        return _jniClass.CallStatic<string>("getCurrentToken");
    }

    public void RegisterToken(string token)
    {
        _jniClass.CallStatic("registerToken", token);
    }

    public void UpdatePlayerAccountId(string playerId)
    {
        _jniClass.CallStatic("updatePlayerAccountId", playerId);
    }

    public void UnregisterToken()
    {
        _jniClass.CallStatic("unregisterToken");
    }

    public void SetNotificationCallback(Action<string> callback)
    {
        _jniClass.CallStatic("setNotificationCallback", new NotificationCallbackProxy(callback));
    }

    // Javaコールバック用プロキシ
    private class NotificationCallbackProxy : AndroidJavaProxy
    {
        private readonly Action<string> _callback;

        public NotificationCallbackProxy(Action<string> callback)
            : base("com.example.pushnotification.NotificationCallback")
        {
            _callback = callback;
        }

        // Javaから呼ばれるメソッド
        public void onNotificationReceived(string jsonData)
        {
            MainThreadDispatcher.Enqueue(() => _callback(jsonData));
        }
    }
}
#endif
```

### Android Native SDK（JNI）側実装仕様

**PushNotificationJNI.kt**:
```kotlin
package com.example.pushnotification

import android.content.Context
import com.example.pushnotification.config.SDKConfig

object PushNotificationJNI {

    // コールバックインターフェース
    interface NotificationCallback {
        fun onNotificationReceived(jsonData: String)
    }

    private var notificationCallback: NotificationCallback? = null

    /**
     * SDK初期化（Unity C#から呼び出し）
     *
     * @param context Androidコンテキスト（UnityPlayerActivity）
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
     * デバイストークン取得（Unity C#から呼び出し）
     *
     * @return デバイストークン（未取得の場合null）
     */
    @JvmStatic
    fun getCurrentToken(): String? {
        return PushNotificationSDK.getCurrentToken()
    }

    /**
     * デバイストークン登録（Unity C#から呼び出し）
     *
     * @param token デバイストークン
     */
    @JvmStatic
    fun registerToken(token: String) {
        // 内部でREST API呼び出し
        PushNotificationSDK.registerToken(token)
    }

    /**
     * プレイヤーアカウントID更新（Unity C#から呼び出し）
     *
     * @param playerId プレイヤーアカウントID
     */
    @JvmStatic
    fun updatePlayerAccountId(playerId: String) {
        PushNotificationSDK.updatePlayerAccountId(playerId)
    }

    /**
     * トークン登録解除（Unity C#から呼び出し）
     */
    @JvmStatic
    fun unregisterToken() {
        PushNotificationSDK.unregisterToken()
    }

    /**
     * 通知コールバック設定（Unity C#から呼び出し）
     *
     * @param callback NotificationCallbackインターフェース実装
     */
    @JvmStatic
    fun setNotificationCallback(callback: NotificationCallback) {
        notificationCallback = callback

        PushNotificationSDK.setNotificationHandler(object : NotificationHandler {
            override fun onNotificationReceived(data: NotificationData) {
                val jsonData = Gson().toJson(data)
                callback.onNotificationReceived(jsonData)
            }

            override fun onNotificationOpened(data: NotificationData) {
                val jsonData = Gson().toJson(data)
                callback.onNotificationReceived(jsonData)
            }
        })
    }
}
```

### スレッド処理注意事項

- **JNI呼び出し**: Unityメインスレッドから実行
- **コールバック**: Android別スレッドから呼ばれる
- **MainThreadDispatcher**: C#側でメインスレッドに戻す

## Unity Editor Bridge仕様（疑似実装）

### 前提条件
- Native SDKなし（すべて疑似実装）
- EditorWindowで疑似通知UI提供

### C#側Editor実装

```csharp
#if UNITY_EDITOR
internal class EditorBridge : IPlatformBridge
{
    private static string _mockToken = System.Guid.NewGuid().ToString();
    private static Action<string> _callback;

    public void Initialize(string apiKey, string endpoint)
    {
        UnityEngine.Debug.Log($"[Editor] Mock SDK initialized: {apiKey}, {endpoint}");
    }

    public string GetDeviceToken()
    {
        return _mockToken;
    }

    public void RegisterToken(string token)
    {
        UnityEngine.Debug.Log($"[Editor] Mock token registered: {token}");
    }

    public void UpdatePlayerAccountId(string playerId)
    {
        UnityEngine.Debug.Log($"[Editor] Mock player ID updated: {playerId}");
    }

    public void UnregisterToken()
    {
        UnityEngine.Debug.Log("[Editor] Mock token unregistered");
    }

    public void SetNotificationCallback(Action<string> callback)
    {
        _callback = callback;
    }

    public PlatformType GetPlatformType()
    {
        return PlatformType.Editor;
    }

    // EditorWindowから呼び出し
    public static void SimulateNotification(string jsonData)
    {
        _callback?.Invoke(jsonData);
    }
}
#endif
```

## JSON通信フォーマット

### 通知データJSON（Native SDK → Unity）

```json
{
  "id": "notification-abc123",
  "title": "イベント開始！",
  "body": "限定イベントが始まりました",
  "imageUrl": "https://example.com/image.jpg",
  "customData": {
    "screenId": "event",
    "eventId": "123"
  },
  "actions": [
    {
      "id": "action_play",
      "label": "今すぐプレイ",
      "deepLink": "mygame://event/123"
    }
  ],
  "timestamp": 1698675600,
  "badge": 1,
  "sound": "default",
  "channelId": "event_notifications"
}
```

### Unity側デシリアライズ

```csharp
// Native SDKコールバック（別スレッド）
private void OnNativeCallback(string jsonData)
{
    MainThreadDispatcher.Enqueue(() =>
    {
        // メインスレッドでデシリアライズ
        var data = JsonUtility.FromJson<NotificationData>(jsonData);

        // 検証
        if (NotificationDataValidator.Validate(data, out string error))
        {
            _notificationHandler?.Invoke(data);
        }
        else
        {
            Logger.Error($"Invalid notification data: {error}");
        }
    });
}
```

## エラー処理

### iOS側エラー

```swift
@_cdecl("PushSDK_Initialize")
public func PushSDK_Initialize(...) {
    do {
        try PushNotificationSDK.initialize(config: config)
    } catch {
        // エラーログ出力（Unity側にエラー文字列返却不可）
        NSLog("[PushSDK] Initialization failed: \(error)")
    }
}
```

### Android側エラー

```kotlin
@JvmStatic
fun initialize(context: Context, apiKey: String, apiEndpoint: String, enableLogging: Boolean) {
    try {
        val config = SDKConfig(...)
        PushNotificationSDK.initialize(context, config)
    } catch (e: Exception) {
        Log.e("PushSDK", "Initialization failed", e)
        // Unity側にエラー通知（コールバック経由）
    }
}
```

### Unity側エラーハンドリング

```csharp
public void Initialize(string apiKey, string endpoint)
{
    try
    {
        PushSDK_Initialize(apiKey, endpoint, true);
    }
    catch (Exception ex)
    {
        Logger.Exception(ex);
        throw new InvalidOperationException("Failed to initialize Push SDK", ex);
    }
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
- iOS DllImport: オーバーヘッドほぼゼロ
- Android JNI: AndroidJavaObject毎に約100バイト
- JSON文字列: 通知データ1件あたり約1KB

### レスポンスタイム
- DllImport呼び出し: <0.1ms
- JNI呼び出し: <1ms
- MainThreadDispatcher: 次フレーム（最大16ms）

## テスト戦略

### Contract Test
1. iOS DllImport宣言が正しいシグネチャか確認
2. Android JNI呼び出しが正しいクラス/メソッド名か確認
3. JSON文字列が正しくデシリアライズできるか確認

### Integration Test
1. 実iOS実機でDllImport経由SDK呼び出し
2. 実Android実機でJNI経由SDK呼び出し
3. Editor疑似実装動作確認

### Unit Test
1. MainThreadDispatcher動作確認（メインスレッド実行保証）
2. JSONデシリアライズエラーハンドリング
3. プラットフォーム検出ロジック

## まとめ

- **iOS**: DllImport（Extern C関数）- 単純、高速
- **Android**: AndroidJavaClass（JNI）- 若干オーバーヘッド、柔軟
- **Editor**: 疑似実装 - 開発サイクル短縮
- **JSON通信**: プラットフォーム共通フォーマット
- **MainThreadDispatcher**: Native SDKコールバック→Unityメインスレッド変換
