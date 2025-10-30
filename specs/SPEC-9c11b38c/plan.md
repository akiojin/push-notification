# 実装計画: Unity Push通知Plugin

**機能ID**: `SPEC-9c11b38c` | **日付**: 2025-10-30 | **仕様**: [spec.md](./spec.md)
**入力**: `/push-notification/specs/SPEC-9c11b38c/spec.md`の機能仕様

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

Unity Push通知Pluginは、Unity開発者がモバイルゲームにPush通知機能を簡単に統合できるC#ラッパーライブラリです。iOS Native SDK（SPEC-58d1c0d1）とAndroid Native SDK（SPEC-628d6000）をUnity C# APIでラップし、プラットフォーム自動検出、Unity Editor疑似通知サポート、統一されたコールバックインターフェースを提供します。

**主要機能**:
- 3行コードで初期化完了（iOS/Android両プラットフォーム対応）
- プラットフォーム自動検出（iOS/Android/Unity Editor）
- Unity Editorでの疑似通知送受信（実機なしで動作確認）
- 通知受信・タップ時のメインスレッドコールバック
- Unity Package Manager（UPM）形式配布

## 技術コンテキスト

**言語/バージョン**: C# 9.0+ (.NET Standard 2.1)
**主要依存関係**:
- Unity 2021.3 LTS+（最小対応バージョン）
- iOS Native SDK（SPEC-58d1c0d1）- .framework形式
- Android Native SDK（SPEC-628d6000）- .aar形式
- Unity Editor Coroutines（Editor疑似通知用）

**ストレージ**: PlayerPrefs（トークン・設定永続化）
**テスト**: Unity Test Framework（UTF）+ NUnit 3.5+
**対象プラットフォーム**: iOS 14+、Android 7.0+、Unity Editor（モック）
**プロジェクトタイプ**: single（Unity Package単体）
**パフォーマンス目標**:
- Plugin初期化: 3秒以内（起動時）
- 通知コールバック遅延: 0.5秒以内（受信→Unity実行）
- Editor疑似通知応答: 0.1秒以内
- メモリ使用量: 5MB以下

**制約**:
- .NET Standard 2.1準拠（Unity 2021.3 LTS制約）
- iOS DllImport使用（Extern C関数呼び出し）
- Android AndroidJavaClass使用（JNI経由）
- メインスレッド実行保証（Unity API制約）
- UPM形式配布（.unitypackage非対応）

**スケール/スコープ**:
- 対象: Unityゲーム開発者（モバイル開発経験不要）
- 配布: Git URL経由UPMインストール
- サンプルシーン提供（Editor疑似通知UI含む）

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:
- プロジェクト数: 1（unity-plugin単体）
- フレームワークを直接使用? ✓（Unity API直接使用、ラッパーなし）
- 単一データモデル? ✓（NotificationData、PushNotificationConfig共通使用、DTO不要）
- パターン回避? ✓（シングルトンPushNotificationManagerのみ、他パターン不使用）

**アーキテクチャ**:
- すべての機能をライブラリとして? ✓（Pluginライブラリとして提供）
- ライブラリリスト:
  1. `com.example.push-notification` - Unity Plugin（初期化、プラットフォームブリッジ、コールバック管理）
- ライブラリごとのCLI: N/A（Pluginライブラリのため不要）
- ライブラリドキュメント: XML Doc形式API仕様 + quickstart.md

**テスト (妥協不可)**:
- RED-GREEN-Refactorサイクルを強制? ✓
- Gitコミットはテストが実装より先に表示? ✓
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? ✓
- 実依存関係を使用? ✓（Unity Test Framework実環境、モックなし）
- Integration testの対象: Native SDK呼び出し、Editor疑似通知、コールバック実行
- 禁止: テスト前の実装、REDフェーズのスキップ

**可観測性**:
- 構造化ロギング含む? ✓（UnityEngine.Debug.Log + カスタムLoggerクラス）
- フロントエンドログ → バックエンド? N/A（Pluginライブラリのためローカルログのみ）
- エラーコンテキスト十分? ✓（エラーコード、メッセージ、スタックトレース）

**バージョニング**:
- バージョン番号割り当て済み? ✓（1.0.0から開始、MAJOR.MINOR.PATCH形式）
- 変更ごとにPATCHインクリメント? ✓（package.json version使用）
- 破壊的変更を処理? ✓（Obsolete属性 + 移行ガイド）

## プロジェクト構造

### ドキュメント (この機能)
```
specs/SPEC-9c11b38c/
├── plan.md              # このファイル (/speckit.plan コマンド出力)
├── research.md          # Phase 0 出力 (/speckit.plan コマンド)
├── data-model.md        # Phase 1 出力 (/speckit.plan コマンド)
├── quickstart.md        # Phase 1 出力 (/speckit.plan コマンド)
├── contracts/           # Phase 1 出力 (/speckit.plan コマンド)
│   ├── public-api.cs    # C# API仕様
│   └── native-bridge.md # iOS/Android Native SDK呼び出し仕様
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド)
```

### ソースコード (リポジトリルート)
```
unity-plugin/
├── package.json              # UPM manifest
├── README.md                 # Plugin概要（英語）
├── README.ja.md              # Plugin概要（日本語）
├── CHANGELOG.md              # バージョン履歴
├── LICENSE.md                # ライセンス
├── Runtime/
│   ├── PushNotificationManager.cs       # メインエントリポイント
│   ├── NotificationData.cs              # 通知データモデル
│   ├── PushNotificationConfig.cs        # 設定クラス
│   ├── IPlatformBridge.cs               # プラットフォームブリッジ抽象化
│   ├── Platforms/
│   │   ├── IOSBridge.cs                 # iOS DllImport実装
│   │   ├── AndroidBridge.cs             # Android JNI実装
│   │   └── EditorBridge.cs              # Unity Editor疑似実装
│   ├── Utils/
│   │   ├── Logger.cs                    # ロギングユーティリティ
│   │   └── MainThreadDispatcher.cs      # メインスレッド実行
│   └── com.example.push-notification.asmdef
├── Editor/
│   ├── EditorNotificationWindow.cs      # Editor疑似通知送信UI
│   ├── PackageExporter.cs               # .unitypackageエクスポーター
│   └── com.example.push-notification.editor.asmdef
├── Tests/
│   ├── Runtime/
│   │   ├── NotificationDataTests.cs
│   │   ├── PlatformBridgeTests.cs
│   │   └── MainThreadDispatcherTests.cs
│   ├── Editor/
│   │   └── EditorWindowTests.cs
│   └── com.example.push-notification.tests.asmdef
├── Samples~/
│   └── BasicIntegration/
│       ├── Scenes/
│       │   └── SampleScene.unity
│       └── Scripts/
│           └── PushNotificationSample.cs
└── Plugins/
    ├── iOS/
    │   └── PushNotificationSDK.framework  # SPEC-58d1c0d1
    └── Android/
        └── push-notification-sdk.aar      # SPEC-628d6000
```

## Phase 0: アウトライン＆リサーチ

### リサーチタスク
1. **Unity Native Plugin統合パターン**
   - 決定: iOS DllImport + Android AndroidJavaClass
   - 理由: Unity公式推奨パターン、プラットフォーム自動切り替え対応
   - 検討した代替案: UnityPlayerActivity継承（複雑すぎる）

2. **メインスレッドコールバック実装**
   - 決定: MainThreadDispatcherシングルトン + Queue<Action>
   - 理由: Unity API制約（非メインスレッドからAPI呼び出し不可）
   - 検討した代替案: SynchronizationContext（Unity非対応）

3. **Unity Editor疑似通知実装**
   - 決定: EditorBridge + EditorWindow疑似UI
   - 理由: 実機なしで開発者が動作確認可能（開発者体験向上）
   - 検討した代替案: 疑似機能なし（開発サイクル遅延）

4. **PlayerPrefs使用**
   - 決定: PlayerPrefs（トークン永続化）
   - 理由: Unity標準API、プラットフォーム横断対応
   - 検討した代替案: JsonUtility + Application.persistentDataPath（複雑）

5. **UPM配布形式**
   - 決定: Git URL経由インストール（package.json）
   - 理由: Unity 2021.3 LTS公式サポート、依存関係自動解決
   - 検討した代替案: .unitypackage（更新が手動、非推奨）

**出力**: `research.md`にすべてのリサーチ結果を記録

## Phase 1: 設計＆契約

### 1. エンティティ抽出 → `data-model.md`
- **NotificationData**: タイトル、本文、画像URL、カスタムデータ（Key-Valueペア）
- **PushNotificationConfig**: APIキー、エンドポイント、ログ有効化フラグ
- **PlatformType**: iOS, Android, Editor（列挙型）

### 2. API契約生成 → `/contracts/public-api.cs`
```csharp
// メインAPI
PushNotificationManager.Initialize(PushNotificationConfig config)
PushNotificationManager.SetNotificationHandler(Action<NotificationData> onReceived, Action<NotificationData> onOpened)
PushNotificationManager.UpdatePlayerAccountId(string playerId)
PushNotificationManager.UnregisterToken()

// 内部ブリッジAPI
IPlatformBridge.Initialize(string apiKey, string endpoint)
IPlatformBridge.GetDeviceToken() : string
IPlatformBridge.RegisterToken(string token)
IPlatformBridge.SetNotificationCallback(Action<string> callback)
```

### 3. Native SDK呼び出し仕様 → `/contracts/native-bridge.md`
- iOS: DllImport関数シグネチャ（`PushSDK_Initialize`, `PushSDK_GetToken`等）
- Android: AndroidJavaClass呼び出し（`com.example.pushnotification.PushNotificationJNI`）

### 4. テストシナリオ抽出
- **P1 統合テスト**: 初期化→トークン取得→登録→疑似通知受信
- **P2 統合テスト**: 通知コールバック→メインスレッド実行確認
- **P3 統合テスト**: UPMインストール→サンプルシーン動作確認

### 5. `quickstart.md` 作成
- ステップ1: UPM Git URLインストール
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
- 各entity → model作成タスク [P]
- 各ユーザーストーリー → integration testタスク
- テストを合格させる実装タスク

**順序戦略**:
- TDD順序: Contract test → Integration test → Unit test → 実装
- 依存関係順序: Models → Bridges → Manager → Editor UI
- 並列実行のために[P]をマーク

**推定タスク数**: 40-50個
1. Setup (5): UPMプロジェクト作成、Native SDK配置、asmdef設定
2. Tests (15): Contract/Integration/Unit tests
3. Core (20): Models、Bridges、Manager、Logger、MainThreadDispatcher
4. Editor (5): EditorWindow、疑似通知UI
5. Samples (3): サンプルシーン、サンプルスクリプト
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
- [x] Phase 0: Research完了 (/speckit.plan コマンド) - 2025-10-30
- [x] Phase 1: Design完了 (/speckit.plan コマンド) - 2025-10-30
  - [x] research.md作成完了
  - [x] data-model.md作成完了
  - [x] contracts/public-api.cs作成完了
  - [x] contracts/native-bridge.md作成完了
  - [x] quickstart.md作成完了
- [x] Phase 2: Task planning完了 (/speckit.plan コマンド - アプローチのみ記述)
- [ ] Phase 3: Tasks生成済み (/speckit.tasks コマンド)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲートステータス**:
- [x] 初期憲章チェック: 合格
- [x] 設計後憲章チェック: 合格（Phase 1完了後）
  - シンプルさ: ✓ 単一プロジェクト、DTOなし、パターン最小化
  - アーキテクチャ: ✓ Pluginライブラリとして提供
  - TDD: ✓ RED-GREEN-Refactorサイクル厳守
  - 可観測性: ✓ 構造化ロギング実装
  - バージョニング: ✓ MAJOR.MINOR.PATCH形式
- [x] すべての要明確化解決済み
- [x] 複雑さの逸脱を文書化済み（違反なし）

---
*Push Notification SDK開発憲章 v1.0.0 に基づく - 本プロジェクト固有憲章*
