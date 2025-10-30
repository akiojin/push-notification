# タスク: iOS用Push通知SDKライブラリ

**入力**: `/specs/SPEC-58d1c0d1/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/sdk-api.md

## 実行フロー

```
1. ✅ 機能ディレクトリからplan.mdを読み込み
   → 技術スタック: Swift 5.9+, UserNotifications, URLSession
   → ライブラリ: PushNotificationSDK
2. ✅ 設計ドキュメントを読み込み:
   → data-model.md: 6エンティティ抽出
   → contracts/sdk-api.md: 7つの公開API確認
   → research.md: 技術決定確認
3. ✅ カテゴリ別にタスクを生成（Setup → Tests → Core → Integration → Polish）
4. ✅ タスクルールを適用（並列実行 [P] マーク、TDD順序）
5. ✅ タスクを順次番号付け (T001-T056)
6. ✅ 依存関係グラフを生成
7. ✅ タスク完全性を検証
8. ✅ SUCCESS (タスク実行準備完了)
```

## フォーマット: `[ID] [P?] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含める

## パス規約

- **単一プロジェクト**: `ios-sdk/`ディレクトリ内にSwift Package構造
- `ios-sdk/Sources/PushNotificationSDK/` - ソースコード
- `ios-sdk/Tests/` - テストコード
- `ios-sdk/Package.swift` - SPM設定

---

## Phase 3.1: セットアップ

- [ ] **T001** [P] `ios-sdk/Package.swift` にSwift Package設定を作成（iOS 13.0+、Swift 5.9）
- [ ] **T002** [P] `ios-sdk/.gitignore` にXcode固有のignoreパターンを設定
- [ ] **T003** [P] `ios-sdk/PushNotificationSDK.podspec` にCocoaPods設定を作成（バージョン1.0.0）
- [ ] **T004** plan.mdのプロジェクト構造に従ってディレクトリを作成（Sources/, Tests/ContractTests/, Tests/IntegrationTests/, Tests/UnitTests/）

---

## Phase 3.2: テストファースト (TDD) ⚠️ 3.3の前に完了必須

**重要: これらのテストは記述され、実装前に失敗する必要がある（RED）**

### Contract Tests（並列実行可能）

- [ ] **T005** [P] `ios-sdk/Tests/ContractTests/SDKConfigurationContractTests.swift` にSDK初期化契約テストを作成
  - ✅ 有効な設定で初期化成功
  - ✅ 無効なAPIURL（非HTTPS）でエラー
  - ✅ 短すぎるAPIキー（8文字未満）でエラー
  - ✅ 無効なタイムアウト（5秒未満または120秒超）でエラー

- [ ] **T006** [P] `ios-sdk/Tests/ContractTests/NotificationPermissionContractTests.swift` に通知許可契約テストを作成
  - ✅ ユーザーが許可した場合、`success(true)`
  - ✅ ユーザーが拒否した場合、`success(false)`
  - ✅ 2回目以降の呼び出しで既存設定を返す

- [ ] **T007** [P] `ios-sdk/Tests/ContractTests/DeviceTokenRegistrationContractTests.swift` にトークン登録契約テストを作成
  - ✅ 有効なトークンで登録成功
  - ✅ 無効なトークン（非16進数）でエラー
  - ✅ ネットワークエラー時にリトライ（最大3回）
  - ✅ サーバーエラー時に適切なエラーメッセージ

- [ ] **T008** [P] `ios-sdk/Tests/ContractTests/NotificationHandlerContractTests.swift` に通知受信ハンドラー契約テストを作成
  - ✅ フォアグラウンド通知受信時、ハンドラーが呼ばれる
  - ✅ バックグラウンド通知タップ時、ハンドラーが呼ばれる
  - ✅ `NotificationPayload`が正しくパースされる
  - ✅ カスタムデータがJSONとして取得可能

- [ ] **T009** [P] `ios-sdk/Tests/ContractTests/ActionHandlerContractTests.swift` にアクションハンドラー契約テストを作成
  - ✅ アクションタップ時、正しい識別子が渡される
  - ✅ 通知ペイロードが同時に渡される
  - ✅ 複数アクションが定義されている場合、正しく区別される

- [ ] **T010** [P] `ios-sdk/Tests/ContractTests/ErrorHandlingContractTests.swift` にエラーハンドリング契約テストを作成
  - ✅ トークン登録失敗時、`serverError`が通知される
  - ✅ ネットワークエラー時、`networkError`が通知される
  - ✅ エラーに解決策が含まれる

- [ ] **T011** [P] `ios-sdk/Tests/ContractTests/UnityBridgeContractTests.swift` にUnity/UEブリッジ契約テストを作成
  - ✅ Objective-Cブリッジ経由でSwift APIを呼び出せる
  - ✅ C関数エクスポートが正しく動作
  - ✅ JSON文字列として通知ペイロードが返る

---

## Phase 3.3: コア実装 (テストが失敗した後のみ)

### データモデル実装（並列実行可能）

- [ ] **T012** [P] `ios-sdk/Sources/PushNotificationSDK/Configuration/SDKConfiguration.swift` にSDKConfiguration構造体を実装
  - フィールド: apiURL, apiKey, playerAccountId, enableLogging, requestTimeout
  - 検証ロジック: HTTPS必須、APIキー8文字以上、タイムアウト5-120秒

- [ ] **T013** [P] `ios-sdk/Sources/PushNotificationSDK/TokenManagement/Models/` にDeviceTokenRegistrationRequest/Response構造体を実装
  - Request: token（64文字16進数）, platform（"iOS"固定）, playerAccountId
  - Response: id, token, platform, playerAccountId, createdAt, updatedAt

- [ ] **T014** [P] `ios-sdk/Sources/PushNotificationSDK/NotificationHandling/Models/NotificationPayload.swift` にNotificationPayload構造体を実装
  - フィールド: title, body, imageUrl, customData, actions, badge, sound
  - APNs userInfo辞書からの変換ロジック

- [ ] **T015** [P] `ios-sdk/Sources/PushNotificationSDK/NotificationHandling/Models/NotificationAction.swift` にNotificationAction構造体を実装
  - フィールド: identifier, title, options
  - カテゴリIDから定義済みアクションセットを取得

- [ ] **T016** [P] `ios-sdk/Sources/PushNotificationSDK/ErrorHandling/PushNotificationError.swift` にPushNotificationError列挙型を実装
  - ケース: permissionDenied, invalidToken, invalidConfiguration, networkError, serverError, decodingError
  - LocalizedError準拠、recoverySuggestion提供

### ネットワーク＆SDK初期化

- [ ] **T017** `ios-sdk/Sources/PushNotificationSDK/Networking/APIClient.swift` にAPIClient実装（URLSessionラッパー）
  - async/awaitパターン
  - JSONエンコード/デコード
  - エラーハンドリング＆リトライロジック

- [ ] **T018** `ios-sdk/Sources/PushNotificationSDK/PushNotificationSDK.swift` にSDK初期化実装（Contract test T005合格）
  - `configure(_:)` メソッド
  - シングルトンパターン
  - 設定検証

- [ ] **T019** `ios-sdk/Sources/PushNotificationSDK/PushNotificationSDK.swift` に通知許可リクエスト実装（Contract test T006合格）
  - `requestNotificationPermission(options:completion:)` メソッド
  - UNUserNotificationCenter統合

- [ ] **T020** `ios-sdk/Sources/PushNotificationSDK/TokenManagement/DeviceTokenManager.swift` にDeviceTokenManager実装（actor使用）
  - デバイストークン保持
  - トークン検証ロジック
  - バックエンドAPI呼び出し

- [ ] **T021** `ios-sdk/Sources/PushNotificationSDK/TokenManagement/DeviceTokenManager.swift` にトークン登録実装（Contract test T007合格）
  - `registerDeviceToken(_:)` メソッド
  - リトライロジック（最大3回）
  - エラーハンドリング

- [ ] **T022** `ios-sdk/Sources/PushNotificationSDK/NotificationHandling/NotificationHandler.swift` にNotificationHandler実装
  - UNUserNotificationCenterDelegate準拠
  - フォアグラウンド/バックグラウンド通知処理
  - ペイロードパース

- [ ] **T023** `ios-sdk/Sources/PushNotificationSDK/PushNotificationSDK.swift` に通知受信ハンドラー実装（Contract test T008合格）
  - `onNotificationReceived` クロージャ
  - メインスレッド呼び出し保証

- [ ] **T024** `ios-sdk/Sources/PushNotificationSDK/PushNotificationSDK.swift` にアクションハンドラー実装（Contract test T009合格）
  - `onNotificationActionTapped` クロージャ
  - アクション識別子抽出

- [ ] **T025** `ios-sdk/Sources/PushNotificationSDK/PushNotificationSDK.swift` にエラーハンドラー実装（Contract test T010合格）
  - `onError` クロージャ
  - すべてのエラーケースで呼び出し

- [ ] **T026** `ios-sdk/Sources/PushNotificationSDK/Logging/Logger.swift` にLogger実装（OSLog統合）
  - OSLogフレームワーク使用
  - iOS 13フォールバック（print）
  - デバッグログon/off制御

---

## Phase 3.4: ブリッジ実装

- [ ] **T027** `ios-sdk/Sources/PushNotificationSDK/Bridges/PushNotificationSDKBridge.h` にObjective-Cブリッジヘッダーを作成
  - Swift APIをObjective-Cから呼び出せるインターフェース定義

- [ ] **T028** `ios-sdk/Sources/PushNotificationSDK/Bridges/PushNotificationSDKBridge.m` にObjective-Cブリッジ実装を作成
  - Swiftクラスをラップ
  - Objective-C互換のメソッド提供

- [ ] **T029** `ios-sdk/Sources/PushNotificationSDK/Bridges/UnityPushSDKBridge.h` にUnity C関数エクスポートを実装
  - `extern "C"` で関数エクスポート
  - Unity P/Invoke互換のシグネチャ

- [ ] **T030** `ios-sdk/Tests/ContractTests/UnityBridgeContractTests.swift` のContract test T011合格確認
  - ブリッジ経由でSDK初期化
  - JSON文字列での通知ペイロード受け取り

---

## Phase 3.5: 統合テスト

**注意: 実デバイスでのみAPNsが動作するため、実機テスト必須**

- [ ] **T031** `ios-sdk/Tests/IntegrationTests/APNsIntegrationTests.swift` にAPNs統合テストを作成（実デバイス）
  - デバイストークン取得成功確認
  - 通知受信確認
  - **手動トリガー必要**: バックエンドから実際に通知送信

- [ ] **T032** `ios-sdk/Tests/IntegrationTests/BackendAPIIntegrationTests.swift` にバックエンドAPI統合テストを作成
  - デバイストークン登録API呼び出し
  - レスポンス検証
  - **前提**: バックエンドサーバー（SPEC-2d193ce6）が稼働している

- [ ] **T033** `ios-sdk/Tests/IntegrationTests/NotificationFlowIntegrationTests.swift` にフォアグラウンド通知フロー統合テストを作成
  - アプリ起動中に通知受信
  - ハンドラー呼び出し確認
  - カスタムデータ取得確認

- [ ] **T034** `ios-sdk/Tests/IntegrationTests/NotificationFlowIntegrationTests.swift` にバックグラウンド通知フロー統合テストを作成
  - 通知タップでアプリ起動
  - ハンドラー呼び出し確認

- [ ] **T035** `ios-sdk/Tests/IntegrationTests/RichNotificationIntegrationTests.swift` にリッチ通知（画像）統合テストを作成
  - 画像URL含む通知受信
  - 画像表示確認
  - **前提**: Notification Service Extension実装済み（T037-T039）

- [ ] **T036** `ios-sdk/Tests/IntegrationTests/ActionNotificationIntegrationTests.swift` にアクション通知統合テストを作成
  - アクションボタン付き通知受信
  - アクションタップ確認
  - ハンドラー呼び出し確認

---

## Phase 3.6: Notification Service Extension

- [ ] **T037** `ios-sdk/NotificationServiceExtension/` にNotification Service Extension targetを作成
  - Xcode target設定
  - Info.plist設定

- [ ] **T038** `ios-sdk/NotificationServiceExtension/NotificationService.swift` に画像ダウンロード実装
  - URLSessionで画像ダウンロード
  - UNNotificationAttachment作成
  - 30秒タイムアウト処理

- [ ] **T039** Integration test T035（リッチ通知テスト）合格確認
  - 画像付き通知が正しく表示される

---

## Phase 3.7: Unit Tests（並列実行可能）

- [ ] **T040** [P] `ios-sdk/Tests/UnitTests/DeviceTokenValidationTests.swift` にデバイストークン検証Unit testを作成
  - 64文字16進数トークンの検証成功
  - 無効なトークン（短い、非16進数）の検証失敗

- [ ] **T041** [P] `ios-sdk/Tests/UnitTests/NotificationPayloadParsingTests.swift` に通知ペイロードパースUnit testを作成
  - APNs userInfo辞書から正しくNotificationPayloadに変換
  - カスタムデータJSON変換

- [ ] **T042** [P] `ios-sdk/Tests/UnitTests/APIClientErrorHandlingTests.swift` にAPIClientエラーハンドリングUnit testを作成
  - ネットワークエラー検出
  - サーバーエラー（4xx, 5xx）検出
  - タイムアウトエラー検出

- [ ] **T043** [P] `ios-sdk/Tests/UnitTests/NetworkRetryLogicTests.swift` にネットワークリトライロジックUnit testを作成
  - 最大3回リトライ確認
  - 指数バックオフ確認

- [ ] **T044** [P] `ios-sdk/Tests/UnitTests/CustomDataJSONConversionTests.swift` にカスタムデータJSON変換Unit testを作成
  - Dictionary → JSON文字列変換
  - JSON文字列 → Dictionary変換
  - 不正なJSON処理

---

## Phase 3.8: サンプル＆ドキュメント

- [ ] **T045** `ios-sdk/Examples/SwiftExample/` にSwiftサンプルプロジェクトを作成
  - AppDelegateでSDK初期化
  - 通知受信ハンドラー設定
  - quickstart.mdの手順を実装

- [ ] **T046** `ios-sdk/Examples/UnityExample/PushNotificationManager.cs` にUnityサンプルC#コードを作成
  - P/Invoke宣言
  - SDK初期化呼び出し
  - 通知受信コールバック

- [ ] **T047** `ios-sdk/README.md` を作成（使用方法、インストール）
  - インストール方法（SPM, CocoaPods）
  - 基本的な使用例
  - APIドキュメントへのリンク

- [ ] **T048** `ios-sdk/` にDocC API Referenceドキュメントを生成
  - すべての公開APIにドキュメントコメント
  - コード例を含む
  - `docc` コマンドで生成

---

## Phase 3.9: 検証＆ポリッシュ

- [ ] **T049** 全Contract tests実行・合格確認（T005-T011）
  - `swift test --filter ContractTests`
  - すべてのテストが合格

- [ ] **T050** 全Integration tests実行・合格確認（T031-T036）
  - **実デバイス必須**
  - すべてのテストが合格

- [ ] **T051** 全Unit tests実行・合格確認（T040-T044）
  - `swift test --filter UnitTests`
  - すべてのテストが合格

- [ ] **T052** コードカバレッジ確認（80%以上）
  - `swift test --enable-code-coverage`
  - カバレッジレポート生成

- [ ] **T053** パフォーマンステスト実行（初期化<100ms、ハンドラー<100ms）
  - XCTestのMeasureブロック使用
  - パフォーマンス目標達成確認

- [ ] **T054** メモリリーク検出（Instruments）
  - Leaksインストゥルメント実行
  - 循環参照チェック（特にクロージャ）

- [ ] **T055** quickstart.md手順検証（実機テスト）
  - quickstart.mdの手順を1つずつ実行
  - すべての手順が正しく動作することを確認

- [ ] **T056** ドキュメントレビュー（誤字脱字、コード例動作確認）
  - README.md, quickstart.md, API仕様のレビュー
  - すべてのコード例が実際に動作することを確認

---

## 依存関係

```
Setup (T001-T004)
  ↓
Contract Tests (T005-T011) [並列実行可能]
  ↓
Data Models (T012-T016) [並列実行可能]
  ↓
Core Implementation (T017-T026) [順次実行]
  ├─ T017 (APIClient)
  ├─ T018-T019 (SDK初期化、通知許可) ← T012依存
  ├─ T020-T021 (トークン管理) ← T013, T017依存
  ├─ T022-T025 (通知ハンドラー、アクション、エラー) ← T014, T015, T016依存
  └─ T026 (Logger)
  ↓
Bridges (T027-T030) ← T018-T025依存
  ↓
Integration Tests (T031-T036) ← Contract tests合格必須
  ↓
Notification Service Extension (T037-T039) ← T038がT035をブロック
  ↓
Unit Tests (T040-T044) [並列実行可能] ← 実装完了後
  ↓
Samples & Docs (T045-T048) [並列実行可能]
  ↓
Verification & Polish (T049-T056) [順次実行] ← すべての実装とテスト完了後
```

**ブロッキング関係**:
- T005-T011（Contract tests）が T012-T026（実装）をブロック（TDD）
- T017（APIClient）が T020-T021（トークン管理）をブロック
- T012（SDKConfiguration）が T018（SDK初期化）をブロック
- T013-T016（データモデル）が T020-T025（コア実装）をブロック
- T018-T025（コア実装）が T027-T030（ブリッジ）をブロック
- T038（画像ダウンロード実装）が T035（リッチ通知テスト）をブロック
- すべての実装が T040-T056（Unit tests, Samples, Verification）をブロック

---

## 並列実行例

### Setup フェーズ (T001-T003)

```
Task: "ios-sdk/Package.swift にSwift Package設定を作成"
Task: "ios-sdk/.gitignore にXcode固有のignoreパターンを設定"
Task: "ios-sdk/PushNotificationSDK.podspec にCocoaPods設定を作成"
# 3つのタスクを同時実行可能（異なるファイル）
```

### Contract Tests フェーズ (T005-T011)

```
Task: "ios-sdk/Tests/ContractTests/SDKConfigurationContractTests.swift にSDK初期化契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/NotificationPermissionContractTests.swift に通知許可契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/DeviceTokenRegistrationContractTests.swift にトークン登録契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/NotificationHandlerContractTests.swift に通知受信ハンドラー契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/ActionHandlerContractTests.swift にアクションハンドラー契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/ErrorHandlingContractTests.swift にエラーハンドリング契約テストを作成"
Task: "ios-sdk/Tests/ContractTests/UnityBridgeContractTests.swift にUnity/UEブリッジ契約テストを作成"
# 7つのテストファイルを同時作成可能
```

### Data Models フェーズ (T012-T016)

```
Task: "ios-sdk/Sources/PushNotificationSDK/Configuration/SDKConfiguration.swift にSDKConfiguration構造体を実装"
Task: "ios-sdk/Sources/PushNotificationSDK/TokenManagement/Models/ にDeviceTokenRegistrationRequest/Response構造体を実装"
Task: "ios-sdk/Sources/PushNotificationSDK/NotificationHandling/Models/NotificationPayload.swift にNotificationPayload構造体を実装"
Task: "ios-sdk/Sources/PushNotificationSDK/NotificationHandling/Models/NotificationAction.swift にNotificationAction構造体を実装"
Task: "ios-sdk/Sources/PushNotificationSDK/ErrorHandling/PushNotificationError.swift にPushNotificationError列挙型を実装"
# 5つのモデルファイルを同時実装可能
```

### Unit Tests フェーズ (T040-T044)

```
Task: "ios-sdk/Tests/UnitTests/DeviceTokenValidationTests.swift にデバイストークン検証Unit testを作成"
Task: "ios-sdk/Tests/UnitTests/NotificationPayloadParsingTests.swift に通知ペイロードパースUnit testを作成"
Task: "ios-sdk/Tests/UnitTests/APIClientErrorHandlingTests.swift にAPIClientエラーハンドリングUnit testを作成"
Task: "ios-sdk/Tests/UnitTests/NetworkRetryLogicTests.swift にネットワークリトライロジックUnit testを作成"
Task: "ios-sdk/Tests/UnitTests/CustomDataJSONConversionTests.swift にカスタムデータJSON変換Unit testを作成"
# 5つのUnit testファイルを同時作成可能
```

---

## 注意事項

1. **[P] タスク**: 異なるファイルを操作するため、並列実行可能。依存関係なし。
2. **実装前にテストが失敗することを確認**: TDD原則厳守。Contract testsはREDフェーズから開始。
3. **各タスク後にコミット**: 小さな変更を頻繁にコミット（日本語コミットメッセージ推奨）。
4. **実デバイステスト必須**: APNsはシミュレーターで動作しない。Integration tests（T031-T036）は実機必須。
5. **回避事項**: 曖昧なタスク、同じファイルの競合、テスト前の実装。

---

## 検証チェックリスト

*ゲート: タスク生成完了確認*

- [x] すべてのcontracts（7つのAPI）に対応するContract testがある（T005-T011）
- [x] すべてのentities（6つのモデル）にmodelタスクがある（T012-T016）
- [x] すべてのContract testsが実装より先にある（T005-T011 → T012-T026）
- [x] 並列タスクは本当に独立している（異なるファイル）
- [x] 各タスクは正確なファイルパスを指定
- [x] 同じファイルを変更する[P]タスクがない

---

**タスク総数**: 56タスク
**推定完了時間**: 約15-20日（1日3-4タスクペース）
**次のステップ**: T001から順次実行、TDD厳守

---

*テンプレートバージョン: 2.1.0*
*憲章 v1.0.0 準拠*
