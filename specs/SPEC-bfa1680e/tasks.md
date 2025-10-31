# タスク: Unreal Engine Push通知Plugin

**入力**: `/push-notification/specs/SPEC-bfa1680e/`の設計ドキュメント
**前提条件**: plan.md (必須), research.md, data-model.md, contracts/

## 実行フロー (main)
```
1. 機能ディレクトリからplan.mdを読み込み
   → 見つかりました: 技術スタック C++17, Unreal Engine 5.3+
   → 抽出: ライブラリ PushNotificationPlugin、iOS/Android Native SDK
2. オプション設計ドキュメントを読み込み:
   → data-model.md: 6エンティティを抽出 → modelタスク
   → contracts/: public-api.h, native-bridge.md → contract testタスク
   → research.md: 5つの技術的決定を抽出 → setupタスク
   → quickstart.md: 統合シナリオを抽出 → 検証タスク
3. カテゴリ別にタスクを生成:
   → Setup (6): .uplugin、ディレクトリ構造、Native SDK配置
   → Tests (18): Contract tests、Integration tests
   → Core (20): Structs、Bridges、Subsystem、Utils
   → Editor (4): Editor Toolbar、疑似通知UI
   → Samples (3): サンプルマップ、Blueprint
   → Polish (5): Unit tests、ドキュメント
4. タスクルールを適用:
   → 異なるファイル = [P]をマーク (並列実行可能)
   → 同じファイル = 順次実行 ([P]なし)
   → テストが実装より先 (TDD)
5. タスクを順次番号付け (T001, T002...)
6. 合計タスク数: 56
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能 (異なるファイル、依存関係なし)
- 説明には正確なファイルパスを含める

## パス規約
- **Unreal Plugin**: リポジトリルートの `unreal-plugin/`
- プロジェクト構造はplan.mdに定義

---

## Phase 3.1: セットアップ (6タスク)

- [ ] T001 [P] unreal-plugin/PushNotificationPlugin.uplugin作成 (Plugin定義、1.0.0、UE 5.3+)
- [ ] T002 [P] unreal-plugin/Source/PushNotificationPlugin/PushNotificationPlugin.Build.cs作成 (モジュール依存関係)
- [ ] T003 [P] unreal-plugin/Source/PushNotificationPluginEditor/PushNotificationPluginEditor.Build.cs作成 (Editorモジュール依存関係)
- [ ] T004 [P] unreal-plugin/Source/PushNotificationPluginTests/PushNotificationPluginTests.Build.cs作成 (テストモジュール依存関係)
- [ ] T005 [P] unreal-plugin/Binaries/IOS/PushNotificationSDK.framework配置 (SPEC-58d1c0d1依存)
- [ ] T006 [P] unreal-plugin/Binaries/Android/libs/push-notification-sdk.aar配置 (SPEC-628d6000依存)

## Phase 3.2: テストファースト (TDD) ⚠️ 3.3の前に完了必須

**重要: これらのテストは記述され、実装前に失敗する必要がある**

### Contract Tests (8タスク)

- [ ] T007 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/PushNotificationDataContractTest.cpp作成 (FPushNotificationData検証)
- [ ] T008 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/PushNotificationConfigContractTest.cpp作成 (FPushNotificationConfig検証)
- [ ] T009 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/SubsystemInitializeContractTest.cpp作成 (UPushNotificationSubsystem::Initialize API)
- [ ] T010 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/SubsystemDelegateContractTest.cpp作成 (デリゲートAPI検証)
- [ ] T011 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/IPlatformBridgeContractTest.cpp作成 (IPlatformBridge抽象インターフェース)
- [ ] T012 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/BlueprintLibraryContractTest.cpp作成 (UPushNotificationBlueprintLibrary API)
- [ ] T013 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/GameThreadDispatcherContractTest.cpp作成 (FGameThreadDispatcher API)
- [ ] T014 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/JsonSerializerContractTest.cpp作成 (FJsonSerializer API)

### Integration Tests (10タスク)

- [ ] T015 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/InitializationIntegrationTest.cpp作成 (初期化→トークン取得→登録フロー)
- [ ] T016 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/NotificationReceivedIntegrationTest.cpp作成 (通知受信→デリゲート実行)
- [ ] T017 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/NotificationOpenedIntegrationTest.cpp作成 (通知タップ→デリゲート実行)
- [ ] T018 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/PlayerAccountUpdateIntegrationTest.cpp作成 (UpdatePlayerAccountId→REST API呼び出し)
- [ ] T019 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/UnregisterTokenIntegrationTest.cpp作成 (UnregisterToken→REST API呼び出し)
- [ ] T020 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/EditorSimulatorIntegrationTest.cpp作成 (Editor疑似通知→デリゲート実行)
- [ ] T021 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/GameThreadSafetyIntegrationTest.cpp作成 (Native SDK別スレッド→ゲームスレッド実行確認)
- [ ] T022 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/IOSPlatformBridgeIntegrationTest.cpp作成 (iOS Native SDK呼び出し、条件付きコンパイル)
- [ ] T023 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/AndroidPlatformBridgeIntegrationTest.cpp作成 (Android JNI呼び出し、条件付きコンパイル)
- [ ] T024 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/BlueprintIntegrationTest.cpp作成 (Blueprint経由での初期化→通知受信)

## Phase 3.3: コア実装 (テストが失敗した後のみ) (20タスク)

### Structs & Types (6タスク)

- [ ] T025 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationTypes.h作成 (EPlatformType、EErrorCode、Delegates定義)
- [ ] T026 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationData.h作成 (FPushNotificationData、FPushNotificationAction構造体)
- [ ] T027 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationConfig.h作成 (FPushNotificationConfig構造体)
- [ ] T028 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationData.cpp作成 (Validate()実装)
- [ ] T029 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationConfig.cpp作成 (Validate()実装)
- [ ] T030 [P] unreal-plugin/Source/PushNotificationPlugin/Private/TokenState.h作成 (FTokenState内部構造体)

### Platform Bridges (6タスク)

- [ ] T031 [P] unreal-plugin/Source/PushNotificationPlugin/Public/IPlatformBridge.h作成 (IPlatformBridge抽象インターフェース定義)
- [ ] T032 [P] unreal-plugin/Source/PushNotificationPlugin/Private/Platforms/IOSPlatformBridge.h/.mm作成 (iOS Platform File実装、Objective-C++、条件付きコンパイル)
- [ ] T033 [P] unreal-plugin/Source/PushNotificationPlugin/Private/Platforms/AndroidPlatformBridge.h/.cpp作成 (Android JNI実装、条件付きコンパイル)
- [ ] T034 [P] unreal-plugin/Source/PushNotificationPlugin/Private/Platforms/EditorPlatformBridge.h/.cpp作成 (Editor疑似実装、WITH_EDITORマクロ)
- [ ] T035 unreal-plugin/Source/PushNotificationPlugin/Private/PlatformBridgeFactory.cpp作成 (FPlatformBridgeFactory::CreateBridge()実装)
- [ ] T036 [P] unreal-plugin/Source/PushNotificationPlugin/PushNotificationPlugin_UPL.xml作成 (Android UPL設定、google-services.json組み込み)

### Utils (3タスク)

- [ ] T037 [P] unreal-plugin/Source/PushNotificationPlugin/Private/Utils/GameThreadDispatcher.h/.cpp作成 (FGameThreadDispatcher実装、TQueue + FTickerDelegate)
- [ ] T038 [P] unreal-plugin/Source/PushNotificationPlugin/Private/Utils/JsonSerializer.h/.cpp作成 (FJsonSerializer::JsonToStruct/StructToJson実装)
- [ ] T039 unreal-plugin/Source/PushNotificationPlugin/Private/PushNotificationModule.cpp作成 (モジュール初期化、GameThreadDispatcher::Initialize()呼び出し)

### Subsystem & Blueprint Library (5タスク)

- [ ] T040 unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationSubsystem.h作成 (UPushNotificationSubsystem定義、GameInstanceSubsystem継承)
- [ ] T041 unreal-plugin/Source/PushNotificationPlugin/Private/PushNotificationSubsystem.cpp作成 (Initialize()実装)
- [ ] T042 unreal-plugin/Source/PushNotificationPlugin/Private/PushNotificationSubsystem.cppにUpdatePlayerAccountId()実装追加
- [ ] T043 unreal-plugin/Source/PushNotificationPlugin/Private/PushNotificationSubsystem.cppにUnregisterToken()実装追加
- [ ] T044 [P] unreal-plugin/Source/PushNotificationPlugin/Public/PushNotificationBlueprintLibrary.h/.cpp作成 (UPushNotificationBlueprintLibrary実装)

## Phase 3.4: Editor (4タスク)

- [ ] T045 [P] unreal-plugin/Source/PushNotificationPluginEditor/Public/EditorNotificationToolbar.h作成 (FEditorNotificationToolbar定義)
- [ ] T046 unreal-plugin/Source/PushNotificationPluginEditor/Private/EditorNotificationToolbar.cpp作成 (Editor Toolbar UI実装)
- [ ] T047 unreal-plugin/Source/PushNotificationPluginEditor/Private/EditorNotificationSimulator.h/.cpp作成 (FEditorNotificationSimulator実装、WITH_EDITORマクロ)
- [ ] T048 unreal-plugin/Content/Editor/EUW_NotificationSimulator.uasset作成 (Editor Utility Widget、疑似通知送信UI)

## Phase 3.5: Samples (3タスク)

- [ ] T049 [P] unreal-plugin/Content/Samples/BasicIntegration/Maps/SampleMap.umap作成 (サンプルマップ、UI配置)
- [ ] T050 [P] unreal-plugin/Content/Samples/BasicIntegration/Blueprints/BP_PushNotificationSample.uasset作成 (サンプルBlueprint、初期化・通知受信実装)
- [ ] T051 [P] unreal-plugin/Content/Samples/BasicIntegration/Blueprints/BP_TestGameInstance.uasset作成 (GameInstance Blueprint、デリゲート設定例)

## Phase 3.6: 仕上げ (5タスク)

### Unit Tests (2タスク)

- [ ] T052 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/NotificationDataValidationUnitTest.cpp作成 (FPushNotificationData::Validate() Unit Tests)
- [ ] T053 [P] unreal-plugin/Source/PushNotificationPluginTests/Private/ConfigValidationUnitTest.cpp作成 (FPushNotificationConfig::Validate() Unit Tests)

### Documentation & Polish (3タスク)

- [ ] T054 [P] unreal-plugin/README.md作成 (Plugin概要、インストール手順、英語)
- [ ] T055 [P] unreal-plugin/README.ja.md作成 (Plugin概要、インストール手順、日本語)
- [ ] T056 quickstart.mdのステップを実行して動作確認 (Editor疑似通知、サンプルマップ実行、PIE動作確認)

---

## 依存関係

**フェーズ依存**:
- Setup (T001-T006) → すべてのフェーズ
- Tests (T007-T024) → Core実装 (T025-T044)
- Core実装 (T025-T044) → Editor/Samples/Polish (T045-T056)

**タスク依存**:
- T025 (Types定義) → T026, T027, T040
- T031 (IPlatformBridge) → T032, T033, T034, T035
- T037 (GameThreadDispatcher) → T040, T041
- T038 (JsonSerializer) → T041
- T039 (Module初期化) → すべてのPrivate実装
- T040 (Subsystem定義) → T041, T042, T043
- T041 → T042, T043 (Subsystem実装は順次)

**TDD順序**:
- Contract Tests (T007-T014) が対応する実装より先
- Integration Tests (T015-T024) が統合実装より先
- Unit Tests (T052-T053) が最後

## 並列実行例

```bash
# Phase 3.1: Setup (すべて並列)
T001, T002, T003, T004, T005, T006

# Phase 3.2: Contract Tests (すべて並列)
T007, T008, T009, T010, T011, T012, T013, T014

# Phase 3.2: Integration Tests (すべて並列)
T015, T016, T017, T018, T019, T020, T021, T022, T023, T024

# Phase 3.3: Structs (すべて並列、T025先行)
T025 → (T026, T027, T028, T029, T030)

# Phase 3.3: Platform Bridges (T031先行、T032-T034並列)
T031 → (T032, T033, T034, T036) → T035

# Phase 3.3: Utils (T037, T038並列)
T037, T038 → T039

# Phase 3.3: Subsystem (T040先行、T041-T043順次)
T040 → T041 → T042 → T043 → T044

# Phase 3.4: Editor (T045並列、T046-T048順次)
(T045, T047) → T046 → T048

# Phase 3.5: Samples (すべて並列)
T049, T050, T051

# Phase 3.6: Polish (Unit Tests並列、Docs並列)
(T052, T053), (T054, T055) → T056
```

## 注意事項

- **[P] タスク** = 異なるファイル、依存関係なし、並列実行可能
- **実装前にテストが失敗することを確認** (TDD RED-GREEN-Refactor)
- **各タスク後にコミット** (Git履歴でTDD順序を証明)
- **条件付きコンパイル** (iOS/Android/Editor)は`#if PLATFORM_IOS`、`#if PLATFORM_ANDROID`、`#if WITH_EDITOR`を使用
- **GameThreadDispatcher使用** (Native SDKコールバックは別スレッドから呼ばれるため)
- **Blueprint公開** (UFUNCTION(BlueprintCallable)、UPROPERTY(BlueprintAssignable)使用)

## タスク生成ルール適用結果

1. **Contractsから**:
   - public-api.h → 8 contract testタスク (T007-T014)
   - 各API → 対応する実装タスク (T040-T044)

2. **Data Modelから**:
   - 6エンティティ → 6 modelタスク (T025-T030)
   - デリゲート → Subsystemタスク (T040)

3. **User Storiesから**:
   - P1 (30分統合) → Integration test (T015)
   - P2 (通知デリゲート) → Integration tests (T016, T017)
   - P3 (Blueprint) → Integration test (T024)
   - Quickstart → 検証タスク (T056)

4. **順序**:
   - Setup (T001-T006) → Tests (T007-T024) → Core (T025-T044) → Editor (T045-T048) → Samples (T049-T051) → Polish (T052-T056)

## 検証チェックリスト

- [x] すべてのcontractsに対応するテストがある (public-api.h → T007-T014)
- [x] すべてのentitiesにmodelタスクがある (6エンティティ → T025-T030)
- [x] すべてのテストが実装より先にある (T007-T024 → T025-T044)
- [x] 並列タスクは本当に独立している ([P]タスクは異なるファイル)
- [x] 各タスクは正確なファイルパスを指定 (unreal-plugin/Source/...)
- [x] 同じファイルを変更する[P]タスクがない (T041-T043は順次)

---

**合計タスク数**: 56
**推定完了時間**: 10-15日（並列実行時）
**TDD遵守**: RED-GREEN-Refactorサイクル厳守
