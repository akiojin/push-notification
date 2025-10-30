# データモデル設計: SPEC-58d1c0d1

**機能ID**: `SPEC-58d1c0d1` | **日付**: 2025-10-30

## 概要

iOS Push通知SDKの内部データモデルとAPI契約定義。すべてSwiftの`Codable`プロトコルに準拠し、JSON変換をサポート。

## エンティティ関係図

```
PushNotificationSDK (Singleton)
  │
  ├─ SDKConfiguration (初期化設定)
  │
  ├─ DeviceTokenManager
  │    └─ DeviceTokenRegistrationRequest/Response
  │
  ├─ NotificationHandler
  │    ├─ NotificationPayload
  │    ├─ NotificationAction
  │    └─ CustomData (JSON)
  │
  └─ ErrorHandler
       └─ PushNotificationError
```

## エンティティ定義

### 1. SDKConfiguration (初期化設定)

SDK初期化時に開発者が提供する設定。

**フィールド**:

| フィールド名 | 型 | 必須 | デフォルト | 説明 |
|------------|---|-----|----------|------|
| apiURL | URL | ✅ | - | バックエンドAPIのベースURL |
| apiKey | String | ✅ | - | API認証キー (X-API-Key) |
| playerAccountId | String? | ❌ | nil | プレイヤーアカウント識別子（オプション） |
| enableLogging | Bool | ❌ | false | デバッグログ有効化 |
| requestTimeout | TimeInterval | ❌ | 30.0 | APIリクエストタイムアウト（秒） |

**検証ルール**:
- `apiURL`: 有効なHTTPS URLである必要がある
- `apiKey`: 空文字列禁止、最低8文字
- `requestTimeout`: 5秒以上、120秒以下

**Swift実装**:
```swift
public struct SDKConfiguration {
    public let apiURL: URL
    public let apiKey: String
    public let playerAccountId: String?
    public let enableLogging: Bool
    public let requestTimeout: TimeInterval

    public init(
        apiURL: URL,
        apiKey: String,
        playerAccountId: String? = nil,
        enableLogging: Bool = false,
        requestTimeout: TimeInterval = 30.0
    ) throws {
        guard apiURL.scheme == "https" else {
            throw PushNotificationError.invalidConfiguration("API URL must use HTTPS")
        }
        guard apiKey.count >= 8 else {
            throw PushNotificationError.invalidConfiguration("API key must be at least 8 characters")
        }
        guard requestTimeout >= 5.0 && requestTimeout <= 120.0 else {
            throw PushNotificationError.invalidConfiguration("Timeout must be between 5 and 120 seconds")
        }

        self.apiURL = apiURL
        self.apiKey = apiKey
        self.playerAccountId = playerAccountId
        self.enableLogging = enableLogging
        self.requestTimeout = requestTimeout
    }
}
```

---

### 2. DeviceTokenRegistrationRequest (トークン登録リクエスト)

バックエンドAPIへのデバイストークン登録リクエスト。

**フィールド**:

| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| token | String | ✅ | APNsデバイストークン（64文字16進数） |
| platform | String | ✅ | 固定値: "iOS" |
| playerAccountId | String? | ❌ | プレイヤーアカウントID |

**検証ルール**:
- `token`: 64文字の16進数文字列（APNs形式）
- `platform`: "iOS"固定
- `playerAccountId`: 提供される場合は1文字以上

**Swift実装**:
```swift
struct DeviceTokenRegistrationRequest: Codable {
    let token: String
    let platform: String
    let playerAccountId: String?

    init(token: String, playerAccountId: String?) throws {
        guard token.count == 64, token.allSatisfy({ $0.isHexDigit }) else {
            throw PushNotificationError.invalidToken
        }

        self.token = token
        self.platform = "iOS"
        self.playerAccountId = playerAccountId
    }
}
```

---

### 3. DeviceTokenRegistrationResponse (トークン登録レスポンス)

バックエンドAPIからのデバイストークン登録レスポンス。

**フィールド**:

| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| id | String | ✅ | デバイスレコードのUUID |
| token | String | ✅ | 登録されたトークン |
| platform | String | ✅ | "iOS" |
| playerAccountId | String? | ❌ | プレイヤーアカウントID |
| createdAt | Date | ✅ | 登録日時（ISO 8601） |
| updatedAt | Date | ✅ | 最終更新日時（ISO 8601） |

**Swift実装**:
```swift
public struct DeviceTokenRegistrationResponse: Codable {
    public let id: String
    public let token: String
    public let platform: String
    public let playerAccountId: String?
    public let createdAt: Date
    public let updatedAt: Date
}
```

---

### 4. NotificationPayload (通知ペイロード)

APNsから受信した通知データを表現。

**フィールド**:

| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| title | String | ✅ | 通知タイトル |
| body | String | ✅ | 通知本文 |
| imageUrl | String? | ❌ | 画像URL（リッチ通知） |
| customData | [String: Any] | ❌ | カスタムデータ（JSON） |
| actions | [NotificationAction] | ❌ | アクションボタン |
| badge | Int? | ❌ | バッジ数 |
| sound | String? | ❌ | サウンドファイル名 |

**検証ルール**:
- `title`: 1文字以上100文字以下
- `body`: 1文字以上500文字以下
- `imageUrl`: 有効なURL形式（提供される場合）
- `customData`: JSON serializable

**Swift実装**:
```swift
public struct NotificationPayload {
    public let title: String
    public let body: String
    public let imageUrl: String?
    public let customData: [String: Any]?
    public let actions: [NotificationAction]
    public let badge: Int?
    public let sound: String?

    init(userInfo: [AnyHashable: Any]) {
        // APNs aps辞書から抽出
        let aps = userInfo["aps"] as? [String: Any] ?? [:]
        let alert = aps["alert"] as? [String: Any] ?? [:]

        self.title = alert["title"] as? String ?? ""
        self.body = alert["body"] as? String ?? ""
        self.badge = aps["badge"] as? Int
        self.sound = aps["sound"] as? String

        // カスタムフィールド
        self.imageUrl = userInfo["imageUrl"] as? String
        self.customData = userInfo["customData"] as? [String: Any]

        // アクション（カテゴリIDからマッピング）
        if let categoryId = aps["category"] as? String {
            self.actions = NotificationAction.actions(forCategoryId: categoryId)
        } else {
            self.actions = []
        }
    }
}
```

---

### 5. NotificationAction (通知アクション)

通知のアクションボタン定義。

**フィールド**:

| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| identifier | String | ✅ | アクション識別子（例: "accept", "decline"） |
| title | String | ✅ | ボタンタイトル（例: "確認", "スキップ"） |
| options | UNNotificationActionOptions | ❌ | アクションオプション（前景起動等） |

**Swift実装**:
```swift
public struct NotificationAction {
    public let identifier: String
    public let title: String
    public let options: UNNotificationActionOptions

    public init(identifier: String, title: String, options: UNNotificationActionOptions = []) {
        self.identifier = identifier
        self.title = title
        self.options = options
    }

    // 定義済みアクションセット
    static func actions(forCategoryId categoryId: String) -> [NotificationAction] {
        switch categoryId {
        case "CONFIRM_CATEGORY":
            return [
                NotificationAction(identifier: "CONFIRM", title: "確認", options: .foreground),
                NotificationAction(identifier: "LATER", title: "後で", options: [])
            ]
        case "ACCEPT_DECLINE_CATEGORY":
            return [
                NotificationAction(identifier: "ACCEPT", title: "受け入れる", options: .foreground),
                NotificationAction(identifier: "DECLINE", title: "拒否", options: .destructive)
            ]
        default:
            return []
        }
    }
}
```

---

### 6. PushNotificationError (エラー定義)

SDK内のすべてのエラーを表現。

**ケース**:

| エラーケース | 説明 | 開発者向けメッセージ |
|------------|------|-------------------|
| permissionDenied | 通知許可が拒否された | "通知許可が拒否されました。設定アプリから許可してください。" |
| invalidToken | 無効なデバイストークン | "無効なデバイストークンです。" |
| invalidConfiguration | 設定エラー | "SDK設定が無効です: {詳細}" |
| networkError | ネットワークエラー | "ネットワークエラー: {詳細}" |
| serverError | サーバーエラー | "サーバーエラー ({ステータスコード}): {メッセージ}" |
| decodingError | JSONデコードエラー | "レスポンスのデコードに失敗しました。" |

**Swift実装**:
```swift
public enum PushNotificationError: Error, LocalizedError {
    case permissionDenied
    case invalidToken
    case invalidConfiguration(String)
    case networkError(URLError)
    case serverError(statusCode: Int, message: String)
    case decodingError(DecodingError)

    public var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "通知許可が拒否されました。設定アプリから許可してください。"
        case .invalidToken:
            return "無効なデバイストークンです。"
        case .invalidConfiguration(let detail):
            return "SDK設定が無効です: \(detail)"
        case .networkError(let error):
            return "ネットワークエラー: \(error.localizedDescription)"
        case .serverError(let statusCode, let message):
            return "サーバーエラー (\(statusCode)): \(message)"
        case .decodingError(let error):
            return "レスポンスのデコードに失敗しました: \(error.localizedDescription)"
        }
    }

    public var recoverySuggestion: String? {
        switch self {
        case .permissionDenied:
            return "設定 > {アプリ名} > 通知 から通知を有効にしてください。"
        case .networkError:
            return "ネットワーク接続を確認して、再試行してください。"
        case .serverError:
            return "しばらく待ってから再試行してください。問題が続く場合はサポートにお問い合わせください。"
        default:
            return nil
        }
    }
}
```

---

## API契約との対応

| SDK内部モデル | バックエンドAPI契約 | 対応関係 |
|--------------|------------------|---------|
| DeviceTokenRegistrationRequest | POST /api/v1/tokens リクエスト | 1:1マッピング |
| DeviceTokenRegistrationResponse | POST /api/v1/tokens レスポンス | 1:1マッピング |
| NotificationPayload | POST /api/v1/notifications ペイロード | APNs形式に変換 |

---

## JSON変換例

### デバイストークン登録リクエスト
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "platform": "iOS",
  "playerAccountId": "player-12345"
}
```

### 通知ペイロード (APNs形式)
```json
{
  "aps": {
    "alert": {
      "title": "New Mission Available!",
      "body": "Check out the new daily mission"
    },
    "badge": 1,
    "sound": "default",
    "category": "CONFIRM_CATEGORY"
  },
  "imageUrl": "https://example.com/mission.png",
  "customData": {
    "action": "open_mission",
    "missionId": "123"
  }
}
```

---

## メモリ管理

**方針**:
- すべての構造体は`struct`（値型）で定義 → 自動メモリ管理
- `PushNotificationSDK`クラスのみ`class`（参照型、シングルトン）
- 通知ハンドラークロージャは`[weak self]`でキャプチャ（循環参照回避）

**例**:
```swift
public class PushNotificationSDK {
    public static let shared = PushNotificationSDK()
    private init() {}

    public var onNotificationReceived: ((NotificationPayload) -> Void)? {
        didSet {
            // クロージャ保持（循環参照に注意）
        }
    }
}

// 使用側
PushNotificationSDK.shared.onNotificationReceived = { [weak self] payload in
    self?.handleNotification(payload)
}
```

---

## スレッドセーフティ

**方針**:
- APIリクエストは`URLSession`（内部でスレッドセーフ保証）
- 通知ハンドラーコールバックは**メインスレッドで呼び出し**（UI更新のため）
- トークン登録は`actor`で保護（Swift 5.5+）

**例**:
```swift
actor DeviceTokenManager {
    private var currentToken: String?

    func registerToken(_ token: String) async throws -> DeviceTokenRegistrationResponse {
        // Actorで自動的にスレッドセーフ
        self.currentToken = token
        // API呼び出し
    }
}
```

---

## パフォーマンス考慮事項

1. **JSON Decoding**: `JSONDecoder`はコストが高いため、一度だけインスタンス化
2. **画像ダウンロード**: Notification Service Extensionで非同期処理（30秒制限内）
3. **ログ**: OSLogは非同期でパフォーマンス影響最小
4. **通知ハンドラー**: メインスレッド呼び出しだが、重い処理はバックグラウンドに委譲

---

## セキュリティ考慮事項

1. **APIキー**: メモリ内のみ保持、Keychainには保存しない（アプリバンドルに含まれるため意味なし）
2. **デバイストークン**: 平文で送信（HTTPS暗号化）
3. **カスタムデータ**: JSON検証して不正データを拒否
4. **通知ペイロード**: ユーザー入力を含む場合はサニタイズ

---

## 憲章準拠

**シンプルさ**:
- ✅ 単一データモデル: DTOなし、`Codable`のみ
- ✅ フレームワーク直接使用: UserNotifications, URLSessionを直接使用

**テスト容易性**:
- ✅ すべての構造体が`Codable`でテストデータ作成容易
- ✅ `PushNotificationError`でエラーケースの網羅的テスト可能

---

**データモデル定義完了日**: 2025-10-30
