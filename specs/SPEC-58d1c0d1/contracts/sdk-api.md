# iOS Push通知SDK 公開API仕様

**機能ID**: `SPEC-58d1c0d1` | **バージョン**: 1.0.0 | **日付**: 2025-10-30

## 概要

iOS Push通知SDKの公開APIインターフェース定義。開発者がゲームアプリに統合する際に使用するSwift API。

## API設計原則

1. **シンプルさ**: 3行以内のコードで初期化可能
2. **タイプセーフ**: Swiftの型システムを最大活用
3. **非同期処理**: async/await使用（iOS 13対応のため`@available`属性）
4. **エラーハンドリング**: すべてのエラーケースを`PushNotificationError`で表現

---

## 1. SDK初期化API

### `PushNotificationSDK.configure(_:)`

SDK初期化とバックエンドAPI接続設定。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    public static func configure(_ configuration: SDKConfiguration) throws
}
```

**パラメータ**:
- `configuration`: `SDKConfiguration` - SDK設定（APIキー、URL等）

**戻り値**: なし

**Throws**:
- `PushNotificationError.invalidConfiguration(_:)`: 設定検証失敗時

**使用例**:
```swift
let config = try SDKConfiguration(
    apiURL: URL(string: "https://api.example.com")!,
    apiKey: "your-api-key-here",
    playerAccountId: "player-12345"
)

try PushNotificationSDK.configure(config)
```

**契約テスト要件**:
- ✅ 有効な設定で初期化成功
- ✅ 無効なAPIURL（非HTTPS）でエラー
- ✅ 短すぎるAPIキー（8文字未満）でエラー
- ✅ 無効なタイムアウト（5秒未満または120秒超）でエラー

---

## 2. 通知許可リクエストAPI

### `PushNotificationSDK.requestNotificationPermission(options:completion:)`

iOS通知許可ダイアログを表示し、ユーザーの選択を処理。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    public static func requestNotificationPermission(
        options: UNAuthorizationOptions = [.alert, .sound, .badge],
        completion: @escaping (Result<Bool, PushNotificationError>) -> Void
    )
}
```

**パラメータ**:
- `options`: `UNAuthorizationOptions` - 通知オプション（デフォルト: アラート、サウンド、バッジ）
- `completion`: `(Result<Bool, PushNotificationError>) -> Void` - 完了ハンドラー（Boolは許可/拒否）

**戻り値**: なし（非同期コールバック）

**Completion Result**:
- `.success(true)`: ユーザーが許可
- `.success(false)`: ユーザーが拒否
- `.failure(.permissionDenied)`: 以前に拒否された

**使用例**:
```swift
PushNotificationSDK.requestNotificationPermission { result in
    switch result {
    case .success(let granted):
        if granted {
            print("通知許可が得られました")
        } else {
            print("通知が拒否されました")
        }
    case .failure(let error):
        print("エラー: \(error.localizedDescription)")
    }
}
```

**契約テスト要件**:
- ✅ ユーザーが許可した場合、`success(true)`
- ✅ ユーザーが拒否した場合、`success(false)`
- ✅ 2回目以降の呼び出しで既存設定を返す

---

## 3. デバイストークン登録API（自動）

### `PushNotificationSDK.registerDeviceToken(_:)`

APNsから取得したデバイストークンをバックエンドに自動登録。**開発者は直接呼び出さない**（SDK内部で自動実行）。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    internal static func registerDeviceToken(_ deviceToken: Data) async throws -> DeviceTokenRegistrationResponse
}
```

**パラメータ**:
- `deviceToken`: `Data` - APNsから取得したデバイストークン

**戻り値**: `DeviceTokenRegistrationResponse` - 登録レスポンス

**Throws**:
- `PushNotificationError.invalidToken`: 無効なトークン形式
- `PushNotificationError.networkError(_:)`: ネットワークエラー
- `PushNotificationError.serverError(statusCode:message:)`: サーバーエラー

**内部フロー**:
1. `AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken(_:)` が呼ばれる
2. SDK内部で`registerDeviceToken(_:)`を自動実行
3. バックエンドAPI `POST /api/v1/tokens` を呼び出し
4. 成功時、トークンをキャッシュ

**契約テスト要件**:
- ✅ 有効なトークンで登録成功
- ✅ 無効なトークン（非16進数）でエラー
- ✅ ネットワークエラー時にリトライ（最大3回）
- ✅ サーバーエラー時に適切なエラーメッセージ

---

## 4. 通知受信ハンドラーAPI

### `PushNotificationSDK.onNotificationReceived`

通知受信時に呼び出されるハンドラー（フォアグラウンド/バックグラウンド両方）。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    public static var onNotificationReceived: ((NotificationPayload) -> Void)?
}
```

**型**: `((NotificationPayload) -> Void)?` - オプショナルクロージャ

**呼び出しタイミング**:
- フォアグラウンド: アプリ起動中に通知受信時
- バックグラウンド: 通知タップでアプリ起動時

**使用例**:
```swift
PushNotificationSDK.onNotificationReceived = { payload in
    print("通知タイトル: \(payload.title)")
    print("通知本文: \(payload.body)")

    // カスタムデータに基づいて画面遷移
    if let customData = payload.customData,
       let missionId = customData["missionId"] as? String {
        navigateToMission(id: missionId)
    }
}
```

**契約テスト要件**:
- ✅ フォアグラウンド通知受信時、ハンドラーが呼ばれる
- ✅ バックグラウンド通知タップ時、ハンドラーが呼ばれる
- ✅ `NotificationPayload`が正しくパースされる
- ✅ カスタムデータがJSONとして取得可能

---

## 5. 通知タップアクションハンドラーAPI

### `PushNotificationSDK.onNotificationActionTapped`

通知のアクションボタンタップ時に呼び出されるハンドラー。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    public static var onNotificationActionTapped: ((String, NotificationPayload) -> Void)?
}
```

**型**: `((String, NotificationPayload) -> Void)?` - オプショナルクロージャ
- 第1引数: `String` - アクション識別子（例: "CONFIRM", "DECLINE"）
- 第2引数: `NotificationPayload` - 通知ペイロード

**使用例**:
```swift
PushNotificationSDK.onNotificationActionTapped = { actionId, payload in
    switch actionId {
    case "CONFIRM":
        print("ユーザーが確認ボタンをタップ")
        // 確認処理
    case "LATER":
        print("ユーザーが後でボタンをタップ")
        // リマインダー設定
    default:
        print("不明なアクション: \(actionId)")
    }
}
```

**契約テスト要件**:
- ✅ アクションタップ時、正しい識別子が渡される
- ✅ 通知ペイロードが同時に渡される
- ✅ 複数アクションが定義されている場合、正しく区別される

---

## 6. エラー通知ハンドラーAPI

### `PushNotificationSDK.onError`

SDK内部でエラー発生時に呼び出されるハンドラー（オプション）。

**シグネチャ**:
```swift
public class PushNotificationSDK {
    public static var onError: ((PushNotificationError) -> Void)?
}
```

**型**: `((PushNotificationError) -> Void)?` - オプショナルクロージャ

**使用例**:
```swift
PushNotificationSDK.onError = { error in
    print("SDKエラー: \(error.localizedDescription)")

    if let suggestion = error.recoverySuggestion {
        print("解決策: \(suggestion)")
    }

    // アナリティクスにエラー送信
    Analytics.logError(error)
}
```

**契約テスト要件**:
- ✅ トークン登録失敗時、`serverError`が通知される
- ✅ ネットワークエラー時、`networkError`が通知される
- ✅ エラーに解決策が含まれる

---

## 7. Unity/Unreal Engineブリッジ API

### Objective-Cブリッジクラス

**ヘッダー**: `PushNotificationSDKBridge.h`

```objc
@interface PushNotificationSDKBridge : NSObject

+ (void)configureWithAPIURL:(NSString *)apiURL
                     apiKey:(NSString *)apiKey
           playerAccountId:(NSString * _Nullable)playerAccountId
                     error:(NSError **)error;

+ (void)requestNotificationPermissionWithCompletion:(void (^)(BOOL granted, NSError * _Nullable error))completion;

+ (void)setNotificationReceivedHandler:(void (^)(NSDictionary *payload))handler;

+ (void)setNotificationActionHandler:(void (^)(NSString *actionId, NSDictionary *payload))handler;

@end
```

### Cエクスポート（Unity P/Invoke用）

**ヘッダー**: `UnityPushSDKBridge.h`

```c
#ifdef __cplusplus
extern "C" {
#endif

// 初期化
void UnityPushSDK_Configure(const char* apiURL, const char* apiKey, const char* playerAccountId);

// 通知許可リクエスト
void UnityPushSDK_RequestPermission(void (*callback)(int granted));

// 通知受信ハンドラー設定
void UnityPushSDK_SetNotificationHandler(void (*handler)(const char* jsonPayload));

// アクションハンドラー設定
void UnityPushSDK_SetActionHandler(void (*handler)(const char* actionId, const char* jsonPayload));

#ifdef __cplusplus
}
#endif
```

**Unreal Engineブリッジも同様のC関数インターフェースを提供**

**契約テスト要件**:
- ✅ Objective-Cブリッジ経由でSwift APIを呼び出せる
- ✅ C関数エクスポートが正しく動作
- ✅ JSON文字列として通知ペイロードが返る

---

## 完全な統合例（Swift）

```swift
import UIKit
import PushNotificationSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // 1. SDK初期化（3行）
        let config = try! SDKConfiguration(
            apiURL: URL(string: "https://api.example.com")!,
            apiKey: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
            playerAccountId: "player-12345"
        )
        try! PushNotificationSDK.configure(config)

        // 2. 通知許可リクエスト
        PushNotificationSDK.requestNotificationPermission { result in
            switch result {
            case .success(let granted):
                print("通知許可: \(granted)")
            case .failure(let error):
                print("エラー: \(error)")
            }
        }

        // 3. 通知受信ハンドラー設定
        PushNotificationSDK.onNotificationReceived = { payload in
            print("通知受信: \(payload.title)")

            // カスタムデータで画面遷移
            if let customData = payload.customData,
               let action = customData["action"] as? String {
                self.handleDeepLink(action)
            }
        }

        // 4. アクションハンドラー設定
        PushNotificationSDK.onNotificationActionTapped = { actionId, payload in
            print("アクションタップ: \(actionId)")
        }

        // 5. エラーハンドラー設定（オプション）
        PushNotificationSDK.onError = { error in
            print("SDKエラー: \(error.localizedDescription)")
        }

        return true
    }

    private func handleDeepLink(_ action: String) {
        // 画面遷移ロジック
    }
}
```

---

## API バージョニング

**初期バージョン**: `1.0.0`

**破壊的変更の管理**:
- メジャーバージョンアップ時のみ破壊的変更許可
- `@available` 属性で非推奨API管理
- 移行ガイド提供

**例**:
```swift
@available(*, deprecated, renamed: "onNotificationReceived")
public static var notificationHandler: ((NotificationPayload) -> Void)?
```

---

## パフォーマンス要件

| API | 最大実行時間 | 測定方法 |
|-----|------------|---------|
| `configure(_:)` | 100ms | XCTMeasure |
| `requestNotificationPermission` | 即座（ユーザー操作待ち） | - |
| `registerDeviceToken(_:)` | 3秒（ネットワーク） | Integration test |
| 通知ハンドラー呼び出し | 100ms | Performance test |

---

## セキュリティ考慮事項

1. **APIキーの保護**: メモリ内のみ保持、外部に漏洩させない
2. **HTTPS強制**: `SDKConfiguration`で非HTTPS URLを拒否
3. **入力検証**: すべてのパラメータを検証してからAPI呼び出し

---

## 契約テスト戦略

**Contract Tests**: すべての公開APIに対してテストケース作成

```swift
// Example: SDK初期化契約テスト
func testSDKConfigurationContract() throws {
    // Valid configuration should succeed
    let config = try SDKConfiguration(
        apiURL: URL(string: "https://api.example.com")!,
        apiKey: "validkey123"
    )
    XCTAssertNoThrow(try PushNotificationSDK.configure(config))
}

func testSDKConfigurationRejectsHTTP() {
    // Non-HTTPS URL should throw error
    XCTAssertThrowsError(try SDKConfiguration(
        apiURL: URL(string: "http://api.example.com")!,
        apiKey: "validkey123"
    )) { error in
        XCTAssertTrue(error is PushNotificationError)
    }
}
```

---

**API契約定義完了日**: 2025-10-30
