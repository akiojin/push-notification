# Unity Push Notification SDK (English)

This package supplies the Unity side of the cross-platform push-notification solution:

- Wraps the native iOS (`PNPushNotificationSDK`) and Android (`com.push.notificationsdk.PushNotificationSdk`) SDKs
- Registers device tokens against the backend REST API (`SPEC-2d193ce6`)
- Exposes a simple C# API for Unity / Unreal integration

## Package Layout

```
UnityPushNotification/
└── Packages/
    └── com.akiojin.unity-push-notification/
        ├── package.json
        ├── Runtime/              # Runtime C# API & native bridges
        ├── Editor/               # Unity Test Runner helpers
        └── Tests/Runtime/        # NUnit tests executed in EditMode
```

## Installation (Unity Package Manager)

1. Add this repository as a git dependency pointing to the package path:
   ```json
   {
     "dependencies": {
       "com.akiojin.unity-push-notification": "git+https://github.com/akiojin/push-notification.git?path=unity-sdk/UnityPushNotification/Packages/com.akiojin.unity-push-notification"
     }
   }
   ```
2. Ensure the project also references the native iOS/Android SDK outputs (see repo specs) and the backend service is configured.
3. The package depends on `com.unity.nuget.newtonsoft-json` which is resolved automatically.

## Quick Start

```csharp
using PushNotification.SDK;

public class PushBootstrap : MonoBehaviour
{
    [SerializeField] string apiKey;
    [SerializeField] string backendUrl;

    void Start()
    {
        PushNotificationManager.Configure(apiKey, backendUrl);
        PushNotificationManager.TokenRegistered += OnTokenRegistered;
        PushNotificationManager.NotificationOpened += OnNotificationOpened;
        PushNotificationManager.RequestAuthorization();
    }

    void OnTokenRegistered(string token) => Debug.Log($"Token registered: {token}");
    void OnNotificationOpened(NotificationPayload payload) => Debug.Log(payload.Title);
}
```

## Testing

Run EditMode tests via Unity Test Runner or CLI:
```
/Applications/Unity/Hub/Editor/2022.3.21f1/Unity \
  -projectPath <path-to-project> \
  -runTests -testPlatform editmode \
  -testResults results.xml
```

## Samples

Package Manager → *Unity Push Notification* → **Samples** から「Minimal Setup」をインポートすると、SDK 初期化の基本的な使い方を確認できます。

## Further Reading

- Japanese documentation: [docs/README.ja.md](README.ja.md)
- Backend REST API spec: [`specs/SPEC-2d193ce6`](../../../../specs/SPEC-2d193ce6)
