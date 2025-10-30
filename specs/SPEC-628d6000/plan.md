# 実装計画: Android Native Push通知SDK

**機能ID**: `SPEC-628d6000` | **日付**: 2025-10-30 | **仕様**: [spec.md](./spec.md)
**入力**: `/push-notification/specs/SPEC-628d6000/spec.md`の機能仕様

## 実行フロー (/speckit.plan コマンドのスコープ)
```
1. 入力パスから機能仕様を読み込み ✓
2. 技術コンテキストを記入 ✓
3. 憲章チェックセクションを評価 ✓
4. Phase 0 を実行 → research.md
5. Phase 1 を実行 → contracts/, data-model.md, quickstart.md
6. 憲章チェックを再評価
7. Phase 2 を計画 → タスク生成アプローチを記述
8. 停止 - /speckit.tasks コマンドの準備完了
```

## 概要

Android Native Push通知SDKは、ゲームアプリ開発者がAndroidアプリにPush通知機能を簡単に統合できるKotlinライブラリです。Firebase Cloud Messaging（FCM）統合、シンプルな初期化API、デバイストークン自動登録、通知受信・表示処理を提供します。

**主要機能**:
- 3行コードで初期化完了（開発者体験最優先）
- FCMトークン自動取得・REST API登録
- リッチ通知対応（画像、アクションボタン）
- カスタム通知ハンドリング（ディープリンク、画面遷移）
- Unity/Unreal Engine C++/JNIブリッジ対応（.aar形式配布）

## 技術コンテキスト

**言語/バージョン**: Kotlin 1.9+
**主要依存関係**:
- Firebase Cloud Messaging SDK v23.0+
- Retrofit 2.9+ / OkHttp 4.12+（REST API通信）
- Kotlin Coroutines 1.7+（非同期処理）
- Coil 2.5+（画像読み込み）
- AndroidX Core/AppCompat（Android標準ライブラリ）

**ストレージ**: SharedPreferences（トークン・設定永続化）
**テスト**: JUnit 5 + Mockito + Robolectric 4.11+（Android単体テスト）
**対象プラットフォーム**: Android 7.0+（API Level 24+）
**プロジェクトタイプ**: single（Android SDKライブラリ単体）
**パフォーマンス目標**:
- SDK初期化: 5秒以内
- トークン登録API呼び出し: 3秒以内
- 通知受信→表示: 1秒以内
- メモリ使用量: 10MB以下

**制約**:
- Google Play Services必須（FCM SDK依存）
- ProGuard/R8対応必須
- 通知画像サイズ: 最大1MB、推奨512x256px
- 通知本文: 最大500文字
- アクションボタン: 最大3個

**スケール/スコープ**:
- 対象: ゲームアプリ開発者（Android、Unity、Unreal Engine）
- 配布: Gradle依存関係（Maven Central/JCenter）
- .aar形式でUnity/UE JNIブリッジ経由利用可能

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:
- プロジェクト数: 1（android-sdk単体）
- フレームワークを直接使用? ✓（FCM SDK、Retrofit、Coil直接使用、ラッパーなし）
- 単一データモデル? ✓（NotificationData、SDKConfigのみ、DTO不要）
- パターン回避? ✓（Repository/UoWパターン不使用、直接FirebaseMessagingService継承）

**アーキテクチャ**:
- すべての機能をライブラリとして? ✓（SDKライブラリとして提供、直接アプリコードなし）
- ライブラリリスト:
  1. `push-notification-android-sdk` - メインSDKライブラリ（初期化、トークン管理、通知処理）
- ライブラリごとのCLI: N/A（SDKライブラリのためCLI不要）
- ライブラリドキュメント: KDoc形式API仕様 + quickstart.md

**テスト (妥協不可)**:
- RED-GREEN-Refactorサイクルを強制? ✓
- Gitコミットはテストが実装より先に表示? ✓
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? ✓
- 実依存関係を使用? ✓（実際のFirebase Emulator、モックではない）
- Integration testの対象: FCM統合、REST API通信、通知表示
- 禁止: テスト前の実装、REDフェーズのスキップ

**可観測性**:
- 構造化ロギング含む? ✓（android.util.Log + カスタムLoggerクラス）
- フロントエンドログ → バックエンド? N/A（SDKライブラリのためローカルログのみ）
- エラーコンテキスト十分? ✓（エラーコード、メッセージ、スタックトレース）

**バージョニング**:
- バージョン番号割り当て済み? ✓（1.0.0から開始、MAJOR.MINOR.PATCH形式）
- 変更ごとにPATCHインクリメント? ✓
- 破壊的変更を処理? ✓（Deprecationアノテーション + 移行ガイド）

## プロジェクト構造

### ドキュメント (この機能)
```
specs/SPEC-628d6000/
├── plan.md              # このファイル (/speckit.plan コマンド出力)
├── research.md          # Phase 0 出力 - FCM統合技術調査
├── data-model.md        # Phase 1 出力 - SDK内部データモデル
├── quickstart.md        # Phase 1 出力 - 開発者向けQuickstartガイド
├── contracts/           # Phase 1 出力 - 公開API仕様
│   ├── public-api.kt    # Kotlin APIシグネチャ
│   └── rest-api.yaml    # REST API連携仕様
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド)
```

### ソースコード (リポジトリルート)
```
android-sdk/
├── src/
│   ├── main/
│   │   ├── kotlin/com/example/pushnotification/
│   │   │   ├── PushNotificationSDK.kt         # メインSDKエントリポイント
│   │   │   ├── config/
│   │   │   │   ├── SDKConfig.kt               # SDK設定クラス
│   │   │   │   └── Logger.kt                  # ログユーティリティ
│   │   │   ├── messaging/
│   │   │   │   ├── FCMService.kt              # FirebaseMessagingService実装
│   │   │   │   ├── TokenManager.kt            # トークン管理
│   │   │   │   └── NotificationHandler.kt     # 通知表示処理
│   │   │   ├── notification/
│   │   │   │   ├── NotificationBuilder.kt     # 通知作成
│   │   │   │   ├── ChannelManager.kt          # 通知チャンネル管理
│   │   │   │   └── ActionHandler.kt           # アクションボタン処理
│   │   │   ├── api/
│   │   │   │   ├── ApiClient.kt               # Retrofit APIクライアント
│   │   │   │   ├── TokenService.kt            # トークン登録API
│   │   │   │   └── NotificationService.kt     # 通知ステータスAPI
│   │   │   └── models/
│   │   │       ├── NotificationData.kt        # 通知データモデル
│   │   │       ├── DeviceToken.kt             # デバイストークンモデル
│   │   │       └── CustomData.kt              # カスタムデータモデル
│   │   ├── res/
│   │   │   ├── values/
│   │   │   │   └── strings.xml                # リソース文字列
│   │   │   └── drawable/
│   │   │       └── ic_notification.xml        # デフォルト通知アイコン
│   │   └── AndroidManifest.xml
│   └── test/
│       ├── kotlin/
│       │   ├── contract/                       # Contract tests
│       │   ├── integration/                    # Integration tests
│       │   └── unit/                           # Unit tests
│       └── resources/
└── build.gradle.kts
```

## Phase 0: 技術リサーチ → `research.md`

**目的**: FCM統合、Kotlinライブラリ選定、REST API通信方式を調査し、技術的実現可能性を確認

**調査項目**:

### 1. FCM統合アプローチ
- **Firebase Cloud Messaging SDK v23.0+**
  - `FirebaseMessagingService`継承でトークン取得・通知受信
  - `onNewToken()`でトークン更新検知
  - `onMessageReceived()`でデータペイロード受信
  - バックグラウンド/フォアグラウンド両対応
  - google-services.json設定必須

### 2. REST API通信
- **Retrofit 2.9+ + OkHttp 4.12+**
  - 宣言的APIクライアント定義
  - Kotlin Coroutines統合（suspend関数）
  - Interceptorでヘッダー（X-API-Key）追加
  - Exponential Backoffリトライ実装

### 3. 画像読み込み（リッチ通知）
- **Coil 2.5+**
  - Kotlin Coroutines対応
  - Bitmap変換API提供
  - キャッシュ管理内蔵
  - NotificationCompat.BigPictureStyle統合

### 4. 通知チャンネル管理
- **Android 8.0+ NotificationChannel API**
  - 通知重要度設定（IMPORTANCE_DEFAULT/HIGH）
  - カスタムサウンド設定
  - バイブレーションパターン

### 5. ProGuard/R8対応
- **Keep rules設定**
  ```proguard
  -keep class com.example.pushnotification.** { *; }
  -keep class com.google.firebase.** { *; }
  ```

### 6. Unity/UE JNIブリッジ
- **JNI Wrapper実装**
  - `@JvmStatic`アノテーションでC++から呼び出し可能
  - .aar形式で配布
  - Unity: `AndroidJavaClass`/`AndroidJavaObject`経由
  - UE: `FAndroidApplication::GetJavaEnv()`経由

**決定事項**:
- FCM SDK v23.0+使用（HTTP/2対応、最新版）
- Retrofit + OkHttp（Kotlin Coroutines統合）
- Coil画像ライブラリ（軽量、Kotlin First）
- SharedPreferencesでトークン永続化（シンプル、暗号化なし）

**要明確化**: なし（すべて業界標準アプローチで解決可能）

## Phase 1: 設計とコントラクト

### 1.1 データモデル → `data-model.md`

**主要エンティティ**:

#### SDKConfig
```kotlin
data class SDKConfig(
    val apiKey: String,
    val apiEndpoint: String,
    val enableLogging: Boolean = false,
    val playerAccountId: String? = null
)
```

#### NotificationData
```kotlin
data class NotificationData(
    val id: String,
    val title: String,
    val body: String,
    val imageUrl: String? = null,
    val customData: Map<String, String>? = null,
    val actions: List<NotificationAction>? = null
)

data class NotificationAction(
    val id: String,
    val label: String,
    val deepLink: String? = null
)
```

#### DeviceToken
```kotlin
data class DeviceToken(
    val token: String,
    val platform: String = "android",
    val playerAccountId: String? = null
)
```

### 1.2 公開APIコントラクト → `contracts/public-api.kt`

**初期化API**:
```kotlin
object PushNotificationSDK {
    fun initialize(context: Context, config: SDKConfig)
    fun updatePlayerAccountId(playerId: String)
    fun unregisterToken()
    fun setNotificationHandler(handler: NotificationHandler)
}

interface NotificationHandler {
    fun onNotificationReceived(data: NotificationData)
    fun onNotificationOpened(data: NotificationData)
}
```

**通知チャンネルAPI**:
```kotlin
object ChannelManager {
    fun createChannel(id: String, name: String, importance: Int)
    fun deleteChannel(id: String)
}
```

### 1.3 REST API連携仕様 → `contracts/rest-api.yaml`

**トークン登録**:
```yaml
POST /api/tokens
Headers:
  X-API-Key: {apiKey}
Body:
  {
    "token": "fcm-device-token",
    "platform": "android",
    "playerAccountId": "player-123"
  }
Response: 201 Created
```

**トークン更新**:
```yaml
PUT /api/tokens/{token}
Headers:
  X-API-Key: {apiKey}
Body:
  {
    "playerAccountId": "player-456"
  }
Response: 200 OK
```

**トークン削除**:
```yaml
DELETE /api/tokens/{token}
Headers:
  X-API-Key: {apiKey}
Response: 204 No Content
```

### 1.4 Quickstartガイド → `quickstart.md`

**1. Gradle依存関係追加**:
```kotlin
dependencies {
    implementation("com.example:push-notification-android-sdk:1.0.0")
    implementation("com.google.firebase:firebase-messaging:23.3.1")
}
```

**2. google-services.json配置**:
```
app/google-services.json
```

**3. SDK初期化（Applicationクラス）**:
```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val config = SDKConfig(
            apiKey = "your-api-key",
            apiEndpoint = "https://api.example.com",
            enableLogging = true
        )
        PushNotificationSDK.initialize(this, config)
    }
}
```

**4. 通知ハンドラー登録**:
```kotlin
PushNotificationSDK.setNotificationHandler(object : NotificationHandler {
    override fun onNotificationReceived(data: NotificationData) {
        Log.d("Push", "Received: ${data.title}")
    }

    override fun onNotificationOpened(data: NotificationData) {
        // Navigate to specific screen
        val screenId = data.customData?.get("screenId")
        navigateToScreen(screenId)
    }
})
```

**5. AndroidManifest.xml設定**:
```xml
<application>
    <service
        android:name=".FCMService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
</application>
```

## Phase 2: タスク計画アプローチ

**/speckit.tasks コマンドで `tasks.md` を生成**

**タスク分類**:

### Setup（T001-T005）
- T001: Gradleプロジェクト初期化
- T002: Firebase SDK依存関係追加
- T003: Retrofit/OkHttp/Coil依存関係追加
- T004: ProGuard/R8ルール設定
- T005: サンプルアプリプロジェクト作成

### Test First（T006-T015）- Contract & Integration
- T006: FCMトークン取得Contract test
- T007: REST APIトークン登録Contract test
- T008: 通知受信Contract test
- T009: 通知表示Contract test
- T010: FCM統合Integration test（Firebase Emulator）
- T011: REST API統合Integration test（Mock Server）
- T012: 画像読み込みIntegration test
- T013: 通知チャンネルIntegration test
- T014: リトライロジックIntegration test
- T015: E2E test（サンプルアプリ）

### Core実装（T016-T040）- TDDサイクル
- T016-T018: SDKConfig + Logger実装
- T019-T022: TokenManager実装（RED→GREEN→Refactor）
- T023-T026: FCMService実装
- T027-T030: ApiClient + TokenService実装
- T031-T034: NotificationBuilder実装
- T035-T038: ChannelManager実装
- T039-T040: ActionHandler実装

### Integration & Verification（T041-T050）
- T041: サンプルアプリ統合テスト
- T042: ProGuard/R8ビルドテスト
- T043: Android 7.0-14互換性テスト
- T044: メモリリークテスト
- T045: パフォーマンステスト（初期化時間、API呼び出し時間）
- T046: Unity JNIブリッジ実装
- T047: Unreal Engine C++ラッパー実装
- T048: .aar形式パッケージング
- T049: Maven Central公開準備
- T050: CI/CD設定（GitHub Actions）

### Polish（T051-T060）
- T051-T055: Unit tests（80%以上カバレッジ）
- T056: KDoc APIドキュメント生成
- T057: Quickstartガイド最終化
- T058: CHANGELOG.md作成
- T059: README.md作成
- T060: ライセンスファイル（Apache 2.0）

**並列実行可能タスク**: [P]マーク付与
- Setup T001-T005は並列実行可能
- Contract tests T006-T009は並列実行可能
- Integration tests T010-T014は独立実行可能
- Unit tests T051-T055は並列実行可能

**TDD順序強制**:
- 各Core実装タスクは必ずテストが先にコミットされる
- Gitコミット例: `feat(test): TokenManager Contract test` → `feat: TokenManager実装`

**依存関係**:
- T006-T015（Tests）が完了するまでT016-T040（Core）開始不可
- T016-T040（Core）が完了するまでT041-T050（Integration）開始不可

## 進捗トラッキング

- [x] Phase 0: 技術リサーチ（research.md）
- [x] Phase 1: 設計とコントラクト（data-model.md, contracts/, quickstart.md）
- [x] 憲章チェック再評価: 合格
- [x] Phase 2: タスク計画アプローチ記述
- [ ] Phase 2実行: /speckit.tasksコマンドでtasks.md生成
- [ ] Phase 3-4: 実装実行（手動またはツール経由）

## 憲章チェック（再評価）

**Phase 1設計後の再チェック**:

✅ **シンプルさ**: 単一SDKライブラリ、ラッパーなし、DTOなし
✅ **アーキテクチャ**: ライブラリとして提供、KDoc仕様準備
✅ **テスト**: TDDサイクル強制、Contract→Integration→E2E→Unit順序厳守
✅ **可観測性**: 構造化ロギング、エラーコンテキスト十分
✅ **バージョニング**: 1.0.0から開始、Semantic Versioning

**新しい違反**: なし

**設計変更**: 不要

## 次のステップ

1. `research.md`を作成（FCM統合技術詳細）
2. `data-model.md`を作成（SDK内部データモデル詳細）
3. `contracts/public-api.kt`を作成（Kotlin APIシグネチャ）
4. `contracts/rest-api.yaml`を作成（REST API連携仕様）
5. `quickstart.md`を作成（開発者向けガイド）
6. `/speckit.tasks`コマンドで`tasks.md`を生成

**準備完了**: /speckit.tasksコマンドの実行準備完了
