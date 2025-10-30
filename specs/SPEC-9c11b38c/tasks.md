# タスク: Unity Push通知Plugin

**機能ID**: SPEC-9c11b38c
**入力**: `/push-notification/specs/SPEC-9c11b38c/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/

## 実行フロー (Phase 3-4)
```
1. plan.mdから技術スタック・構造を確認 ✓
2. data-model.mdからエンティティを抽出 ✓
3. contracts/からAPI仕様を抽出 ✓
4. TDD順序でタスクを生成（Contract→Integration→Unit）✓
5. 並列実行可能タスクに[P]マーク付与 ✓
6. 依存関係を明確化 ✓
7. タスク完全性検証 ✓
8. SUCCESS（実装実行準備完了）
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含める

## パス規約
- プロジェクトタイプ: 単一（Unity Package）
- ソースコード: `unity-plugin/Runtime/`
- Editorコード: `unity-plugin/Editor/`
- テストコード: `unity-plugin/Tests/Runtime/`, `unity-plugin/Tests/Editor/`
- サンプル: `unity-plugin/Samples~/BasicIntegration/`

## Phase 3.1: セットアップ（T001-T007）

- [ ] **T001** [P] UPMパッケージ構造作成
  `unity-plugin/package.json` を作成し、com.example.push-notification、Unity 2021.3、サンプル定義設定

- [ ] **T002** [P] Runtime Assembly Definition作成
  `unity-plugin/Runtime/com.example.push-notification.asmdef` を作成し、.NET Standard 2.1、iOS/Android/Editorプラットフォーム設定

- [ ] **T003** [P] Editor Assembly Definition作成
  `unity-plugin/Editor/com.example.push-notification.editor.asmdef` を作成し、Editorプラットフォーム、Runtime依存関係設定

- [ ] **T004** [P] Tests Assembly Definition作成
  `unity-plugin/Tests/Runtime/com.example.push-notification.tests.asmdef` を作成し、Unity Test Framework依存関係設定

- [ ] **T005** [P] iOS Native SDK配置
  `unity-plugin/Plugins/iOS/PushNotificationSDK.framework/` にSPEC-58d1c0d1のframeworkを配置、.meta設定

- [ ] **T006** [P] Android Native SDK配置
  `unity-plugin/Plugins/Android/push-notification-sdk.aar` にSPEC-628d6000のaarを配置、.meta設定

- [ ] **T007** [P] サンプルプロジェクト構造作成
  `unity-plugin/Samples~/BasicIntegration/` ディレクトリ作成、Scenes/、Scripts/サブディレクトリ設定

## Phase 3.2: テストファースト（TDD）⚠️ Phase 3.3の前に完了必須

**重要**: これらのテストは記述され、実装前に失敗する（RED）必要がある

### Contract Tests（T008-T015）

- [ ] **T008** [P] PushNotificationConfig検証 Contract test
  `unity-plugin/Tests/Runtime/NotificationConfigContractTest.cs` 作成
  検証: `Validate()` が不正な設定でArgumentExceptionをスローする

- [ ] **T009** [P] NotificationData検証 Contract test
  `unity-plugin/Tests/Runtime/NotificationDataContractTest.cs` 作成
  検証: `NotificationDataValidator.Validate()` が必須フィールドチェック、長さ制限検証

- [ ] **T010** [P] PlatformBridge初期化 Contract test
  `unity-plugin/Tests/Runtime/PlatformBridgeContractTest.cs` 作成
  検証: `IPlatformBridge.Initialize()` が正しく呼び出され、例外をスローしない

- [ ] **T011** [P] デバイストークン取得 Contract test
  `unity-plugin/Tests/Runtime/TokenRetrievalContractTest.cs` 作成
  検証: `GetDeviceToken()` がnull/非null文字列を返す（プラットフォーム依存）

- [ ] **T012** [P] 通知コールバック Contract test
  `unity-plugin/Tests/Runtime/NotificationCallbackContractTest.cs` 作成
  検証: `SetNotificationCallback()` が有効なAction<string>を受け入れる

- [ ] **T013** [P] JSON デシリアライズ Contract test
  `unity-plugin/Tests/Runtime/JsonDeserializationContractTest.cs` 作成
  検証: `JsonUtility.FromJson<NotificationData>()` が正しくオブジェクトを復元

- [ ] **T014** [P] MainThreadDispatcher Contract test
  `unity-plugin/Tests/Runtime/MainThreadDispatcherContractTest.cs` 作成
  検証: `Enqueue()` がメインスレッドでアクションを実行

- [ ] **T015** [P] PlayerPrefs永続化 Contract test
  `unity-plugin/Tests/Runtime/TokenStorageContractTest.cs` 作成
  検証: `TokenStorage.Save()/Load()` がPlayerPrefsで正しくデータを保存・復元

### Integration Tests（T016-T023）

- [ ] **T016** [P] Editor疑似通知 Integration test
  `unity-plugin/Tests/Editor/EditorBridgeIntegrationTest.cs` 作成
  検証: EditorBridge初期化→疑似トークン生成→SimulateNotification→コールバック実行

- [ ] **T017** [P] iOS DllImport呼び出し Integration test
  `unity-plugin/Tests/Runtime/IOSBridgeIntegrationTest.cs` 作成
  検証: iOS実機でDllImport関数呼び出し→Native SDK初期化→トークン取得（実機必須）

- [ ] **T018** [P] Android JNI呼び出し Integration test
  `unity-plugin/Tests/Runtime/AndroidBridgeIntegrationTest.cs` 作成
  検証: Android実機でAndroidJavaClass呼び出し→Native SDK初期化→トークン取得（実機必須）

- [ ] **T019** [P] 通知受信フロー Integration test
  `unity-plugin/Tests/Runtime/NotificationReceiveFlowTest.cs` 作成
  検証: Native SDKコールバック→MainThreadDispatcher→JSON デシリアライズ→開発者コールバック実行

- [ ] **T020** [P] プレイヤーアカウントID更新 Integration test
  `unity-plugin/Tests/Runtime/PlayerAccountUpdateTest.cs` 作成
  検証: `UpdatePlayerAccountId()` →Native SDK呼び出し→PlayerPrefs更新

- [ ] **T021** [P] トークン登録解除 Integration test
  `unity-plugin/Tests/Runtime/TokenUnregistrationTest.cs` 作成
  検証: `UnregisterToken()` →Native SDK呼び出し→PlayerPrefsクリア

- [ ] **T022** [P] PlatformBridgeFactory Integration test
  `unity-plugin/Tests/Runtime/PlatformFactoryTest.cs` 作成
  検証: `CreateBridge()` がiOS/Android/Editorで適切なブリッジを返す

- [ ] **T023** [P] サンプルシーン Integration test
  `unity-plugin/Tests/Editor/SampleSceneTest.cs` 作成
  検証: サンプルシーン読み込み→初期化→疑似通知送信→コールバック実行（Unity Editorのみ）

## Phase 3.3: コア実装（テストが失敗した後のみ）

### Data Models（T024-T029）

- [ ] **T024** [P] NotificationDataクラス作成
  `unity-plugin/Runtime/NotificationData.cs` 作成
  実装: title, body, imageUrl, customData, actions, timestamp, badge, sound, channelIdフィールド、[System.Serializable]属性

- [ ] **T025** [P] NotificationActionクラス作成
  `unity-plugin/Runtime/NotificationAction.cs` 作成
  実装: id, label, deepLink, iconフィールド、[System.Serializable]属性

- [ ] **T026** [P] PushNotificationConfigクラス作成
  `unity-plugin/Runtime/PushNotificationConfig.cs` 作成
  実装: apiKey, apiEndpoint, enableLogging, timeoutSeconds, autoRegisterToken, enableEditorSimulationフィールド、Validate()メソッド

- [ ] **T027** [P] PlatformType列挙型作成
  `unity-plugin/Runtime/PlatformType.cs` 作成
  実装: iOS, Android, Editor, Unsupported列挙値

- [ ] **T028** [P] SDKErrorクラス作成
  `unity-plugin/Runtime/SDKError.cs` 作成
  実装: ErrorCode列挙型、code, message, stackTrace, timestampフィールド

- [ ] **T029** [P] TokenStateクラス作成
  `unity-plugin/Runtime/TokenState.cs` 作成
  実装: deviceToken, playerAccountId, isRegistered, lastUpdated, platformフィールド、internal修飾子

### Platform Bridges（T030-T033）

- [ ] **T030** [P] IPlatformBridgeインターフェース作成
  `unity-plugin/Runtime/IPlatformBridge.cs` 作成
  実装: Initialize(), GetDeviceToken(), RegisterToken(), SetNotificationCallback(), UpdatePlayerAccountId(), UnregisterToken(), GetPlatformType()メソッド定義

- [ ] **T031** IOSBridgeクラス作成（iOS DllImport実装）
  `unity-plugin/Runtime/Platforms/IOSBridge.cs` 作成
  実装: IPlatformBridge実装、#if UNITY_IOS && !UNITY_EDITOR、[DllImport("__Internal")]関数宣言、コールバックデリゲート
  **依存**: T030

- [ ] **T032** AndroidBridgeクラス作成（Android JNI実装）
  `unity-plugin/Runtime/Platforms/AndroidBridge.cs` 作成
  実装: IPlatformBridge実装、#if UNITY_ANDROID && !UNITY_EDITOR、AndroidJavaClass/AndroidJavaObject使用、NotificationCallbackProxyクラス
  **依存**: T030

- [ ] **T033** EditorBridgeクラス作成（Editor疑似実装）
  `unity-plugin/Runtime/Platforms/EditorBridge.cs` 作成
  実装: IPlatformBridge実装、#if UNITY_EDITOR、疑似トークン生成（Guid.NewGuid()）、SimulateNotification()静的メソッド
  **依存**: T030

### Utilities（T034-T037）

- [ ] **T034** [P] MainThreadDispatcherクラス作成
  `unity-plugin/Runtime/Utils/MainThreadDispatcher.cs` 作成
  実装: MonoBehaviourシングルトン、Queue<Action>、Initialize()、Enqueue()、Update()でキュー実行、DontDestroyOnLoad

- [ ] **T035** [P] TokenStorageクラス作成
  `unity-plugin/Runtime/Utils/TokenStorage.cs` 作成
  実装: PlayerPrefs使用、Save(TokenState), Load(), Clear()静的メソッド、internal修飾子

- [ ] **T036** [P] Loggerクラス作成
  `unity-plugin/Runtime/Utils/Logger.cs` 作成
  実装: SetEnabled(bool), Debug(), Info(), Warning(), Error(), Exception()静的メソッド、UnityEngine.Debug.Log使用、internal修飾子

- [ ] **T037** [P] NotificationDataValidatorクラス作成
  `unity-plugin/Runtime/Utils/NotificationDataValidator.cs` 作成
  実装: Validate(NotificationData, out string error)静的メソッド、title/body必須チェック、長さ制限検証

### Core Manager（T038-T041）

- [ ] **T038** PlatformBridgeFactoryクラス作成
  `unity-plugin/Runtime/PlatformBridgeFactory.cs` 作成
  実装: CreateBridge()静的メソッド、Application.platformでiOS/Android/Editor判定、適切なブリッジインスタンス返却、internal修飾子
  **依存**: T030, T031, T032, T033

- [ ] **T039** PushNotificationManagerクラス作成（初期化部分）
  `unity-plugin/Runtime/PushNotificationManager.cs` 作成
  実装: 静的クラス、Initialize(PushNotificationConfig)メソッド、PlatformBridgeFactory使用、MainThreadDispatcher初期化
  **依存**: T034, T038

- [ ] **T040** PushNotificationManager通知ハンドラー実装
  `unity-plugin/Runtime/PushNotificationManager.cs` 更新
  実装: SetNotificationHandler(onReceived, onOpened)メソッド、Native SDKコールバック設定、MainThreadDispatcher.Enqueue使用
  **依存**: T039

- [ ] **T041** PushNotificationManagerトークン管理実装
  `unity-plugin/Runtime/PushNotificationManager.cs` 更新
  実装: UpdatePlayerAccountId(string), UnregisterToken()メソッド、IsInitializedプロパティ、CurrentDeviceTokenプロパティ、CurrentPlatformプロパティ、SetErrorHandler(Action<SDKError>)メソッド
  **依存**: T040

## Phase 3.4: Editor実装（T042-T046）

- [ ] **T042** [P] EditorNotificationWindowクラス作成（UI構築）
  `unity-plugin/Editor/EditorNotificationWindow.cs` 作成
  実装: EditorWindow継承、[MenuItem("Window/Push Notification/Simulator")]、OnGUI()でタイトル/本文/画像URL/カスタムデータ入力フィールド作成

- [ ] **T043** EditorNotificationWindow通知送信実装
  `unity-plugin/Editor/EditorNotificationWindow.cs` 更新
  実装: "Send Notification"ボタン、NotificationData組み立て、JsonUtility.ToJson()、EditorBridge.SimulateNotification()呼び出し
  **依存**: T042

- [ ] **T044** [P] EditorNotificationSimulatorクラス作成
  `unity-plugin/Editor/EditorNotificationSimulator.cs` 作成
  実装: #if UNITY_EDITOR、SendNotification(NotificationData)、GenerateMockToken()静的メソッド

- [ ] **T045** [P] PackageExporterクラス作成（オプション）
  `unity-plugin/Editor/PackageExporter.cs` 作成
  実装: [MenuItem("Tools/Push Notification/Export Package")]、AssetDatabase.ExportPackage()で.unitypackage生成

- [ ] **T046** [P] Editorドキュメント作成
  `unity-plugin/Editor/README.md` 作成
  実装: EditorWindow使用方法、疑似通知送信手順、デバッグTips

## Phase 3.5: サンプル実装（T047-T049）

- [ ] **T047** [P] サンプルシーン作成
  `unity-plugin/Samples~/BasicIntegration/Scenes/SampleScene.unity` 作成
  実装: Canvas + UI Text + Button、GameManagerオブジェクト配置

- [ ] **T048** サンプルスクリプト作成
  `unity-plugin/Samples~/BasicIntegration/Scripts/PushNotificationSample.cs` 作成
  実装: PushNotificationManager.Initialize()、SetNotificationHandler()、UI更新ロジック、通知受信時のログ表示
  **依存**: T041

- [ ] **T049** サンプルREADME作成
  `unity-plugin/Samples~/BasicIntegration/README.md` 作成
  実装: サンプルシーン説明、実行手順、期待される動作、Editor疑似通知テスト手順

## Phase 3.6: Unit Tests（T050-T053）

- [ ] **T050** [P] NotificationDataValidator Unit test
  `unity-plugin/Tests/Runtime/NotificationDataValidatorTest.cs` 作成
  検証: 各検証ルール（title必須、body長さ制限、imageUrl URL形式、actions最大3個）

- [ ] **T051** [P] TokenStorage Unit test
  `unity-plugin/Tests/Runtime/TokenStorageTest.cs` 作成
  検証: Save()→Load()で同じデータが返る、Clear()で削除される、存在しないキーでnull返却

- [ ] **T052** [P] Logger Unit test
  `unity-plugin/Tests/Runtime/LoggerTest.cs` 作成
  検証: SetEnabled(false)でログ出力されない、各ログレベル（Debug/Info/Warning/Error）が正しく出力

- [ ] **T053** [P] PlatformBridgeFactory Unit test
  `unity-plugin/Tests/Runtime/PlatformBridgeFactoryTest.cs` 作成
  検証: iOS/Android/Editorで適切なブリッジインスタンスが返される、Unsupportedプラットフォームで例外

## Phase 3.7: 仕上げ（T054-T058）

- [ ] **T054** [P] README.md作成
  `unity-plugin/README.md` 作成
  実装: プロジェクト概要、主要機能、UPMインストール手順、クイックスタート、API Reference、ライセンス（英語）

- [ ] **T055** [P] README.ja.md作成
  `unity-plugin/README.ja.md` 作成
  実装: README.mdの日本語版

- [ ] **T056** [P] CHANGELOG.md作成
  `unity-plugin/CHANGELOG.md` 作成
  実装: v1.0.0初期リリース、主要機能リスト、既知の問題

- [ ] **T057** [P] LICENSE.md作成
  `unity-plugin/LICENSE.md` 作成
  実装: MITライセンステキスト（または適切なライセンス）

- [ ] **T058** package.jsonメタデータ更新
  `unity-plugin/package.json` 更新
  実装: author情報、keywords、repository URL、samples設定最終確認
  **依存**: T001

## 依存関係

### Phase順序
1. Setup (T001-T007) → Tests (T008-T023) → Core (T024-T041) → Editor (T042-T046) → Samples (T047-T049) → Unit Tests (T050-T053) → Polish (T054-T058)

### 主要な依存関係
- **T030** IPlatformBridge → **T031, T032, T033** Bridge実装
- **T030-T033** Bridges → **T038** Factory
- **T038** Factory → **T039** Manager初期化
- **T039** Manager初期化 → **T040** ハンドラー → **T041** トークン管理
- **T034** MainThreadDispatcher → **T039** Manager初期化
- **T041** Manager → **T048** サンプルスクリプト
- **T042** EditorWindow UI → **T043** 通知送信
- **T001** package.json → **T058** メタデータ更新

### ブロッカー
- Tests (T008-T023)が失敗しないと、Core実装（T024-T041）に進めない（TDD）
- T030-T033 Bridgeが完了しないと、T038 Factoryに進めない
- T039 Managerが完了しないと、T048 Sampleに進めない

## 並列実行例

### Phase 3.1 Setup（全並列可能）
```
Task: T001 - UPMパッケージ構造作成
Task: T002 - Runtime Assembly Definition作成
Task: T003 - Editor Assembly Definition作成
Task: T004 - Tests Assembly Definition作成
Task: T005 - iOS Native SDK配置
Task: T006 - Android Native SDK配置
Task: T007 - サンプルプロジェクト構造作成
```

### Phase 3.2 Contract Tests（全並列可能）
```
Task: T008 - PushNotificationConfig検証 Contract test
Task: T009 - NotificationData検証 Contract test
Task: T010 - PlatformBridge初期化 Contract test
Task: T011 - デバイストークン取得 Contract test
Task: T012 - 通知コールバック Contract test
Task: T013 - JSON デシリアライズ Contract test
Task: T014 - MainThreadDispatcher Contract test
Task: T015 - PlayerPrefs永続化 Contract test
```

### Phase 3.2 Integration Tests（全並列可能）
```
Task: T016 - Editor疑似通知 Integration test
Task: T017 - iOS DllImport呼び出し Integration test（実機必須）
Task: T018 - Android JNI呼び出し Integration test（実機必須）
Task: T019 - 通知受信フロー Integration test
Task: T020 - プレイヤーアカウントID更新 Integration test
Task: T021 - トークン登録解除 Integration test
Task: T022 - PlatformBridgeFactory Integration test
Task: T023 - サンプルシーン Integration test
```

### Phase 3.3 Data Models（全並列可能）
```
Task: T024 - NotificationDataクラス作成
Task: T025 - NotificationActionクラス作成
Task: T026 - PushNotificationConfigクラス作成
Task: T027 - PlatformType列挙型作成
Task: T028 - SDKErrorクラス作成
Task: T029 - TokenStateクラス作成
```

### Phase 3.3 Utilities（全並列可能）
```
Task: T034 - MainThreadDispatcherクラス作成
Task: T035 - TokenStorageクラス作成
Task: T036 - Loggerクラス作成
Task: T037 - NotificationDataValidatorクラス作成
```

### Phase 3.4 Editor（一部並列可能）
```
Task: T042 - EditorNotificationWindowクラス作成（UI構築）
Task: T044 - EditorNotificationSimulatorクラス作成（並列）
Task: T045 - PackageExporterクラス作成（並列）
Task: T046 - Editorドキュメント作成（並列）
Then: T043 - 通知送信実装（T042依存）
```

### Phase 3.7 Polish（全並列可能）
```
Task: T054 - README.md作成
Task: T055 - README.ja.md作成
Task: T056 - CHANGELOG.md作成
Task: T057 - LICENSE.md作成
```

## 検証チェックリスト

- [x] すべてのcontractsに対応するテストがある（T008-T015: Contract tests）
- [x] すべてのentitiesにmodelタスクがある（T024-T029: Data models）
- [x] すべてのテストが実装より先にある（T008-T023 → T024-T041）
- [x] 並列タスクは本当に独立している（[P]マークは異なるファイル）
- [x] 各タスクは正確なファイルパスを指定
- [x] 同じファイルを変更する[P]タスクがない（T039/T040/T041は同じファイルだが順次実行、T042/T043も順次実行）

## 注意事項

- **[P] タスク** = 異なるファイル、依存関係なし
- **実装前にテストが失敗することを確認**（RED-GREEN-Refactor）
- **各タスク後にコミット**（細かくコミット履歴を残す）
- **iOS/Android実機テスト**（T017, T018）は実機接続必須
- **Unity Editor疑似実装**（T033, T042-T044）はEditor専用
- **Native SDK依存**（T005, T006）は対応するSPECが完了していること（SPEC-58d1c0d1, SPEC-628d6000）

## タスク生成ルール適用結果

### Contractsから
- ✅ contracts/public-api.cs → T008-T015（Contract tests）
- ✅ contracts/native-bridge.md → T017, T018（Integration tests）

### Data Modelから
- ✅ NotificationData → T024
- ✅ NotificationAction → T025
- ✅ PushNotificationConfig → T026
- ✅ PlatformType → T027
- ✅ SDKError → T028
- ✅ TokenState → T029

### User Storiesから
- ✅ P1: 簡単なUnity統合 → T016, T023（Integration tests）
- ✅ P2: 通知コールバック処理 → T019, T020, T021（Integration tests）
- ✅ P3: Unity Package Manager配布 → T001, T007, T058（Setup & Polish）

## 成功基準検証

spec.mdの成功基準に対するタスクマッピング:

1. ✅ **Unity開発者がPluginをインストールし、最初の通知を受信するまでに30分以内**
   → T001-T007（Setup）、T048-T049（サンプル）、quickstart.md完成済み

2. ✅ **Plugin初期化時間がアプリ起動から3秒以内**
   → T039（Manager初期化）でパフォーマンス考慮、Integration testで検証

3. ✅ **通知コールバックの遅延が通知受信から0.5秒以内**
   → T034（MainThreadDispatcher）でQueue<Action>実装、T019でレスポンスタイム検証

4. ✅ **サンプルシーンがUnity Editorで正常に動作し、疑似通知送受信ができる**
   → T047-T049（サンプル実装）、T016（Editor Integration test）

5. ✅ **iOS/Android実機ビルドが正常に動作し、実際の通知を送受信できる**
   → T017, T018（実機Integration tests）、quickstart.mdのビルド手順

6. ✅ **Pluginのクラッシュ率が0.1%以下**
   → すべてのテスト（T008-T053）でエラーハンドリング検証

7. ✅ **Unity 2021.3 LTS〜2023.2で動作することが検証される**
   → T002（asmdef設定）でUnity 2021.3指定、Integration testsで検証

8. ✅ **ドキュメントが明確で、開発者が自力で統合を完了できる**
   → T054-T055（README）、quickstart.md完成済み、T049（サンプルREADME）

## タスク数サマリー

- **Setup**: 7タスク（T001-T007）
- **Tests**: 16タスク（T008-T023）
- **Core**: 18タスク（T024-T041）
- **Editor**: 5タスク（T042-T046）
- **Samples**: 3タスク（T047-T049）
- **Unit Tests**: 4タスク（T050-T053）
- **Polish**: 5タスク（T054-T058）

**合計**: 58タスク

**推定実装時間**: 約40-50時間（TDD遵守、実機テスト含む）
