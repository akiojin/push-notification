# 実装計画: iOS用Push通知SDKライブラリ

**機能ID**: `SPEC-58d1c0d1` | **日付**: 2025-10-30 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/SPEC-58d1c0d1/spec.md`の機能仕様

## 実行フロー (/speckit.plan コマンドのスコープ)
```
1. ✅ 入力パスから機能仕様を読み込み
2. ✅ 技術コンテキストを記入（下記参照）
3. ✅ 憲章チェックセクションを評価 → 合格
4. ✅ Phase 0 を実行 → research.md 作成完了
5. ✅ Phase 1 を実行 → data-model.md, contracts/sdk-api.md, quickstart.md 作成完了
6. ✅ 憲章チェックセクションを再評価 → 合格
7. ✅ Phase 2 を計画 → タスク生成アプローチを記述（tasks.mdは/speckit.tasksで作成）
8. ✅ 停止 - /speckit.tasks コマンドの準備完了
```

- **重要**: /speckit.planコマンドはステップ7で停止します。Phase 2-4は他のコマンドで実行:
- Phase 2: /speckit.tasksコマンドがtasks.mdを作成
- Phase 3-4: 実装実行（手動またはツール経由）

## 概要

iOS用Push通知SDKライブラリは、ゲーム開発者がiOSアプリに簡単にPush通知機能を統合できるSwiftライブラリです。APNsと統合し、デバイストークン管理、通知受信ハンドラー、カスタムデータ処理、リッチ通知（画像・アクション）をサポートします。

**主要機能**:
1. 3行以内のコードでSDK初期化
2. 通知許可リクエストと自動トークン登録
3. 通知受信時のカスタムハンドラー（フォアグラウンド/バックグラウンド対応）
4. 通知タップ時のカスタムデータ取得
5. リッチ通知（画像、アクションボタン）
6. Unity/Unreal Engine統合のためのObjective-Cブリッジ
7. Swift Package Manager + CocoaPods対応

**技術アプローチ** (research.mdより):
- iOS標準の`UserNotifications` Framework使用
- `URLSession` でHTTP通信（デバイストークン登録）
- Objective-Cブリッジ + C関数エクスポートでUnity/UE対応
- XCTestでテスト（契約テスト、統合テスト、ユニットテスト）
- 外部依存なし（iOS標準フレームワークのみ）

---

## 技術コンテキスト

**言語/バージョン**: Swift 5.9+
**主要依存関係**: UserNotifications Framework, URLSession, Foundation（すべてiOS標準）
**ストレージ**: なし（トークンはメモリ内のみ保持）
**テスト**: XCTest, 実デバイステスト（APNsはシミュレーター非対応）
**対象プラットフォーム**: iOS 13.0+（Xcode 14.0+必須）
**プロジェクトタイプ**: single（SDKライブラリ単体）
**パフォーマンス目標**:
- SDK初期化: < 100ms
- トークン登録API呼び出し: < 3秒（ネットワーク正常時）
- 通知受信ハンドラー呼び出し: < 100ms
- メモリフットプリント: < 5MB
- バイナリサイズ: < 500KB（arm64）

**制約**:
- APNs通知ペイロードサイズ: 4KB以内
- Notification Service Extensionタイムアウト: 30秒
- iOS 13.0以上のみサポート（iOS 12以下は非対応）
- 実デバイスでのみAPNs動作（シミュレーター不可）

**スケール/スコープ**:
- 対象開発者数: 数百〜数千のゲーム開発者
- 通知受信頻度: 1デバイスあたり1日数回〜数十回
- SDK APIメソッド数: 約10個（シンプルなインターフェース）

---

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

### 初回チェック（Phase 0前）✅

**シンプルさ**:
- ✅ プロジェクト数: **1** (iOS SDKのみ)
- ✅ フレームワークを直接使用? **YES** - UserNotifications, URLSessionを直接使用、ラッパークラスなし
- ✅ 単一データモデル? **YES** - `Codable`構造体のみ、DTOなし
- ✅ パターン回避? **YES** - Repository/UoWパターンなし、シンプルなAPIクラス構造

**アーキテクチャ**:
- ✅ すべての機能をライブラリとして? **YES** - SDKライブラリとして提供、アプリコードなし
- ✅ ライブラリリスト:
  - `PushNotificationSDK`: 公開API、トークン管理、通知ハンドラー
- ✅ ライブラリごとのCLI: **N/A** - SDKライブラリのためCLI不要
- ✅ ライブラリドキュメント: llms.txt形式を計画? **YES** - quickstart.md、API仕様をLLM読みやすい形式で提供

**テスト (妥協不可)**:
- ✅ RED-GREEN-Refactorサイクルを強制? **YES** - TDD厳守
- ✅ Gitコミットはテストが実装より先に表示? **YES** - Contract tests → Implementation
- ✅ 順序: Contract→Integration→E2E→Unitを厳密に遵守? **YES**
  - Contract tests: SDK公開API仕様準拠（モックサーバー使用）
  - Integration tests: APNs通知受信フロー（実デバイス）
  - Unit tests: トークン検証、エラーハンドリング
- ✅ 実依存関係を使用? **YES** - 実APNs（デバイステスト）、実URLSession
- ✅ Integration testの対象: 新しいライブラリ、契約変更、共有スキーマ? **YES** - SDK公開API
- ✅ 禁止: テスト前の実装、REDフェーズのスキップ **遵守**

**可観測性**:
- ✅ 構造化ロギング含む? **YES** - OSLogフレームワーク使用
- ❌ フロントエンドログ → バックエンド? **N/A** - SDKライブラリのため該当なし
- ✅ エラーコンテキスト十分? **YES** - `PushNotificationError`で詳細なエラー情報＋解決策

**バージョニング**:
- ✅ バージョン番号割り当て済み? **YES** - 1.0.0（MAJOR.MINOR.BUILD形式）
- ✅ 変更ごとにBUILDインクリメント? **YES** - タグで管理
- ✅ 破壊的変更を処理? **YES** - `@available`属性で非推奨API管理、移行ガイド提供

### Phase 1後の再チェック ✅

**変更点**: なし（設計は憲章準拠を維持）

**追加確認**:
- ✅ データモデルが単一? **YES** - `Codable`構造体のみ、レイヤー間で同じモデル
- ✅ API契約がシンプル? **YES** - 公開APIメソッド7個のみ
- ✅ テストが契約ベース? **YES** - contracts/sdk-api.mdに基づくContract tests

---

## プロジェクト構造

### ドキュメント（この機能）
```
specs/SPEC-58d1c0d1/
├── spec.md              # 機能仕様書 (/speckit.specify 出力)
├── plan.md              # このファイル (/speckit.plan 出力)
├── research.md          # Phase 0 出力 (/speckit.plan コマンド) ✅
├── data-model.md        # Phase 1 出力 (/speckit.plan コマンド) ✅
├── quickstart.md        # Phase 1 出力 (/speckit.plan コマンド) ✅
├── contracts/           # Phase 1 出力 (/speckit.plan コマンド) ✅
│   └── sdk-api.md       # SDK公開API仕様
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド - まだ作成されていない)
```

### ソースコード（リポジトリルート）
```
# オプション1: 単一プロジェクト（SDK用）
ios-sdk/
├── Sources/
│   └── PushNotificationSDK/
│       ├── PushNotificationSDK.swift       # メインSDKクラス
│       ├── Configuration/
│       │   └── SDKConfiguration.swift      # 設定モデル
│       ├── TokenManagement/
│       │   ├── DeviceTokenManager.swift    # トークン管理
│       │   └── Models/
│       │       ├── DeviceTokenRegistrationRequest.swift
│       │       └── DeviceTokenRegistrationResponse.swift
│       ├── NotificationHandling/
│       │   ├── NotificationHandler.swift   # 通知ハンドラー
│       │   └── Models/
│       │       ├── NotificationPayload.swift
│       │       └── NotificationAction.swift
│       ├── ErrorHandling/
│       │   └── PushNotificationError.swift # エラー定義
│       ├── Networking/
│       │   └── APIClient.swift             # HTTP通信
│       ├── Logging/
│       │   └── Logger.swift                # ログユーティリティ
│       └── Bridges/
│           ├── PushNotificationSDKBridge.h # Objective-Cブリッジヘッダー
│           ├── PushNotificationSDKBridge.m # Objective-Cブリッジ実装
│           └── UnityPushSDKBridge.h        # Unity C関数エクスポート
│
├── Tests/
│   ├── ContractTests/
│   │   ├── SDKConfigurationContractTests.swift
│   │   ├── NotificationPermissionContractTests.swift
│   │   ├── DeviceTokenRegistrationContractTests.swift
│   │   └── NotificationHandlerContractTests.swift
│   ├── IntegrationTests/
│   │   ├── APNsIntegrationTests.swift      # 実デバイステスト
│   │   ├── BackendAPIIntegrationTests.swift
│   │   └── NotificationFlowIntegrationTests.swift
│   └── UnitTests/
│       ├── DeviceTokenValidationTests.swift
│       ├── ErrorHandlingTests.swift
│       ├── NotificationPayloadParsingTests.swift
│       └── APIClientTests.swift
│
├── Package.swift                           # Swift Package Manager設定
├── PushNotificationSDK.podspec             # CocoaPods設定
├── NotificationServiceExtension/           # リッチ通知用Extension（サンプル）
│   └── NotificationService.swift
├── Examples/                               # サンプルプロジェクト
│   ├── SwiftExample/
│   └── UnityExample/
└── README.md
```

**構造決定**: オプション1（単一プロジェクト）- SDKライブラリのみ

---

## Phase 0: アウトライン＆リサーチ ✅

### 実行済み

1. ✅ **技術コンテキストから不明点を抽出**:
   - APNs統合ライブラリの選択 → UserNotifications Framework決定
   - HTTP通信ライブラリ → URLSession決定
   - Unity/UEブリッジ方式 → Objective-C + C関数エクスポート決定
   - 配布方法 → SPM優先、CocoaPods対応決定
   - テスト戦略 → XCTest + 実デバイステスト決定
   - リッチ通知実装 → Notification Service Extension決定
   - エラーハンドリング → Swift Result型 + カスタムエラー決定
   - ログ → OSLog決定

2. ✅ **research.md に統合** ([research.md](./research.md) 参照)
   - 各技術選択の理由と代替案を文書化
   - 実装詳細とコード例を含む
   - 憲章準拠を確認

**出力**: ✅ すべての要明確化が解決されたresearch.md

---

## Phase 1: 設計＆契約 ✅

### 実行済み

1. ✅ **機能仕様からエンティティを抽出** → `data-model.md`:
   - SDKConfiguration: 初期化設定
   - DeviceTokenRegistrationRequest/Response: トークン登録
   - NotificationPayload: 通知データ
   - NotificationAction: アクションボタン
   - PushNotificationError: エラー定義

2. ✅ **機能要件からAPI契約を生成**:
   - `contracts/sdk-api.md` に7つの公開APIを定義:
     1. `PushNotificationSDK.configure(_:)` - SDK初期化
     2. `requestNotificationPermission(options:completion:)` - 通知許可
     3. `registerDeviceToken(_:)` - トークン登録（内部API）
     4. `onNotificationReceived` - 通知受信ハンドラー
     5. `onNotificationActionTapped` - アクションハンドラー
     6. `onError` - エラーハンドラー
     7. Unity/UEブリッジAPI（Objective-C + C関数）

3. ✅ **契約から契約テストを生成**（計画）:
   - 各APIに対してContract testケースを定義
   - テストは失敗する必要がある（まだ実装なし）

4. ✅ **ユーザーストーリーからテストシナリオを抽出**:
   - ストーリー1（P1）: 簡単な統合 → SDK初期化、通知許可、トークン登録
   - ストーリー2（P2）: カスタム画面遷移 → 通知受信ハンドラー、カスタムデータ処理
   - ストーリー3（P3）: リッチ通知 → 画像通知、アクションボタン
   - quickstart.mdに統合テストシナリオを含む

5. ✅ **エージェントファイルを漸進的に更新**:
   - 該当なし（既存プロジェクトではないため、CLAUDE.md等は別途作成）

**出力**: ✅ data-model.md, contracts/sdk-api.md, quickstart.md

---

## Phase 2: タスク計画アプローチ
*このセクションは/speckit.tasksコマンドが実行することを記述 - /speckit.plan中は実行しない*

### タスク生成戦略

**/speckit.tasksコマンドは以下の戦略でtasks.mdを生成する:**

1. **セットアップタスク**（並列実行可能）:
   - T001: Xcodeプロジェクト作成（Package.swift設定）
   - T002: ディレクトリ構造作成（Sources/, Tests/）
   - T003: .gitignore設定
   - T004: CocoaPods設定（.podspec作成）

2. **Contract Testsタスク**（Phase 1設計から生成、並列実行可能）:
   - T005 [P]: SDK初期化Contract test作成
   - T006 [P]: 通知許可Contract test作成
   - T007 [P]: トークン登録Contract test作成
   - T008 [P]: 通知受信ハンドラーContract test作成
   - T009 [P]: アクションハンドラーContract test作成
   - T010 [P]: エラーハンドリングContract test作成
   - T011 [P]: Unity/UEブリッジContract test作成
   - **すべてのContract testsは最初に失敗する必要がある（RED）**

3. **データモデルタスク**（data-model.mdから生成、並列実行可能）:
   - T012 [P]: SDKConfiguration実装
   - T013 [P]: DeviceTokenRegistrationRequest/Response実装
   - T014 [P]: NotificationPayload実装
   - T015 [P]: NotificationAction実装
   - T016 [P]: PushNotificationError実装

4. **コア実装タスク**（TDD順序: テスト → 実装）:
   - T017: APIClient実装（URLSessionラッパー）
   - T018: Contract test T005合格（SDK初期化実装）
   - T019: Contract test T006合格（通知許可実装）
   - T020: DeviceTokenManager実装
   - T021: Contract test T007合格（トークン登録実装）
   - T022: NotificationHandler実装
   - T023: Contract test T008合格（通知受信ハンドラー実装）
   - T024: Contract test T009合格（アクションハンドラー実装）
   - T025: Contract test T010合格（エラーハンドリング実装）
   - T026: Logger実装（OSLog統合）

5. **ブリッジ実装タスク**:
   - T027: Objective-Cブリッジヘッダー作成
   - T028: Objective-Cブリッジ実装
   - T029: Unity C関数エクスポート実装
   - T030: Contract test T011合格（ブリッジテスト合格）

6. **Integration Testsタスク**（実デバイス必須）:
   - T031: APNs統合テスト作成（実デバイス）
   - T032: バックエンドAPI統合テスト作成
   - T033: 通知フロー統合テスト作成（フォアグラウンド）
   - T034: 通知フロー統合テスト作成（バックグラウンド）
   - T035: リッチ通知統合テスト作成（画像）
   - T036: アクション通知統合テスト作成

7. **Notification Service Extension実装**:
   - T037: NotificationServiceExtension target作成
   - T038: 画像ダウンロード実装
   - T039: Integration test T035合格

8. **Unit Testsタスク**（80%カバレッジ目標）:
   - T040 [P]: デバイストークン検証Unit test
   - T041 [P]: 通知ペイロードパースUnit test
   - T042 [P]: APIClientエラーハンドリングUnit test
   - T043 [P]: ネットワークリトライロジックUnit test
   - T044 [P]: カスタムデータJSON変換Unit test

9. **サンプル＆ドキュメントタスク**:
   - T045: Swiftサンプルプロジェクト作成
   - T046: UnityサンプルプロジェクトC#コード作成
   - T047: README.md作成（使用方法、インストール）
   - T048: API Referenceドキュメント生成（DocC）

10. **検証＆ポリッシュタスク**:
    - T049: 全Contract tests実行・合格確認
    - T050: 全Integration tests実行・合格確認
    - T051: 全Unit tests実行・合格確認
    - T052: コードカバレッジ確認（80%以上）
    - T053: パフォーマンステスト実行（初期化<100ms、ハンドラー<100ms）
    - T054: メモリリーク検出（Instruments）
    - T055: quickstart.md手順検証（実機テスト）
    - T056: ドキュメントレビュー（誤字脱字、コード例動作確認）

### 順序戦略

1. **TDD順序厳守**:
   - Contract tests（T005-T011）→ データモデル（T012-T016）→ コア実装（T017-T026）
   - テストが実装より先に来る

2. **依存関係順序**:
   - データモデル → APIClient → SDK初期化 → 通知ハンドラー → ブリッジ
   - Integration tests は Contract tests 合格後

3. **並列実行**:
   - セットアップタスク（T001-T004）: 並列実行可能
   - Contract testsタスク（T005-T011）: 並列実行可能 [P]
   - データモデルタスク（T012-T016）: 並列実行可能 [P]
   - Unit testsタスク（T040-T044）: 並列実行可能 [P]

### 推定出力

**tasks.mdに約56個の番号付き、順序付きタスク**

**カテゴリ別内訳**:
- Setup: 4タスク
- Contract Tests: 7タスク
- Data Models: 5タスク
- Core Implementation: 10タスク
- Bridges: 4タスク
- Integration Tests: 6タスク
- Notification Service Extension: 3タスク
- Unit Tests: 5タスク
- Samples & Docs: 4タスク
- Verification & Polish: 8タスク

**重要**: このフェーズは/speckit.tasksコマンドで実行、/speckit.planではない

---

## Phase 3+: 今後の実装
*これらのフェーズは/planコマンドのスコープ外*

**Phase 3**: タスク実行（/speckit.tasksコマンドがtasks.mdを作成）
**Phase 4**: 実装（憲章原則に従ってtasks.mdを実行）
- TDDサイクル厳守: RED → GREEN → Refactor
- 実デバイステストで統合テスト実行
- コードカバレッジ80%以上達成

**Phase 5**: 検証（テスト実行、quickstart.md実行、パフォーマンス検証）
- すべてのContract/Integration/Unit testsが合格
- quickstart.mdの手順が実機で動作
- パフォーマンス目標達成（初期化<100ms、ハンドラー<100ms）
- メモリリークなし
- バイナリサイズ<500KB

---

## 複雑さトラッキング
*憲章チェックに正当化が必要な違反がある場合のみ記入*

**違反なし** - すべての憲章要件を満たしています。

---

## 進捗トラッキング
*このチェックリストは実行フロー中に更新される*

### フェーズステータス

- [x] Phase 0: Research完了 (/speckit.plan コマンド)
- [x] Phase 1: Design完了 (/speckit.plan コマンド)
- [x] Phase 2: Task planning完了 (/speckit.plan コマンド - アプローチのみ記述)
- [ ] Phase 3: Tasks生成済み (/speckit.tasks コマンド)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

### ゲートステータス

- [x] 初期憲章チェック: 合格
- [x] 設計後憲章チェック: 合格
- [x] すべての要明確化解決済み
- [x] 複雑さの逸脱を文書化済み（違反なし）

### Phase 1 成果物チェックリスト

- [x] research.md作成完了
- [x] data-model.md作成完了
- [x] contracts/sdk-api.md作成完了
- [x] quickstart.md作成完了
- [ ] CLAUDE.md更新（該当なし - 新規プロジェクト）

---

**計画完了日**: 2025-10-30
**次のステップ**: `/speckit.tasks SPEC-58d1c0d1` を実行してtasks.mdを生成

---

*憲章 v1.0.0 に基づく - `/memory/constitution.md` 参照*
