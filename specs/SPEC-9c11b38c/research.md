# Phase 0: 技術リサーチ

**機能ID**: SPEC-9c11b38c
**日付**: 2025-10-30

このドキュメントは、Unity Push通知Pluginの実装における技術選択の根拠と代替案の評価を記録します。

## リサーチ1: Unity Native Plugin統合パターン

### 決定
iOS: DllImport（P/Invoke）、Android: AndroidJavaClass（JNI）

### 理由
- Unity公式推奨パターン
- プラットフォーム自動検出（Application.platform使用）
- .NET Standard 2.1準拠
- ビルド時の自動ライブラリ埋め込み（Plugins/iOS, Plugins/Android）

### 実装詳細

**iOS DllImport例**:
```csharp
#if UNITY_IOS && !UNITY_EDITOR
using System.Runtime.InteropServices;

public class IOSBridge : IPlatformBridge
{
    [DllImport("__Internal")]
    private static extern void PushSDK_Initialize(string apiKey, string endpoint);

    [DllImport("__Internal")]
    private static extern string PushSDK_GetDeviceToken();

    public void Initialize(string apiKey, string endpoint)
    {
        PushSDK_Initialize(apiKey, endpoint);
    }

    public string GetDeviceToken()
    {
        return PushSDK_GetDeviceToken();
    }
}
#endif
```

**Android AndroidJavaClass例**:
```csharp
#if UNITY_ANDROID && !UNITY_EDITOR
using UnityEngine;

public class AndroidBridge : IPlatformBridge
{
    private AndroidJavaClass _jniClass;
    private AndroidJavaObject _activity;

    public void Initialize(string apiKey, string endpoint)
    {
        _activity = new AndroidJavaClass("com.unity3d.player.UnityPlayer")
            .GetStatic<AndroidJavaObject>("currentActivity");

        _jniClass = new AndroidJavaClass("com.example.pushnotification.PushNotificationJNI");
        _jniClass.CallStatic("initialize", _activity, apiKey, endpoint, true);
    }

    public string GetDeviceToken()
    {
        return _jniClass.CallStatic<string>("getCurrentToken");
    }
}
#endif
```

### 検討した代替案
1. **UnityPlayerActivity継承**: Android専用、iOS対応不可、複雑すぎる
2. **Unity Native Plugin API**: 非推奨（Unity 2019以前）
3. **外部プロセス通信**: オーバーヘッド大、リアルタイム性欠如

## リサーチ2: メインスレッドコールバック実装

### 決定
MainThreadDispatcherシングルトン + Queue<Action> + Unity Update()

### 理由
- Unity API制約: 非メインスレッドからUnity APIを呼び出すとクラッシュ
- Native SDK通知コールバックは別スレッドで実行される
- Queueでスレッドセーフ実装
- Update()で毎フレームキューをポーリング→メインスレッド実行

### 実装詳細

```csharp
public class MainThreadDispatcher : MonoBehaviour
{
    private static MainThreadDispatcher _instance;
    private static readonly Queue<Action> _executionQueue = new Queue<Action>();

    public static void Initialize()
    {
        if (_instance == null)
        {
            var go = new GameObject("MainThreadDispatcher");
            _instance = go.AddComponent<MainThreadDispatcher>();
            DontDestroyOnLoad(go);
        }
    }

    public static void Enqueue(Action action)
    {
        lock (_executionQueue)
        {
            _executionQueue.Enqueue(action);
        }
    }

    private void Update()
    {
        lock (_executionQueue)
        {
            while (_executionQueue.Count > 0)
            {
                _executionQueue.Dequeue().Invoke();
            }
        }
    }
}
```

**使用例**（Native SDKコールバック）:
```csharp
// Native SDKからのコールバック（別スレッド）
public void OnNotificationReceived(string jsonData)
{
    MainThreadDispatcher.Enqueue(() =>
    {
        // メインスレッドで実行
        var data = JsonUtility.FromJson<NotificationData>(jsonData);
        _notificationHandler?.Invoke(data);
    });
}
```

### 検討した代替案
1. **SynchronizationContext**: Unity非対応、.NET Standard 2.1でも不安定
2. **Coroutine**: 非同期開始不可（MonoBehaviourからのみ）
3. **Unity JobSystem**: オーバースペック、通知処理に不適

## リサーチ3: Unity Editor疑似通知実装

### 決定
EditorBridge（IPlatformBridge実装）+ EditorWindow疑似UI

### 理由
- 実機なしで開発者が動作確認可能（開発サイクル短縮）
- 通知データを手動入力して送信可能
- Editor専用asmdef分離（Runtime非依存）
- 疑似トークン自動生成（UUID）

### 実装詳細

**EditorBridge**:
```csharp
#if UNITY_EDITOR
public class EditorBridge : IPlatformBridge
{
    private static string _mockToken = System.Guid.NewGuid().ToString();
    private static Action<string> _callback;

    public void Initialize(string apiKey, string endpoint)
    {
        Debug.Log($"[Editor] Mock SDK initialized: {apiKey}, {endpoint}");
    }

    public string GetDeviceToken()
    {
        return _mockToken;
    }

    public void SetNotificationCallback(Action<string> callback)
    {
        _callback = callback;
    }

    // EditorWindowから呼び出し
    public static void SimulatePushNotification(string jsonData)
    {
        _callback?.Invoke(jsonData);
    }
}
#endif
```

**EditorNotificationWindow**:
```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

public class EditorNotificationWindow : EditorWindow
{
    private string _title = "Test Notification";
    private string _body = "This is a test notification";
    private string _imageUrl = "";
    private string _customData = "{\"screenId\":\"event\"}";

    [MenuItem("Window/Push Notification/Simulator")]
    public static void ShowWindow()
    {
        GetWindow<EditorNotificationWindow>("Push Notification Simulator");
    }

    private void OnGUI()
    {
        GUILayout.Label("Push Notification Simulator", EditorStyles.boldLabel);

        _title = EditorGUILayout.TextField("Title", _title);
        _body = EditorGUILayout.TextArea(_body, GUILayout.Height(60));
        _imageUrl = EditorGUILayout.TextField("Image URL", _imageUrl);
        _customData = EditorGUILayout.TextArea(_customData, GUILayout.Height(40));

        if (GUILayout.Button("Send Notification"))
        {
            var json = JsonUtility.ToJson(new NotificationData
            {
                title = _title,
                body = _body,
                imageUrl = _imageUrl,
                customData = JsonUtility.FromJson<Dictionary<string, string>>(_customData)
            });

            EditorBridge.SimulatePushNotification(json);
        }
    }
}
#endif
```

### 検討した代替案
1. **疑似機能なし**: 開発サイクル遅延（実機ビルド毎回必要）
2. **Unity Remote**: 実機接続必要、セットアップ複雑
3. **Firebase Console手動送信**: Editor統合なし、非効率

## リサーチ4: PlayerPrefs使用（トークン永続化）

### 決定
PlayerPrefs（Unity標準API）

### 理由
- Unity標準API、プラットフォーム横断対応
- iOS: NSUserDefaults、Android: SharedPreferences自動マッピング
- 暗号化不要（デバイストークンは公開情報）
- シンプルなKey-Value API

### 実装詳細

```csharp
public class TokenStorage
{
    private const string KEY_DEVICE_TOKEN = "PushSDK_DeviceToken";
    private const string KEY_PLAYER_ID = "PushSDK_PlayerId";

    public static void SaveDeviceToken(string token)
    {
        PlayerPrefs.SetString(KEY_DEVICE_TOKEN, token);
        PlayerPrefs.Save();
    }

    public static string LoadDeviceToken()
    {
        return PlayerPrefs.GetString(KEY_DEVICE_TOKEN, null);
    }

    public static void SavePlayerAccountId(string playerId)
    {
        PlayerPrefs.SetString(KEY_PLAYER_ID, playerId);
        PlayerPrefs.Save();
    }

    public static void Clear()
    {
        PlayerPrefs.DeleteKey(KEY_DEVICE_TOKEN);
        PlayerPrefs.DeleteKey(KEY_PLAYER_ID);
        PlayerPrefs.Save();
    }
}
```

### 検討した代替案
1. **JsonUtility + Application.persistentDataPath**: 複雑、ファイルI/O遅い
2. **暗号化ストレージ**: 不要（デバイストークンは秘密情報でない）
3. **SQLite**: オーバースペック、外部依存追加

## リサーチ5: Unity Package Manager（UPM）配布形式

### 決定
Git URL経由インストール（package.json）

### 理由
- Unity 2021.3 LTS公式サポート
- 依存関係自動解決（manifestに記録）
- バージョン管理容易（Gitタグ使用）
- .unitypackageより更新簡単

### package.json形式

```json
{
  "name": "com.example.push-notification",
  "version": "1.0.0",
  "displayName": "Push Notification Plugin",
  "description": "Unity Push Notification Plugin for iOS/Android",
  "unity": "2021.3",
  "dependencies": {},
  "keywords": [
    "push",
    "notification",
    "fcm",
    "apns",
    "ios",
    "android"
  ],
  "author": {
    "name": "Your Company",
    "email": "support@example.com",
    "url": "https://example.com"
  },
  "samples": [
    {
      "displayName": "Basic Integration",
      "description": "Basic push notification integration sample",
      "path": "Samples~/BasicIntegration"
    }
  ]
}
```

### インストール方法

**Package Manager UI経由**:
1. Window > Package Manager
2. "+" > Add package from git URL
3. URL入力: `https://github.com/example/unity-push-notification.git`

**manifest.json直接編集**:
```json
{
  "dependencies": {
    "com.example.push-notification": "https://github.com/example/unity-push-notification.git#1.0.0"
  }
}
```

### 検討した代替案
1. **.unitypackage**: 更新手動、依存関係解決なし、非推奨
2. **Asset Store配布**: 審査必要、更新遅い
3. **NPM/Scoped Registry**: セットアップ複雑、Unity開発者に不慣れ

## リサーチ6: Native SDK連携（iOS/Android）

### 決定
Plugins/iOS/PushNotificationSDK.framework、Plugins/Android/push-notification-sdk.aar

### 理由
- Unity自動ビルド統合（Plugins/フォルダ自動検出）
- ビルド時に自動埋め込み（iOS: Xcode、Android: Gradle）
- DllImport/JNI透過的呼び出し
- バージョン管理容易（Git LFS使用推奨）

### ディレクトリ構造

```
Plugins/
├── iOS/
│   ├── PushNotificationSDK.framework/
│   │   ├── PushNotificationSDK（バイナリ）
│   │   ├── Headers/
│   │   │   └── PushNotificationSDK.h
│   │   └── Info.plist
│   └── PushNotificationSDK.framework.meta（Unity設定）
└── Android/
    ├── push-notification-sdk.aar
    └── push-notification-sdk.aar.meta（Unity設定）
```

### Unity .meta設定

**iOS .framework.meta**:
```yaml
PluginImporter:
  externalObjects: {}
  serializedVersion: 2
  iconMap: {}
  executionOrder: {}
  defineConstraints: []
  isPreloaded: 0
  isOverridable: 0
  isExplicitlyReferenced: 0
  validateReferences: 1
  platformData:
  - first:
      Any:
    second:
      enabled: 0
      settings: {}
  - first:
      Editor: Editor
    second:
      enabled: 0
      settings:
        DefaultValueInitialized: true
  - first:
      iPhone: iOS
    second:
      enabled: 1
      settings:
        AddToEmbeddedBinaries: false
        CompileFlags:
        FrameworkDependencies:
```

**Android .aar.meta**:
```yaml
PluginImporter:
  externalObjects: {}
  serializedVersion: 2
  iconMap: {}
  executionOrder: {}
  defineConstraints: []
  isPreloaded: 0
  isOverridable: 0
  isExplicitlyReferenced: 0
  validateReferences: 1
  platformData:
  - first:
      Android: Android
    second:
      enabled: 1
      settings: {}
  - first:
      Any:
    second:
      enabled: 0
      settings: {}
  - first:
      Editor: Editor
    second:
      enabled: 0
      settings:
        DefaultValueInitialized: true
```

### 検討した代替案
1. **ソースコード埋め込み**: Swiftコンパイラ不要、複雑
2. **CocoaPods/Gradle依存**: ビルド時ダウンロード必要、オフライン不可
3. **.a/.so形式**: C/C++のみ、Swift/Kotlin非対応

## まとめ

すべてのリサーチタスクが完了し、技術選択が決定されました。

**主要な技術選択**:
1. ✅ Unity Native Plugin統合: DllImport（iOS）+ AndroidJavaClass（Android）
2. ✅ メインスレッドコールバック: MainThreadDispatcher + Queue<Action>
3. ✅ Editor疑似通知: EditorBridge + EditorWindow
4. ✅ 永続化: PlayerPrefs
5. ✅ 配布形式: UPM Git URL
6. ✅ Native SDK連携: Plugins/iOS, Plugins/Android

次のステップ: Phase 1（Design & Contracts）へ進む。
