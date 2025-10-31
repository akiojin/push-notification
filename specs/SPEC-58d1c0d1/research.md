# 技術リサーチ: iOS Push通知SDK

**機能ID**: `SPEC-58d1c0d1` | **日付**: 2025-10-30

## リサーチ概要

iOS用Push通知SDKの実装に必要な技術選択とベストプラクティスをリサーチ。

## 技術決定

### 1. APNs統合

**決定**: iOS標準の`UserNotifications` Framework（iOS 10+）を使用

**理由**:
- Apple公式のフレームワークで、最も安定かつ信頼性が高い
- iOS 10以降で推奨されるモダンなAPI（UNUserNotificationCenter）
- リッチ通知（画像、アクション）をネイティブサポート
- 追加の外部依存関係不要

**検討した代替案**:
- サードパーティライブラリ（OneSignal SDK等）: 過剰な機能、SDK自体が大きい、カスタマイズ性が低い

**実装詳細**:
```swift
// 通知許可リクエスト
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])

// デバイストークン取得
UIApplication.shared.registerForRemoteNotifications()

// 通知受信ハンドラー
UNUserNotificationCenterDelegate
```

---

### 2. HTTP通信（デバイストークン登録）

**決定**: 標準の`URLSession`を使用

**理由**:
- iOS標準のHTTPクライアント、追加依存なし
- async/await対応（Swift 5.5+）で簡潔なコード
- JSONエンコード/デコードが`Codable`と統合
- リトライロジックの実装が容易

**検討した代替案**:
- Alamofire: 人気だが外部依存、SDKには過剰
- URLSession + Combine: Combineは学習コストが高く、シンプルさの原則に反する

**実装詳細**:
```swift
// async/await パターン
func registerToken(_ token: String) async throws -> DeviceRegistrationResponse {
    var request = URLRequest(url: apiURL)
    request.httpMethod = "POST"
    request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let (data, response) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(DeviceRegistrationResponse.self, from: data)
}
```

---

### 3. Unity/Unreal Engineブリッジ

**決定**: Objective-Cブリッジクラス + C関数エクスポート

**理由**:
- Unity/UEはC/C++/Objective-C互換のAPIが必要（Swiftの直接呼び出しは困難）
- `@objc`アノテーションでSwift→Objective-C変換可能
- C関数エクスポート（`extern "C"`）でUnity P/Invoke対応

**検討した代替案**:
- Pure Swift: Unity/UEから呼び出し不可
- Pure Objective-C SDK: モダンなSwift機能が使えない

**実装詳細**:
```swift
// Swift側
@objc public class PushNotificationSDKBridge: NSObject {
    @objc public static func initialize(apiKey: String) { ... }
}

// Objective-Cヘッダー (自動生成)
// UnityPushNotificationBridge.h
@interface PushNotificationSDKBridge : NSObject
+ (void)initializeWithApiKey:(NSString *)apiKey;
@end

// C関数エクスポート (Unity P/Invoke用)
#if UNITY_BUILD
extern "C" {
    void UnityPushSDK_Initialize(const char* apiKey);
    void UnityPushSDK_SetNotificationHandler(void (*callback)(const char*));
}
#endif
```

---

### 4. 配布方法

**決定**: Swift Package Manager (SPM) 優先、CocoaPods対応

**理由**:
- SPM: Xcode標準、依存管理が簡単、Appleが推奨
- CocoaPods: レガシープロジェクト対応のため維持
- 両方サポートすることでカバレッジ最大化

**検討した代替案**:
- Carthage: 採用率低下中、メンテナンス負荷高い

**実装詳細**:
```swift
// Package.swift (SPM)
let package = Package(
    name: "PushNotificationSDK",
    platforms: [.iOS(.v13)],
    products: [
        .library(name: "PushNotificationSDK", targets: ["PushNotificationSDK"])
    ],
    targets: [
        .target(name: "PushNotificationSDK", dependencies: [])
    ]
)

// PushNotificationSDK.podspec (CocoaPods)
Pod::Spec.new do |s|
  s.name         = "PushNotificationSDK"
  s.version      = "1.0.0"
  s.platform     = :ios, "13.0"
  s.source_files = "Sources/**/*.swift"
end
```

---

### 5. テスト戦略

**決定**: XCTest + 実デバイステスト

**理由**:
- XCTest: iOS標準のテストフレームワーク
- APNsはシミュレーターで動作しないため実デバイステスト必須
- モックサーバーでAPI通信テスト（契約テスト）

**検討した代替案**:
- Quick/Nimble: BDD記法だが学習コスト高、シンプルさに反する

**テストカテゴリ**:
1. **Contract Tests**: APIエンドポイント仕様準拠（モックサーバー使用）
2. **Integration Tests**: APNs通知受信フロー（実デバイス必須）
3. **Unit Tests**: トークン検証、エラーハンドリング、データ変換

**実装詳細**:
```swift
// Contract Test例
func testTokenRegistrationContract() async throws {
    let mockServer = MockAPIServer()
    mockServer.expectPOST("/api/v1/tokens", statusCode: 201)

    let sdk = PushNotificationSDK(apiURL: mockServer.url)
    let response = try await sdk.registerToken("test-token")

    XCTAssertEqual(response.platform, "iOS")
}

// Integration Test例 (実デバイス)
func testNotificationReceived() {
    let expectation = XCTestExpectation(description: "Notification received")

    PushNotificationSDK.onNotificationReceived = { notification in
        XCTAssertNotNil(notification.customData)
        expectation.fulfill()
    }

    // APNs経由で通知送信（手動トリガー）
    wait(for: [expectation], timeout: 30.0)
}
```

---

### 6. リッチ通知（画像）

**決定**: Notification Service Extension使用

**理由**:
- APNsのペイロードには画像を直接含められない（4KB制限）
- Notification Service Extensionで画像URLからダウンロード
- iOS標準の推奨アプローチ

**実装詳細**:
```swift
// NotificationServiceExtension
class NotificationService: UNNotificationServiceExtension {
    override func didReceive(_ request: UNNotificationRequest,
                            withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        guard let imageURLString = request.content.userInfo["imageUrl"] as? String,
              let imageURL = URL(string: imageURLString) else {
            return contentHandler(request.content)
        }

        downloadImage(from: imageURL) { attachment in
            let content = request.content.mutableCopy() as! UNMutableNotificationContent
            if let attachment = attachment {
                content.attachments = [attachment]
            }
            contentHandler(content)
        }
    }
}
```

---

### 7. エラーハンドリング

**決定**: Swiftの`Result<Success, Error>`型 + カスタムエラー

**理由**:
- Swift標準のエラー処理パターン
- async/awaitと`throws`キーワードで簡潔
- タイプセーフなエラーハンドリング

**実装詳細**:
```swift
enum PushNotificationError: Error, LocalizedError {
    case permissionDenied
    case invalidToken
    case networkError(URLError)
    case serverError(statusCode: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "通知許可が拒否されました。設定アプリから許可してください。"
        case .invalidToken:
            return "無効なデバイストークンです。"
        case .networkError(let error):
            return "ネットワークエラー: \(error.localizedDescription)"
        case .serverError(let statusCode, let message):
            return "サーバーエラー (\(statusCode)): \(message)"
        }
    }
}
```

---

### 8. ログ＆可観測性

**決定**: OSLogフレームワーク使用（iOS 14+）

**理由**:
- Apple推奨のロギングフレームワーク
- Console.appで統合ログ確認可能
- パフォーマンス最適化済み（非同期ロギング）

**検討した代替案**:
- print(): 本番環境で無効化困難、パフォーマンス影響
- CocoaLumberjack: 外部依存、過剰機能

**実装詳細**:
```swift
import OSLog

extension Logger {
    static let pushSDK = Logger(subsystem: "com.yourcompany.pushsdk", category: "push")
}

// 使用例
Logger.pushSDK.info("Device token registered: \(tokenHash)")
Logger.pushSDK.error("Failed to register token: \(error.localizedDescription)")
```

---

## 技術スタック概要

| カテゴリ | 技術選択 | バージョン |
|---------|---------|-----------|
| 言語 | Swift | 5.9+ |
| 最小iOS | iOS | 13.0+ |
| Xcode | Xcode | 14.0+ |
| APNs統合 | UserNotifications Framework | iOS 10+ |
| HTTP通信 | URLSession | 標準 |
| JSON処理 | Codable | 標準 |
| テスト | XCTest | 標準 |
| ログ | OSLog | iOS 14+ (fallback: print for iOS 13) |
| 配布 | SPM + CocoaPods | - |
| Unity/UEブリッジ | Objective-C + C関数 | - |

---

## 依存関係

**外部依存なし** - iOS標準フレームワークのみ使用

**利点**:
- SDK軽量（バイナリサイズ最小化）
- バージョン競合リスクなし
- Apple保証の安定性

---

## パフォーマンス目標

- SDK初期化: < 100ms
- トークン登録API呼び出し: < 3秒（ネットワーク正常時）
- 通知受信ハンドラー呼び出し: < 100ms
- メモリフットプリント: < 5MB
- バイナリサイズ: < 500KB（arm64）

---

## セキュリティ考慮事項

1. **APIキー保護**:
   - アプリバンドル内に平文保存（iOSアプリはリバースエンジニアリング可能だが、APIサーバー側でレート制限＋認証で保護）
   - 将来的にはKeychain保存を検討

2. **通信暗号化**:
   - HTTPS必須（App Transport Security準拠）
   - 証明書ピンニングはオプション

3. **データ検証**:
   - 通知ペイロードのカスタムデータを検証（不正なJSONを拒否）

---

## 憲章準拠チェック

**シンプルさ**:
- ✅ プロジェクト数: 1 (iOS SDK本体のみ)
- ✅ フレームワーク直接使用: UserNotifications, URLSessionを直接使用
- ✅ 単一データモデル: DTOなし（Codable構造体のみ）
- ✅ パターン回避: Repository/UoWパターンなし

**アーキテクチャ**:
- ✅ ライブラリとして実装: アプリコードなし
- ✅ CLI不要（SDKライブラリ）

**テスト**:
- ✅ TDD厳守: Contract → Integration → Unit
- ✅ 実依存使用: 実APNs（デバイステスト）、実URLSession

**可観測性**:
- ✅ 構造化ロギング: OSLog使用

**バージョニング**:
- ✅ MAJOR.MINOR.BUILD形式（例: 1.0.0）

---

## リスクと緩和策

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| APNsシミュレーター非対応 | テスト困難 | 実デバイステスト自動化、モックで単体テスト |
| Unity/UEブリッジの複雑性 | 統合エラー | サンプルプロジェクト提供、詳細ドキュメント |
| iOS 13サポート（古いOS） | 機能制限 | OSLog fallback、最低限機能保証 |
| デバイストークン変更 | 登録失敗 | 自動更新検出、リトライロジック |

---

## 次のステップ (Phase 1)

1. データモデル定義 (`data-model.md`)
2. API契約定義 (SDK公開API)
3. クイックスタートガイド作成 (`quickstart.md`)
4. 契約テストケース生成

---

**リサーチ完了日**: 2025-10-30
**レビュー担当**: -
**承認**: Phase 1へ進行可
