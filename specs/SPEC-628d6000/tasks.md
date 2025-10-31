# タスク: Android Native Push通知SDK

**機能ID**: SPEC-628d6000
**入力**: `/push-notification/specs/SPEC-628d6000/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/

## 実行フロー (Phase 3-4)
```
1. plan.mdから技術スタック・構造を確認 ✓
2. data-model.mdからエンティティを抽出 ✓
3. contracts/からAPI仕様を抽出 ✓
4. TDD順序でタスクを生成（Contract→Integration→E2E→Unit）✓
5. 並列実行可能タスクに[P]マーク付与 ✓
6. 依存関係を明確化 ✓
7. タスク完全性検証 ✓
8. SUCCESS（実装実行準備完了）
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含める

## パス規約
- プロジェクトタイプ: 単一（Android SDKライブラリ）
- ソースコード: `android-sdk/src/main/kotlin/com/example/pushnotification/`
- テストコード: `android-sdk/src/test/kotlin/`
- リソース: `android-sdk/src/main/res/`

## Phase 3.1: セットアップ（T001-T007）

- [ ] **T001** [P] Gradleプロジェクト初期化
  `android-sdk/build.gradle.kts` を作成し、Kotlin DSL設定、Android Library Plugin、ソース/テストディレクトリ指定

- [ ] **T002** [P] Firebase SDK依存関係追加
  `android-sdk/build.gradle.kts` に `firebase-messaging:23.3.1` 依存関係追加

- [ ] **T003** [P] Retrofit/OkHttp/Coil依存関係追加
  `android-sdk/build.gradle.kts` に `retrofit2:2.9+`, `okhttp3:4.12+`, `coil:2.5+` 依存関係追加

- [ ] **T004** [P] テスト依存関係追加
  `android-sdk/build.gradle.kts` に `junit-jupiter:5.10+`, `mockito-kotlin:5.1+`, `robolectric:4.11+` 依存関係追加

- [ ] **T005** [P] ProGuard/R8ルール設定
  `android-sdk/proguard-rules.pro` を作成し、FCM/Retrofit/OkHttp/Gson Keep rules設定

- [ ] **T006** [P] AndroidManifest.xml作成
  `android-sdk/src/main/AndroidManifest.xml` を作成し、FCMService登録、通知アイコンmeta-data設定

- [ ] **T007** [P] サンプルアプリプロジェクト作成
  `android-sdk/samples/basic-sample/` ディレクトリ作成、build.gradle.kts、MainActivity.kt、AndroidManifest.xml設定

## Phase 3.2: テストファースト（TDD）⚠️ Phase 3.3の前に完了必須

**重要**: これらのテストは記述され、実装前に失敗する（RED）必要がある

### Contract Tests（T008-T015）

- [ ] **T008** [P] FCMトークン取得 Contract test
  `android-sdk/src/test/kotlin/contract/TokenManagerContractTest.kt` 作成
  検証: `getToken()` が有効なFCMトークン文字列を返す

- [ ] **T009** [P] トークン登録 Contract test
  `android-sdk/src/test/kotlin/contract/TokenRegistrationContractTest.kt` 作成
  検証: REST API `POST /api/tokens` が201を返し、トークンIDを含む

- [ ] **T010** [P] トークン更新 Contract test
  `android-sdk/src/test/kotlin/contract/TokenUpdateContractTest.kt` 作成
  検証: REST API `PUT /api/tokens/{token}` が200を返し、playerAccountIdが更新される

- [ ] **T011** [P] トークン削除 Contract test
  `android-sdk/src/test/kotlin/contract/TokenDeleteContractTest.kt` 作成
  検証: REST API `DELETE /api/tokens/{token}` が204を返す

- [ ] **T012** [P] 通知受信 Contract test
  `android-sdk/src/test/kotlin/contract/NotificationReceiveContractTest.kt` 作成
  検証: `onMessageReceived()` がNotificationDataを正しくパースする

- [ ] **T013** [P] 通知表示 Contract test
  `android-sdk/src/test/kotlin/contract/NotificationDisplayContractTest.kt` 作成
  検証: `NotificationBuilder.build()` が有効なNotificationオブジェクトを返す

- [ ] **T014** [P] 通知タップハンドリング Contract test
  `android-sdk/src/test/kotlin/contract/NotificationTapContractTest.kt` 作成
  検証: `onNotificationOpened()` コールバックがcustomDataとともに呼び出される

- [ ] **T015** [P] 通知チャンネル作成 Contract test
  `android-sdk/src/test/kotlin/contract/ChannelCreationContractTest.kt` 作成
  検証: `createChannel()` がNotificationChannelを正しく作成する

### Integration Tests（T016-T023）

- [ ] **T016** [P] FCM統合 Integration test（Firebase Emulator使用）
  `android-sdk/src/test/kotlin/integration/FCMIntegrationTest.kt` 作成
  検証: FCMトークン取得→`onNewToken()`コールバック→トークン永続化

- [ ] **T017** [P] REST API統合 Integration test（Mock Server使用）
  `android-sdk/src/test/kotlin/integration/ApiIntegrationTest.kt` 作成
  検証: トークン登録→REST API呼び出し→成功レスポンス→SharedPreferences更新

- [ ] **T018** [P] 画像読み込み Integration test
  `android-sdk/src/test/kotlin/integration/ImageLoadIntegrationTest.kt` 作成
  検証: 画像URL→Coil読み込み→Bitmap変換→BigPictureStyle適用

- [ ] **T019** [P] 通知チャンネル Integration test
  `android-sdk/src/test/kotlin/integration/ChannelIntegrationTest.kt` 作成
  検証: チャンネル作成→NotificationManager登録→チャンネル一覧取得

- [ ] **T020** [P] リトライロジック Integration test
  `android-sdk/src/test/kotlin/integration/RetryIntegrationTest.kt` 作成
  検証: API呼び出し失敗→Exponential Backoff→リトライ成功

- [ ] **T021** [P] フォアグラウンド通知 Integration test
  `android-sdk/src/test/kotlin/integration/ForegroundNotificationIntegrationTest.kt` 作成
  検証: アプリフォアグラウンド→通知受信→カスタムハンドラー呼び出し

- [ ] **T022** [P] バックグラウンド通知 Integration test
  `android-sdk/src/test/kotlin/integration/BackgroundNotificationIntegrationTest.kt` 作成
  検証: アプリバックグラウンド→通知受信→通知表示→タップでアプリ起動

- [ ] **T023** [P] ディープリンク Integration test
  `android-sdk/src/test/kotlin/integration/DeepLinkIntegrationTest.kt` 作成
  検証: 通知タップ→customData解析→ディープリンクURL抽出→Intent起動

## Phase 3.3: コア実装（T024-T047）⚠️ テストが失敗（RED）した後のみ

### Models（T024-T026）

- [ ] **T024** [P] SDKConfig/Logger実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/config/SDKConfig.kt` 作成
  `android-sdk/src/main/kotlin/com/example/pushnotification/config/Logger.kt` 作成
  検証: T008-T015のテストがGREENになる

- [ ] **T025** [P] NotificationData/NotificationAction/NotificationPriority実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/models/NotificationData.kt` 作成
  検証: T012-T014のテストがGREENになる

- [ ] **T026** [P] DeviceToken/TokenUpdate/SDKError実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/models/DeviceToken.kt` 作成
  `android-sdk/src/main/kotlin/com/example/pushnotification/models/TokenUpdate.kt` 作成
  `android-sdk/src/main/kotlin/com/example/pushnotification/models/SDKError.kt` 作成
  検証: T009-T011のテストがGREENになる

### Messaging（T027-T030）

- [ ] **T027** TokenManager実装（RED→GREEN→Refactor）
  `android-sdk/src/main/kotlin/com/example/pushnotification/messaging/TokenManager.kt` 作成
  機能: FCMトークン取得、SharedPreferences永続化、トークン更新検知
  検証: T008, T016のテストがGREENになる

- [ ] **T028** FCMService実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/messaging/FCMService.kt` 作成
  機能: `FirebaseMessagingService`継承、`onNewToken()`/`onMessageReceived()`実装
  検証: T012, T016のテストがGREENになる
  依存: T027完了必須

- [ ] **T029** NotificationHandler実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/messaging/NotificationHandler.kt` 作成
  機能: 通知データ解析、NotificationBuilderへのデリゲート、カスタムハンドラー呼び出し
  検証: T013, T021-T022のテストがGREENになる
  依存: T028完了必須

- [ ] **T030** Refactoring: TokenManager/FCMService/NotificationHandlerのコード整理
  重複削除、関数抽出、命名改善

### API Client（T031-T034）

- [ ] **T031** [P] ApiClient実装（Retrofit + OkHttp）
  `android-sdk/src/main/kotlin/com/example/pushnotification/api/ApiClient.kt` 作成
  機能: Retrofit初期化、Interceptor（X-API-Keyヘッダー追加、リトライロジック）
  検証: T017のテストがGREENになる

- [ ] **T032** TokenService実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/api/TokenService.kt` 作成
  機能: `registerToken()`, `updateToken()`, `deleteToken()` Retrofit インターフェース
  検証: T009-T011, T017のテストがGREENになる
  依存: T031完了必須

- [ ] **T033** [P] NotificationService実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/api/NotificationService.kt` 作成
  機能: `getNotificationStatus()` Retrofit インターフェース
  依存: T031完了必須

- [ ] **T034** Refactoring: ApiClient/TokenService/NotificationServiceのエラーハンドリング統一
  共通エラーマッピング、SDKError変換

### Notification（T035-T039）

- [ ] **T035** NotificationBuilder実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/notification/NotificationBuilder.kt` 作成
  機能: NotificationCompat.Builder生成、タイトル/本文/アイコン設定
  検証: T013のテストがGREENになる

- [ ] **T036** 画像付き通知実装（Coil統合）
  `NotificationBuilder`に`BigPictureStyle`追加、Coil画像読み込み
  検証: T018のテストがGREENになる
  依存: T035完了必須

- [ ] **T037** アクションボタン実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/notification/ActionHandler.kt` 作成
  機能: NotificationCompat.Action生成、PendingIntent設定
  検証: T014のテストがGREENになる
  依存: T035完了必須

- [ ] **T038** ChannelManager実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/notification/ChannelManager.kt` 作成
  機能: `createChannel()`, `deleteChannel()`, `getAllChannels()`
  検証: T015, T019のテストがGREENになる

- [ ] **T039** Refactoring: NotificationBuilder/ActionHandler/ChannelManagerのコード整理
  ビルダーパターン適用、デフォルト値設定

### SDK Entry Point（T040-T042）

- [ ] **T040** PushNotificationSDK実装
  `android-sdk/src/main/kotlin/com/example/pushnotification/PushNotificationSDK.kt` 作成
  機能: `initialize()`, `updatePlayerAccountId()`, `unregisterToken()`, `setNotificationHandler()`
  検証: すべてのContract testsがGREENになる
  依存: T027, T028, T031, T032完了必須

- [ ] **T041** PushNotificationJNI実装（Unity/UE JNIブリッジ）
  `android-sdk/src/main/kotlin/com/example/pushnotification/PushNotificationJNI.kt` 作成
  機能: `@JvmStatic` initialize/updatePlayerAccountId/unregisterToken/setNotificationCallback
  依存: T040完了必須

- [ ] **T042** Refactoring: PushNotificationSDK/PushNotificationJNIのエラーハンドリング統一
  初期化状態チェック、IllegalStateException投げる

## Phase 3.4: 統合＆検証（T043-T052）

### E2E Tests（T043-T046）

- [ ] **T043** サンプルアプリ統合テスト
  `android-sdk/samples/basic-sample/src/androidTest/kotlin/E2ETest.kt` 作成
  検証: アプリ起動→SDK初期化→トークン登録→通知送信→通知表示→タップ

- [ ] **T044** ProGuard/R8ビルドテスト
  サンプルアプリをリリースビルド（minifyEnabled=true）、正常動作確認

- [ ] **T045** [P] Android 7.0-14互換性テスト
  各Androidバージョンで通知表示・タップ動作確認（Firebase Test Lab使用）

- [ ] **T046** [P] メモリリークテスト
  LeakCanary導入、SDK初期化→通知受信→Activity破棄→メモリリーク検出なし確認

### Performance Tests（T047-T049）

- [ ] **T047** [P] SDK初期化パフォーマンステスト
  `android-sdk/src/test/kotlin/performance/InitializationPerformanceTest.kt` 作成
  検証: SDK初期化時間が5秒以内

- [ ] **T048** [P] API呼び出しパフォーマンステスト
  `android-sdk/src/test/kotlin/performance/ApiPerformanceTest.kt` 作成
  検証: トークン登録API呼び出しが3秒以内

- [ ] **T049** [P] 通知表示パフォーマンステスト
  `android-sdk/src/test/kotlin/performance/NotificationPerformanceTest.kt` 作成
  検証: 通知受信→表示が1秒以内

### Distribution（T050-T052）

- [ ] **T050** .aar形式パッケージング
  `build.gradle.kts`にaaR生成タスク追加、`android-sdk/build/outputs/aar/`に出力

- [ ] **T051** [P] Maven Central公開準備
  `build.gradle.kts`にMaven公開設定追加、POM生成、Javadoc/SourcesJar設定

- [ ] **T052** [P] CI/CD設定（GitHub Actions）
  `.github/workflows/android-sdk.yml` 作成
  ビルド→テスト→リリース自動化

## Phase 3.5: 仕上げ（Polish）（T053-T060）

### Unit Tests（T053-T057）⚠️ カバレッジ80%以上必須

- [ ] **T053** [P] SDKConfig/Logger Unit tests
  `android-sdk/src/test/kotlin/unit/config/SDKConfigTest.kt` 作成
  検証: バリデーションロジック、デフォルト値

- [ ] **T054** [P] NotificationData/DeviceToken Unit tests
  `android-sdk/src/test/kotlin/unit/models/NotificationDataTest.kt` 作成
  検証: JSON シリアライゼーション、バリデーション

- [ ] **T055** [P] TokenManager Unit tests
  `android-sdk/src/test/kotlin/unit/messaging/TokenManagerTest.kt` 作成
  検証: SharedPreferences読み書き、トークン更新検知

- [ ] **T056** [P] NotificationBuilder Unit tests
  `android-sdk/src/test/kotlin/unit/notification/NotificationBuilderTest.kt` 作成
  検証: Notification生成、画像読み込み、アクションボタン

- [ ] **T057** [P] ChannelManager Unit tests
  `android-sdk/src/test/kotlin/unit/notification/ChannelManagerTest.kt` 作成
  検証: チャンネル作成・削除・一覧取得

### Documentation（T058-T060）

- [ ] **T058** [P] KDoc APIドキュメント生成
  すべての公開API（PushNotificationSDK, NotificationHandler, ChannelManager, PushNotificationJNI）にKDoc追加
  Dokkaで`android-sdk/docs/`にHTML生成

- [ ] **T059** [P] README.md作成
  `android-sdk/README.md` 作成
  概要、インストール方法、Quickstart、ライセンス

- [ ] **T060** [P] CHANGELOG.md作成
  `android-sdk/CHANGELOG.md` 作成
  v1.0.0初版リリースノート

## 依存関係

### クリティカルパス
```
Setup (T001-T007) → Tests (T008-T023) → Core (T024-T042) → Integration (T043-T052) → Polish (T053-T060)
```

### 詳細依存関係
- **T008-T023（Tests）**: T024-T042（Core）をブロック（TDD: RED→GREEN）
- **T027（TokenManager）**: T028（FCMService）をブロック
- **T028（FCMService）**: T029（NotificationHandler）をブロック
- **T031（ApiClient）**: T032-T033（TokenService/NotificationService）をブロック
- **T035（NotificationBuilder）**: T036-T037（画像/アクションボタン）をブロック
- **T024-T042（Core）**: T040（PushNotificationSDK）に集約
- **T040（PushNotificationSDK）**: T041（PushNotificationJNI）をブロック
- **T040-T042（SDK）**: T043-T052（Integration）をブロック
- **T043-T052（Integration）**: T053-T060（Polish）をブロック

## 並列実行例

### Phase 3.1: Setup（すべて並列実行可能）
```bash
# T001-T007を並列実行
Task: "Gradleプロジェクト初期化"
Task: "Firebase SDK依存関係追加"
Task: "Retrofit/OkHttp/Coil依存関係追加"
Task: "テスト依存関係追加"
Task: "ProGuard/R8ルール設定"
Task: "AndroidManifest.xml作成"
Task: "サンプルアプリプロジェクト作成"
```

### Phase 3.2: Contract Tests（すべて並列実行可能）
```bash
# T008-T015を並列実行
Task: "FCMトークン取得 Contract test"
Task: "トークン登録 Contract test"
Task: "トークン更新 Contract test"
Task: "トークン削除 Contract test"
Task: "通知受信 Contract test"
Task: "通知表示 Contract test"
Task: "通知タップハンドリング Contract test"
Task: "通知チャンネル作成 Contract test"
```

### Phase 3.2: Integration Tests（すべて並列実行可能）
```bash
# T016-T023を並列実行
Task: "FCM統合 Integration test"
Task: "REST API統合 Integration test"
Task: "画像読み込み Integration test"
Task: "通知チャンネル Integration test"
Task: "リトライロジック Integration test"
Task: "フォアグラウンド通知 Integration test"
Task: "バックグラウンド通知 Integration test"
Task: "ディープリンク Integration test"
```

### Phase 3.3: Models（並列実行可能）
```bash
# T024-T026を並列実行
Task: "SDKConfig/Logger実装"
Task: "NotificationData/NotificationAction/NotificationPriority実装"
Task: "DeviceToken/TokenUpdate/SDKError実装"
```

### Phase 3.5: Unit Tests（すべて並列実行可能）
```bash
# T053-T057を並列実行
Task: "SDKConfig/Logger Unit tests"
Task: "NotificationData/DeviceToken Unit tests"
Task: "TokenManager Unit tests"
Task: "NotificationBuilder Unit tests"
Task: "ChannelManager Unit tests"
```

### Phase 3.5: Documentation（すべて並列実行可能）
```bash
# T058-T060を並列実行
Task: "KDoc APIドキュメント生成"
Task: "README.md作成"
Task: "CHANGELOG.md作成"
```

## 注意事項

### TDD厳守
- **RED**: テストを書く → テスト失敗を確認（T008-T023）
- **GREEN**: 最小限の実装でテスト合格（T024-T042）
- **REFACTOR**: コードをクリーンアップ（T030, T034, T039, T042）

### Gitコミット順序
- Contract tests（T008-T015）のコミットがCore実装（T024-T042）より先
- Integration tests（T016-T023）のコミットがCore実装より先
- 例: `feat(test): TokenManager Contract test` → `feat: TokenManager実装`

### 並列実行ルール
- [P]マーク = 異なるファイル、依存関係なし → 並列実行可能
- [P]なし = 同じファイル編集 or 依存関係あり → 順次実行必須

### タスク完了基準
- すべてのテストがGREEN（合格）
- コードカバレッジ80%以上（Unit tests）
- ProGuard/R8ビルド成功
- Android 7.0-14互換性確認
- メモリリークなし

## 次のステップ

1. Phase 3.1（Setup）から開始
2. Phase 3.2（Tests）でRED確認
3. Phase 3.3（Core）でGREEN達成
4. Phase 3.4（Integration）で統合確認
5. Phase 3.5（Polish）で品質向上
6. `/speckit.implement`コマンドで実装実行（オプション）

**実装実行準備完了**: すべてのタスクが具体的で実行可能
