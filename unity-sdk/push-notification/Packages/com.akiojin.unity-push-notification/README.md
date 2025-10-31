# Unity Push Notification SDK

Unity 2022.3+ 対応の Push 通知 SDK パッケージです。iOS/Android のネイティブ SDK と REST バックエンドを橋渡しします。

## 構成

```
Packages/
└── com.akiojin.unity-push-notification/
    ├── package.json           # Unity Package Manager 用メタデータ
    ├── Runtime/               # ランタイムコード (C#)
    ├── Editor/                # Unity Test Runner などのエディタ拡張
    └── Tests/Runtime/         # NUnit テスト (Unity Test Framework)
```

## インストール

1. このリポジトリをサブモジュールとして追加、または `unity-sdk` フォルダを `Packages/` にコピー
2. `Packages/manifest.json` に以下を追加

```json
"com.akiojin.unity-push-notification": "file:../unity-sdk/push-notification/Packages/com.akiojin.unity-push-notification"
```

3. プロジェクトに `com.unity.nuget.newtonsoft-json` 依存が追加されます

## 初期化方法

```csharp
using PushNotification.SDK;

public class PushBootstrap : MonoBehaviour
{
    [SerializeField] private string apiKey;
    [SerializeField] private string backendUrl;

    private void Start()
    {
        PushNotificationManager.Configure(apiKey, backendUrl);
        PushNotificationManager.TokenRegistered += OnTokenRegistered;
        PushNotificationManager.NotificationOpened += OnNotificationOpened;
        PushNotificationManager.RequestAuthorization();
    }

    private void OnTokenRegistered(string token)
    {
        Debug.Log($"Registered token: {token}");
    }

    private void OnNotificationOpened(NotificationPayload payload)
    {
        Debug.Log($"Notification opened: {payload.Title}");
    }
}
```

- iOS では内部で `PNPushNotificationSDK` (Objective-C ブリッジ) を呼び出します
- Android では `com.push.notificationsdk.PushNotificationSdk` を呼び出し、FCM トークンを取得

## ビルド前提

- Unity 2022.3 LTS 以降
- iOS: Xcode 14+, Swift Package `PushNotificationSDK` を Xcode プロジェクトにリンク
- Android: `android-sdk` モジュールを AAR としてビルドし、Unity の `Plugins/Android` に配置

## テスト

Unity Test Runner (Edit Mode) で `unity-sdk/Tests/Runtime` の NUnit テストを実行できます。

```bash
# Unity CLI 例
/Applications/Unity/Hub/Editor/2022.3.21f1/Unity -runTests -testResults results.xml -projectPath <path> -testPlatform editmode
```

## 今後のTODO

- ネイティブ側から通知データを逆流させるコールバックブリッジ
- Android 通知チャネル設定のカスタマイズ
- Offline/Retry ロジックと PlayerAccountId 連携
