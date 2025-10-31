# 実装計画: Unreal Engine Push通知Plugin

**機能ID**: `SPEC-bfa1680e` | **日付**: 2025-10-30 | **仕様**: [spec.md](./spec.md)
**入力**: `/push-notification/specs/SPEC-bfa1680e/spec.md`の機能仕様

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

Unreal Engine Push通知Pluginは、Unreal開発者がモバイルゲームにPush通知機能を簡単に統合できるC++ライブラリです。iOS Native SDK（SPEC-58d1c0d1）とAndroid Native SDK（SPEC-628d6000）をUnreal C++ APIでラップし、プラットフォーム自動検出、Unreal Editor疑似通知サポート、Blueprint完全対応を提供します。

**主要機能**:
- 3行コードで初期化完了（C++/Blueprint両対応、iOS/Android両プラットフォーム対応）
- プラットフォーム自動検出（iOS/Android/Unreal Editor）
- Unreal Editorでの疑似通知送受信（実機なしで動作確認）
- 通知受信・タップ時のゲームスレッドデリゲート実行
- Blueprint完全対応（C++なしで開発可能）
- Unreal Engine Plugin形式（.uplugin）

## 技術コンテキスト

**言語/バージョン**: C++17
**主要依存関係**:
- Unreal Engine 5.3+（最小対応バージョン）
- iOS Native SDK（SPEC-58d1c0d1）- .framework形式
- Android Native SDK（SPEC-628d6000）- .aar形式
- Core Unreal Modules: Core, CoreUObject, Engine, Slate, SlateCore

**ストレージ**: GameInstance内メモリ管理（トークン・設定）
**テスト**: Unreal Automation Testing Framework + Google Test
**対象プラットフォーム**: iOS 14+、Android 7.0+、Unreal Editor（モック）
**プロジェクトタイプ**: single（Unreal Engine Plugin単体）
**パフォーマンス目標**:
- Plugin初期化: 3秒以内（起動時）
- 通知コールバック遅延: 0.5秒以内（受信→Unreal実行）
- Editor疑似通知応答: 0.1秒以内
- メモリ使用量: 5MB以下

**制約**:
- C++17準拠（Unreal Engine 5.3制約）
- iOS Platform File使用（Objective-C++ブリッジ）
- Android JNI使用（Java/Kotlinブリッジ）
- ゲームスレッド実行保証（Unreal API制約）
- .uplugin形式配布

**スケール/スコープ**:
- 対象: Unrealゲーム開発者（C++/Blueprint経験者）
- 配布: .uplugin形式（Git/Marketplace）
- サンプルマップ提供（Editor疑似通知UI含む）

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:
- プロジェクト数: 1（unreal-plugin単体）
- フレームワークを直接使用? ✓（Unreal API直接使用、ラッパーなし）
- 単一データモデル? ✓（FPushNotificationData、FPushNotificationConfig共通使用、DTO不要）
- パターン回避? ✓（GameInstanceSubsystemのみ、他パターン不使用）

**アーキテクチャ**:
- すべての機能をライブラリとして? ✓（Pluginライブラリとして提供）
- ライブラリリスト:
  1. `PushNotificationPlugin` - Unreal Plugin（初期化、プラットフォームブリッジ、デリゲート管理）
- ライブラリごとのCLI: N/A（Pluginライブラリのため不要）
- ライブラリドキュメント: Unreal Doc形式API仕様 + quickstart.md

**テスト (妥協不可)**:
- RED-GREEN-Refactorサイクルを強制? ✓
- Gitコミットはテストが実装より先に表示? ✓
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? ✓
- 実依存関係を使用? ✓（Unreal Automation Testing実環境、モックなし）
- Integration testの対象: Native SDK呼び出し、Editor疑似通知、デリゲート実行
- 禁止: テスト前の実装、REDフェーズのスキップ

**可観測性**:
- 構造化ロギング含む? ✓（UE_LOG + カスタムLogCategoryクラス）
- フロントエンドログ → バックエンド? N/A（Pluginライブラリのためローカルログのみ）
- エラーコンテキスト十分? ✓（エラーコード、メッセージ、スタックトレース）

**バージョニング**:
- バージョン番号割り当て済み? ✓（1.0.0から開始、MAJOR.MINOR.PATCH形式）
- 変更ごとにPATCHインクリメント? ✓（.uplugin versionフィールド使用）
- 破壊的変更を処理? ✓（Deprecated指定子 + 移行ガイド）

## プロジェクト構造

### ドキュメント (この機能)
```
specs/SPEC-bfa1680e/
├── plan.md              # このファイル (/speckit.plan コマンド出力)
├── research.md          # Phase 0 出力 (/speckit.plan コマンド)
├── data-model.md        # Phase 1 出力 (/speckit.plan コマンド)
├── quickstart.md        # Phase 1 出力 (/speckit.plan コマンド)
├── contracts/           # Phase 1 出力 (/speckit.plan コマンド)
│   ├── public-api.h     # C++ API仕様
│   └── native-bridge.md # iOS/Android Native SDK呼び出し仕様
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド)
```

### ソースコード (リポジトリルート)
```
unreal-plugin/
├── PushNotificationPlugin.uplugin       # Plugin定義ファイル
├── README.md                             # Plugin概要（英語）
├── README.ja.md                          # Plugin概要（日本語）
├── CHANGELOG.md                          # バージョン履歴
├── LICENSE.md                            # ライセンス
├── Resources/
│   └── Icon128.png                       # Pluginアイコン
├── Source/
│   ├── PushNotificationPlugin/
│   │   ├── PushNotificationPlugin.Build.cs           # モジュールビルド設定
│   │   ├── Public/
│   │   │   ├── PushNotificationSubsystem.h          # メインサブシステム
│   │   │   ├── PushNotificationData.h               # 通知データ構造体
│   │   │   ├── PushNotificationConfig.h             # 設定構造体
│   │   │   ├── PushNotificationTypes.h              # 列挙型・型定義
│   │   │   ├── IPlatformBridge.h                    # プラットフォームブリッジ抽象化
│   │   │   └── PushNotificationBlueprintLibrary.h   # Blueprint関数ライブラリ
│   │   ├── Private/
│   │   │   ├── PushNotificationSubsystem.cpp
│   │   │   ├── PushNotificationModule.cpp           # モジュール初期化
│   │   │   ├── Platforms/
│   │   │   │   ├── IOSPlatformBridge.h/.mm          # iOS Objective-C++実装
│   │   │   │   ├── AndroidPlatformBridge.h/.cpp     # Android JNI実装
│   │   │   │   └── EditorPlatformBridge.h/.cpp      # Editor疑似実装
│   │   │   ├── Utils/
│   │   │   │   ├── GameThreadDispatcher.h/.cpp      # ゲームスレッド実行
│   │   │   │   └── JsonSerializer.h/.cpp            # JSON変換
│   │   │   └── PushNotificationBlueprintLibrary.cpp
│   │   └── PushNotificationPlugin_UPL.xml          # Android UPL設定
│   ├── PushNotificationPluginEditor/
│   │   ├── PushNotificationPluginEditor.Build.cs
│   │   ├── Public/
│   │   │   └── EditorNotificationToolbar.h
│   │   └── Private/
│   │       └── EditorNotificationToolbar.cpp        # Editor UI実装
│   └── PushNotificationPluginTests/
│       ├── PushNotificationPluginTests.Build.cs
│       └── Private/
│           ├── NotificationDataTests.cpp
│           ├── PlatformBridgeTests.cpp
│           └── GameThreadDispatcherTests.cpp
├── Content/
│   └── Samples/
│       └── BasicIntegration/
│           ├── Maps/
│           │   └── SampleMap.umap
│           └── Blueprints/
│               └── BP_PushNotificationSample.uasset
└── Binaries/
    ├── IOS/
    │   └── PushNotificationSDK.framework            # SPEC-58d1c0d1
    └── Android/
        └── libs/
            └── push-notification-sdk.aar            # SPEC-628d6000
```

## Phase 0: アウトライン＆リサーチ

### リサーチタスク
1. **Unreal Native Platform統合パターン**
   - 決定: iOS Platform File（.mm）+ Android JNI
   - 理由: Unreal公式推奨パターン、プラットフォーム自動切り替え対応
   - 検討した代替案: Third Party Libraryラッパー（複雑すぎる）

2. **ゲームスレッドコールバック実装**
   - 決定: GameThreadDispatcher + TQueue<TFunction<void()>>
   - 理由: Unreal API制約（非ゲームスレッドからAPI呼び出し不可）
   - 検討した代替案: FRunnable（Unreal推奨外）

3. **Unreal Editor疑似通知実装**
   - 決定: EditorPlatformBridge + Editor Utility Widget
   - 理由: 実機なしで開発者が動作確認可能（開発サイクル短縮）
   - 検討した代替案: 疑似機能なし（開発サイクル遅延）

4. **GameInstance永続化使用**
   - 決定: GameInstanceSubsystem（トークン永続化）
   - 理由: Unreal標準パターン、プラットフォーム横断対応
   - 検討した代替案: SaveGame + SaveGameToSlot（複雑）

5. **Plugin配布形式**
   - 決定: .uplugin形式（Git/Marketplace）
   - 理由: Unreal Engine 5.3公式サポート、依存関係自動解決
   - 検討した代替案: C++ Source配布（統合複雑）

**出力**: `research.md`にすべてのリサーチ結果を記録

## Phase 1: 設計＆契約

### 1. エンティティ抽出 → `data-model.md`
- **FPushNotificationData**: タイトル、本文、画像URL、カスタムデータ（TMap<FString, FString>）
- **FPushNotificationConfig**: APIキー、エンドポイント、ログ有効化フラグ
- **EPlatformType**: iOS, Android, Editor（列挙型）

### 2. API契約生成 → `/contracts/public-api.h`
```cpp
// メインAPI
UPushNotificationSubsystem::Initialize(FPushNotificationConfig Config)
UPushNotificationSubsystem::SetNotificationHandler(FOnNotificationReceivedDelegate OnReceived, FOnNotificationOpenedDelegate OnOpened)
UPushNotificationSubsystem::UpdatePlayerAccountId(FString PlayerId)
UPushNotificationSubsystem::UnregisterToken()

// 内部ブリッジAPI
IPlatformBridge::Initialize(FString ApiKey, FString Endpoint)
IPlatformBridge::GetDeviceToken() : FString
IPlatformBridge::RegisterToken(FString Token)
IPlatformBridge::SetNotificationCallback(TFunction<void(FString)> Callback)
```

### 3. Native SDK呼び出し仕様 → `/contracts/native-bridge.md`
- iOS: Platform File .mm（Objective-C++、`PushSDK_Initialize`, `PushSDK_GetToken`等）
- Android: JNI呼び出し（`com.example.pushnotification.PushNotificationJNI`）

### 4. テストシナリオ抽出
- **P1 統合テスト**: 初期化→トークン取得→登録→疑似通知受信
- **P2 統合テスト**: 通知デリゲート→ゲームスレッド実行確認
- **P3 統合テスト**: Blueprint統合→サンプルマップ動作確認

### 5. `quickstart.md` 作成
- ステップ1: Plugin有効化（.upluginファイル配置）
- ステップ2: 初期化コード記述（3行）
- ステップ3: Editor疑似通知送信
- ステップ4: 実機ビルド＆動作確認

**出力**: `data-model.md`, `/contracts/*`, 失敗するテスト, `quickstart.md`

## Phase 2: タスク計画アプローチ
*このセクションは/speckit.tasksコマンドが実行することを記述 - /speckit.plan中は実行しない*

**タスク生成戦略**:
- `/templates/tasks-template.md` をベースとして読み込み
- Phase 1設計ドキュメント (contracts, data model, quickstart) からタスクを生成
- 各contract → contract testタスク [P]
- 各entity → struct作成タスク [P]
- 各ユーザーストーリー → integration testタスク
- テストを合格させる実装タスク

**順序戦略**:
- TDD順序: Contract test → Integration test → Unit test → 実装
- 依存関係順序: Structs → Bridges → Subsystem → Editor UI
- 並列実行のために[P]をマーク

**推定タスク数**: 45-55個
1. Setup (6): .uplugin作成、Native SDK配置、Build.cs設定
2. Tests (16): Contract/Integration/Unit tests
3. Core (22): Structs、Bridges、Subsystem、Utils、Blueprint Library
4. Editor (4): EditorToolbar、疑似通知UI
5. Samples (3): サンプルマップ、サンプルBlueprint
6. Polish (5): ドキュメント、README、CHANGELOG

**重要**: このフェーズは/speckit.tasksコマンドで実行、/speckit.planではない

## Phase 3+: 今後の実装
*これらのフェーズは/planコマンドのスコープ外*

**Phase 3**: タスク実行 (/speckit.tasksコマンドがtasks.mdを作成)
**Phase 4**: 実装 (憲章原則に従ってtasks.mdを実行)
**Phase 5**: 検証 (テスト実行、quickstart.md実行、実機ビルド検証)

## 複雑さトラッキング
*憲章チェックに正当化が必要な違反がある場合のみ記入*

| 違反 | 必要な理由 | より単純な代替案が却下された理由 |
|------|-----------|--------------------------------|
| なし | - | - |

## 進捗トラッキング
*このチェックリストは実行フロー中に更新される*

**フェーズステータス**:
- [x] Phase 0: Research完了 (/speckit.plan コマンド)
- [x] Phase 1: Design完了 (/speckit.plan コマンド)
- [ ] Phase 2: Task planning完了 (/speckit.plan コマンド - アプローチのみ記述)
- [ ] Phase 3: Tasks生成済み (/speckit.tasks コマンド)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲートステータス**:
- [x] 初期憲章チェック: 合格
- [x] 設計後憲章チェック: 合格（Phase 1完了後）
- [x] すべての要明確化解決済み
- [x] 複雑さの逸脱を文書化済み（違反なし）

---
*Push Notification SDK開発憲章 v1.0.0 に基づく - 本プロジェクト固有憲章*
