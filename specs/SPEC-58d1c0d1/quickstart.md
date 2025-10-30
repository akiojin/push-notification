# クイックスタート: iOS Push通知SDK

**機能ID**: `SPEC-58d1c0d1` | **対象**: iOSゲーム開発者

## 概要

このガイドでは、iOSアプリにPush通知SDKを統合し、実際に通知を受信するまでの手順を説明します。

## 前提条件

- Xcode 14.0以上
- iOS 13.0以上対応のiOSプロジェクト
- Apple Developer Program アカウント（APNs証明書/キー取得のため）
- バックエンドAPIサーバーが稼働している（[SPEC-2d193ce6](../SPEC-2d193ce6/quickstart.md)参照）

## セットアップ

### 1. SDKのインストール

#### Swift Package Manager（推奨）

1. Xcodeでプロジェクトを開く
2. `File` > `Add Packages...` を選択
3. 以下のURLを入力:
   ```
   https://github.com/yourorg/push-notification-sdk-ios.git
   ```
4. `Add Package` をクリック

#### CocoaPods

`Podfile` に以下を追加:

```ruby
platform :ios, '13.0'

target 'YourGameApp' do
  use_frameworks!

  pod 'PushNotificationSDK', '~> 1.0'
end
```

インストール実行:

```bash
pod install
```

---

### 2. APNs設定

#### 2.1 Capabilities追加

1. Xcodeでプロジェクトを選択
2. `Signing & Capabilities` タブを開く
3. `+ Capability` をクリック
4. `Push Notifications` を追加
5. `Background Modes` を追加し、`Remote notifications` にチェック

#### 2.2 APNsキーの取得（Apple Developer Portal）

1. [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list) にログイン
2. `Keys` > `+` ボタンをクリック
3. キー名を入力し、`Apple Push Notifications service (APNs)` にチェック
4. `Continue` > `Register` > `Download` で `.p8` ファイルをダウンロード
5. **Key ID** と **Team ID** をメモ（バックエンド設定で使用）

---

### 3. AppDelegate統合

`AppDelegate.swift` を編集:

```swift
import UIKit
import PushNotificationSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // ========== SDK初期化 ==========
        do {
            let config = try SDKConfiguration(
                apiURL: URL(string: "https://your-api-server.com")!,
                apiKey: "your-api-key-here",              // バックエンドAPIキー
                playerAccountId: "player-12345",           // プレイヤーID（オプション）
                enableLogging: true                        // デバッグログ有効化
            )
            try PushNotificationSDK.configure(config)
            print("✅ Push通知SDK初期化成功")
        } catch {
            print("❌ SDK初期化失敗: \(error)")
            return false
        }

        // ========== 通知許可リクエスト ==========
        PushNotificationSDK.requestNotificationPermission { result in
            switch result {
            case .success(let granted):
                if granted {
                    print("✅ 通知許可が得られました")
                    // デバイストークン取得開始
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                    }
                } else {
                    print("⚠️ 通知が拒否されました")
                }
            case .failure(let error):
                print("❌ 通知許可エラー: \(error.localizedDescription)")
            }
        }

        // ========== 通知受信ハンドラー ==========
        PushNotificationSDK.onNotificationReceived = { [weak self] payload in
            print("📬 通知受信:")
            print("  タイトル: \(payload.title)")
            print("  本文: \(payload.body)")

            // カスタムデータで画面遷移
            if let customData = payload.customData {
                self?.handleCustomData(customData)
            }
        }

        // ========== アクションハンドラー ==========
        PushNotificationSDK.onNotificationActionTapped = { actionId, payload in
            print("🔘 アクションタップ: \(actionId)")

            switch actionId {
            case "CONFIRM":
                print("  → 確認ボタンがタップされました")
                // 確認処理
            case "LATER":
                print("  → 後でボタンがタップされました")
                // リマインダー設定
            default:
                break
            }
        }

        // ========== エラーハンドラー（オプション） ==========
        PushNotificationSDK.onError = { error in
            print("❌ SDKエラー: \(error.localizedDescription)")
            if let suggestion = error.recoverySuggestion {
                print("💡 解決策: \(suggestion)")
            }
        }

        return true
    }

    // デバイストークン取得成功時（自動的にバックエンドに登録される）
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("✅ デバイストークン取得成功")
        // SDK内部で自動的にバックエンドに登録される
    }

    // デバイストークン取得失敗時
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ デバイストークン取得失敗: \(error.localizedDescription)")
    }

    private func handleCustomData(_ customData: [String: Any]) {
        // カスタムデータに基づいて画面遷移
        if let action = customData["action"] as? String {
            switch action {
            case "open_mission":
                if let missionId = customData["missionId"] as? String {
                    navigateToMission(id: missionId)
                }
            case "open_shop":
                navigateToShop()
            default:
                break
            }
        }
    }

    private func navigateToMission(id: String) {
        // ミッション画面に遷移
        print("🎯 ミッション画面に遷移: \(id)")
    }

    private func navigateToShop() {
        // ショップ画面に遷移
        print("🛍️ ショップ画面に遷移")
    }
}
```

---

### 4. 通知送信テスト

#### 4.1 デバイストークンの確認

アプリを実行すると、コンソールに以下のようなログが出力されます:

```
✅ Push通知SDK初期化成功
✅ 通知許可が得られました
✅ デバイストークン取得成功
```

デバイストークンは自動的にバックエンドAPIに登録されます。

#### 4.2 バックエンドから通知送信

ターミナルで以下のcurlコマンドを実行（バックエンドAPIが稼働している必要あり）:

```bash
curl -X POST https://your-api-server.com/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "tokens": ["your-device-token-here"],
    "title": "新しいミッションが利用可能です！",
    "body": "デイリーミッションをチェックしてください",
    "imageUrl": "https://example.com/images/mission.png",
    "customData": {
      "action": "open_mission",
      "missionId": "123"
    }
  }'
```

#### 4.3 通知受信確認

- **フォアグラウンド**: アプリ起動中は `onNotificationReceived` ハンドラーが呼ばれる
- **バックグラウンド**: 通知センターに通知が表示され、タップするとハンドラーが呼ばれる

コンソール出力例:

```
📬 通知受信:
  タイトル: 新しいミッションが利用可能です！
  本文: デイリーミッションをチェックしてください
🎯 ミッション画面に遷移: 123
```

---

## リッチ通知（画像付き通知）のセットアップ

### Notification Service Extension追加

1. Xcode で `File` > `New` > `Target...` を選択
2. `Notification Service Extension` を選択
3. Product Name を入力（例: `NotificationService`）
4. `Finish` をクリック

### NotificationService.swift編集

```swift
import UserNotifications
import PushNotificationSDK

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest,
                            withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        if let bestAttemptContent = bestAttemptContent {
            // 画像URLを取得
            if let imageURLString = request.content.userInfo["imageUrl"] as? String,
               let imageURL = URL(string: imageURLString) {

                // 画像をダウンロード
                downloadImage(from: imageURL) { attachment in
                    if let attachment = attachment {
                        bestAttemptContent.attachments = [attachment]
                    }
                    contentHandler(bestAttemptContent)
                }
            } else {
                contentHandler(bestAttemptContent)
            }
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }

            let fileManager = FileManager.default
            let tmpSubFolderURL = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent(ProcessInfo.processInfo.globallyUniqueString, isDirectory: true)

            do {
                try fileManager.createDirectory(at: tmpSubFolderURL, withIntermediateDirectories: true, attributes: nil)
                let fileURL = tmpSubFolderURL.appendingPathComponent("image.png")
                try data.write(to: fileURL)

                let attachment = try UNNotificationAttachment(identifier: "image", url: fileURL, options: nil)
                completion(attachment)
            } catch {
                print("画像添付エラー: \(error)")
                completion(nil)
            }
        }.resume()
    }
}
```

---

## アクションボタン付き通知のセットアップ

### AppDelegate でアクションカテゴリ登録

```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // ... SDK初期化コード ...

    // アクションカテゴリ定義
    let confirmAction = UNNotificationAction(
        identifier: "CONFIRM",
        title: "確認",
        options: .foreground
    )
    let laterAction = UNNotificationAction(
        identifier: "LATER",
        title: "後で",
        options: []
    )

    let confirmCategory = UNNotificationCategory(
        identifier: "CONFIRM_CATEGORY",
        actions: [confirmAction, laterAction],
        intentIdentifiers: [],
        options: []
    )

    UNUserNotificationCenter.current().setNotificationCategories([confirmCategory])

    return true
}
```

### バックエンドから送信時にカテゴリ指定

```bash
curl -X POST https://your-api-server.com/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "tokens": ["your-device-token-here"],
    "title": "フレンドリクエスト",
    "body": "プレイヤーXがフレンド申請しています",
    "category": "CONFIRM_CATEGORY",
    "customData": {
      "friendId": "player-999"
    }
  }'
```

---

## Unity統合（オプション）

### Unity側のC#コード

```csharp
using System.Runtime.InteropServices;
using UnityEngine;

public class PushNotificationManager : MonoBehaviour
{
    // P/Invoke宣言
    [DllImport("__Internal")]
    private static extern void UnityPushSDK_Configure(string apiURL, string apiKey, string playerAccountId);

    [DllImport("__Internal")]
    private static extern void UnityPushSDK_RequestPermission(PermissionCallback callback);

    [DllImport("__Internal")]
    private static extern void UnityPushSDK_SetNotificationHandler(NotificationCallback handler);

    // デリゲート定義
    private delegate void PermissionCallback(int granted);
    private delegate void NotificationCallback(string jsonPayload);

    void Start()
    {
        #if UNITY_IOS && !UNITY_EDITOR
        // SDK初期化
        UnityPushSDK_Configure(
            "https://your-api-server.com",
            "your-api-key-here",
            "player-12345"
        );

        // 通知許可リクエスト
        UnityPushSDK_RequestPermission(OnPermissionResult);

        // 通知受信ハンドラー設定
        UnityPushSDK_SetNotificationHandler(OnNotificationReceived);
        #endif
    }

    [AOT.MonoPInvokeCallback(typeof(PermissionCallback))]
    private static void OnPermissionResult(int granted)
    {
        if (granted == 1)
        {
            Debug.Log("通知許可が得られました");
        }
        else
        {
            Debug.Log("通知が拒否されました");
        }
    }

    [AOT.MonoPInvokeCallback(typeof(NotificationCallback))]
    private static void OnNotificationReceived(string jsonPayload)
    {
        Debug.Log($"通知受信: {jsonPayload}");

        // JSONをパース
        var payload = JsonUtility.FromJson<NotificationPayload>(jsonPayload);

        // カスタムデータで画面遷移
        if (payload.customData.action == "open_mission")
        {
            // ミッション画面に遷移
        }
    }
}

[System.Serializable]
public class NotificationPayload
{
    public string title;
    public string body;
    public CustomData customData;
}

[System.Serializable]
public class CustomData
{
    public string action;
    public string missionId;
}
```

---

## トラブルシューティング

### 通知が届かない場合

1. **デバイストークン取得確認**:
   - コンソールに `✅ デバイストークン取得成功` が表示されているか確認
   - シミュレーターではAPNsが動作しないため、**実機テスト必須**

2. **APNs設定確認**:
   - Capabilities で `Push Notifications` が有効になっているか
   - APNsキーがバックエンドに正しく設定されているか

3. **バックエンドAPI確認**:
   - バックエンドサーバーが稼働しているか
   - API キーが正しいか
   - デバイストークンが正しく登録されているか（`GET /api/v1/tokens` で確認）

4. **ログ確認**:
   ```swift
   SDKConfiguration(
       ...,
       enableLogging: true  // デバッグログ有効化
   )
   ```

### よくあるエラー

**エラー**: `❌ SDK初期化失敗: invalidConfiguration("API URL must use HTTPS")`
- **原因**: HTTP URLを使用している
- **解決**: HTTPS URLに変更

**エラー**: `❌ 通知許可エラー: permissionDenied`
- **原因**: ユーザーが以前に通知を拒否した
- **解決**: 設定アプリから通知を有効化するようユーザーに案内

**エラー**: `❌ デバイストークン取得失敗: The operation couldn't be completed.`
- **原因**: シミュレーターで実行している
- **解決**: 実機でテスト

---

## 次のステップ

1. **本番環境デプロイ**:
   - APNs Production証明書に切り替え
   - バックエンドAPIのドメイン設定

2. **アナリティクス統合**:
   - 通知開封率トラッキング
   - カスタムイベント送信

3. **パフォーマンス最適化**:
   - 画像キャッシュ実装
   - バックグラウンド処理最適化

---

## ヘルプとサポート

- **SDK API仕様**: [contracts/sdk-api.md](./contracts/sdk-api.md)
- **データモデル**: [data-model.md](./data-model.md)
- **バックエンドAPI**: [SPEC-2d193ce6 クイックスタート](../SPEC-2d193ce6/quickstart.md)
- **GitHub Issues**: https://github.com/yourorg/push-notification-sdk-ios/issues

---

**最終更新日**: 2025-10-30
