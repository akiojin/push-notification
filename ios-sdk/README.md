# PushNotificationSDK (iOS)

iOS 13+ 対応の Push 通知 SDK。Swift Package Manager 対応。

## インストール

### Swift Package Manager

`Package.swift` に依存関係を追加します。

```swift
.package(url: "https://github.com/akiojin/push-notification.git", .upToNextMinor(from: "0.1.0")),
```

ターゲットに `PushNotificationSDK` を追加してください。

## 初期化サンプル

```swift
import PushNotificationSDK

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let backendURL = URL(string: "https://api.example.com")!
        PushNotificationSDK.shared.configure(apiKey: "API_KEY", backendURL: backendURL)
        PushNotificationSDK.shared.requestAuthorization()
        PushNotificationSDK.shared.delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationSDK.shared.registerDeviceToken(deviceToken)
    }
}
```

## Objective-C / Unity / Unreal 連携

```objective-c
#import <PushNotificationSDK/PushNotificationSDK-Swift.h>

[[PNPushNotificationSDK shared] configureWithAPIKey:@"API_KEY" backendURL:@"https://api.example.com"];
[[PNPushNotificationSDK shared] requestAuthorization];
```

## テスト

```bash
swift test
```

テストではトークン変換とレジストラ構成チェックをカバーしています。
