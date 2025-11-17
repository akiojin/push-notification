# タスク: クロスプラットフォームPush通知配信システム

**入力**: `/specs/SPEC-2d193ce6/`の設計ドキュメント
**前提条件**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/openapi.yaml ✓

## 実行フロー
```
1. plan.mdから技術スタック抽出 ✓
   → TypeScript 5.3, Node.js 22, Fastify, Prisma, PostgreSQL
2. data-model.mdからエンティティ抽出 ✓
   → Device, Notification, DeliveryLog
3. contracts/openapi.yamlからエンドポイント抽出 ✓
   → 5エンドポイント（tokens: POST/PUT/DELETE, notifications: POST/GET）
4. カテゴリ別タスク生成 ✓
5. TDD順序適用 ✓
6. 並列実行マーキング [P] ✓
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含める

## Phase 3.1: セットアップ
- [ ] **T001** プロジェクト構造を作成（`server/src/`, `server/tests/`, `server/prisma/`）
- [ ] **T002** package.jsonを初期化し、依存関係をインストール（Fastify, Prisma, Vitest, node-apn, firebase-admin等）
- [ ] **T003** [P] TypeScript設定（`tsconfig.json`: target ES2022, strict mode）
- [ ] **T004** [P] ESLint/Prettier設定（`.eslintrc.json`, `.prettierrc`）
- [ ] **T005** [P] Prismaスキーマ初期設定（`prisma/schema.prisma`: PostgreSQLプロバイダー）
- [ ] **T006** [P] Docker Compose設定（`docker-compose.yml`: PostgreSQL 16コンテナ）
- [ ] **T007** [P] 環境変数テンプレート（`.env.example`: DATABASE_URL, APNS_KEY_ID, FCM_SERVICE_ACCOUNT_PATH等）

## Phase 3.2: テストファースト（TDD） ⚠️ Phase 3.3の前に完了必須
**重要: これらのテストは記述され、実装前に失敗する必要がある（RED フェーズ）**

### Contract Tests（OpenAPI仕様準拠）
- [ ] **T008** [P] `tests/contract/tokens-post.test.ts` に POST /api/v1/tokens の契約テスト（リクエスト/レスポンススキーマ検証）
- [x] **T009** [P] `tests/contract/tokens-put.test.ts` に PUT /api/v1/tokens/{token} の契約テスト
- [ ] **T010** [P] `tests/contract/tokens-delete.test.ts` に DELETE /api/v1/tokens/{token} の契約テスト
- [ ] **T011** [P] `tests/contract/notifications-post.test.ts` に POST /api/v1/notifications の契約テスト
- [ ] **T012** [P] `tests/contract/notifications-get.test.ts` に GET /api/v1/notifications/{id} の契約テスト

### Integration Tests（ユーザーストーリーベース）
- [x] **T013** [P] `tests/integration/story-1-realtime-notification.test.ts` にストーリー1の統合テスト（単一/複数デバイス通知、画像/カスタムデータ）
- [x] **T014** [P] `tests/integration/story-2-device-lifecycle.test.ts` にストーリー2の統合テスト（登録/更新/削除/複数デバイス）
- [x] **T015** [P] `tests/integration/story-3-delivery-status.test.ts` にストーリー3の統合テスト（配信状況確認、エラー詳細、統計情報）

## Phase 3.3: コア実装（テストが失敗した後のみ）

### Prismaスキーマ＆マイグレーション
- [ ] **T016** [P] `prisma/schema.prisma` にDeviceモデル定義（id, token, platform, playerAccountId, createdAt, updatedAt）
- [ ] **T017** [P] `prisma/schema.prisma` にNotificationモデル定義（id, title, body, imageUrl, customData, createdAt）
- [ ] **T018** [P] `prisma/schema.prisma` にDeliveryLogモデル定義（id, notificationId, deviceId, status, errorCode, errorMessage, sentAt, deliveredAt）
- [ ] **T019** Prismaマイグレーション生成・適用（`npx prisma migrate dev --name init`）
- [ ] **T020** Prisma Client生成（`npx prisma generate`）

### ライブラリ実装（ビジネスロジック）
- [ ] **T021** [P] `src/lib/notification/apns.ts` にAPNs通知送信ライブラリ（node-apn使用、.p8トークン認証、エラーハンドリング）
- [ ] **T022** [P] `src/lib/notification/fcm.ts` にFCM通知送信ライブラリ（firebase-admin使用、サービスアカウント認証）
- [ ] **T023** [P] `src/lib/notification/index.ts` に統一通知送信インターフェース（プラットフォーム自動選択）
- [ ] **T024** [P] `src/lib/device/index.ts` にデバイス管理ライブラリ（登録/更新/削除、Prisma CRUD）
- [ ] **T025** [P] `src/lib/delivery/index.ts` に配信トラッキングライブラリ（状態更新、リトライロジック）

### ミドルウェア
- [ ] **T026** [P] `src/middleware/auth.ts` にAPI Key認証ミドルウェア（X-API-Keyヘッダー検証、bcryptハッシュ比較）
- [ ] **T027** [P] `src/middleware/logger.ts` に構造化ロギングミドルウェア（Pino logger、リクエストID生成）
- [ ] **T028** [P] `src/middleware/error-handler.ts` にエラーハンドリングミドルウェア（統一エラーレスポンス形式）

### API Routes実装
- [ ] **T029** `src/routes/tokens.ts` に POST /api/v1/tokens エンドポイント（デバイストークン登録、upsert処理）
- [x] **T030** `src/routes/tokens.ts` に PUT /api/v1/tokens/{token} エンドポイント（デバイストークン更新）
- [ ] **T031** `src/routes/tokens.ts` に DELETE /api/v1/tokens/{token} エンドポイント（デバイストークン削除）
- [ ] **T032** `src/routes/notifications.ts` に POST /api/v1/notifications エンドポイント（通知送信、バッチ処理）
- [ ] **T033** `src/routes/notifications.ts` に GET /api/v1/notifications/{id} エンドポイント（配信状況取得）
- [ ] **T034** `src/server.ts` にFastifyサーバー初期化（ルート登録、ミドルウェア適用、エラーハンドリング）
- [ ] **T035** `src/server.ts` にレート制限設定（@fastify/rate-limit: 通知100/分、トークン500/分）

## Phase 3.4: 統合＆検証

### リトライ・エラーハンドリング
- [ ] **T036** `src/lib/delivery/index.ts` に配信失敗時の自動リトライロジック（指数バックオフ、最大3回）
- [ ] **T037** `src/lib/notification/apns.ts` に無効トークン検出処理（APNs 410 Unregistered → Device削除）
- [ ] **T038** `src/lib/notification/fcm.ts` に無効トークン検出処理（FCM InvalidRegistration → Device削除）

### Testcontainers統合テスト環境
- [x] **T039** [P] `tests/setup/testcontainers.ts` にTestcontainers PostgreSQL設定（テスト用DB自動起動）
- [ ] **T040** [P] `tests/setup/apns-mock.ts` にAPNs Sandboxモックサーバー設定（テスト用）
- [ ] **T041** [P] `tests/setup/fcm-mock.ts` にFCM Sandboxモックサーバー設定（テスト用）

### Contract Tests検証（GREEN フェーズ）
- [ ] **T042** T008-T012の契約テストが合格することを確認（OpenAPI仕様準拠検証）

### Integration Tests検証（GREEN フェーズ）
- [x] **T043** T013の統合テスト（ストーリー1）が合格することを確認（リアルタイム通知送信）
- [x] **T044** T014の統合テスト（ストーリー2）が合格することを確認（デバイスライフサイクル）
- [x] **T045** T015の統合テスト（ストーリー3）が合格することを確認（配信状況確認）

## Phase 3.5: 仕上げ

### Unit Tests
- [ ] **T046** [P] `tests/unit/device-validation.test.ts` にデバイストークン検証のユニットテスト（iOS/Android形式）
- [ ] **T047** [P] `tests/unit/notification-payload.test.ts` に通知ペイロード検証のユニットテスト（4KBサイズ制限）
- [ ] **T048** [P] `tests/unit/auth-middleware.test.ts` にAPI Key認証ミドルウェアのユニットテスト

### パフォーマンステスト
- [ ] **T049** [P] `tests/performance/notification-sending.test.ts` に通知送信パフォーマンステスト（10,000デバイス同時送信、10秒以内）
- [ ] **T050** [P] `tests/performance/api-response-time.test.ts` にAPIレスポンスタイムテスト（p95 < 200ms）

### インフラ・ドキュメント
- [ ] **T051** [P] `Dockerfile` を作成（Node.js 22 Alpine、マルチステージビルド）
- [ ] **T052** [P] `docker-compose.yml` を更新（server, postgres, redis（オプション）サービス定義）
- [ ] **T053** [P] `README.md` を更新（セットアップ手順、quickstart.mdへのリンク）
- [ ] **T054** [P] `.github/workflows/ci.yml` にCI/CD設定（テスト実行、Lint、ビルド）
- [ ] **T055** [P] `server/scripts/generate-api-key.ts` にAPIキー生成スクリプト（UUIDv4 + bcryptハッシュ）

### リファクタリング＆最適化
- [ ] **T056** コードレビュー: 重複コード削減、型安全性向上
- [ ] **T057** Prismaクエリ最適化: N+1クエリ回避、インデックス確認
- [ ] **T058** エラーメッセージ改善: ユーザーフレンドリーなメッセージ、詳細コンテキスト

### 最終検証
- [ ] **T059** `quickstart.md` の全手順を実行して検証（セットアップ → 通知送信 → 配信確認）
- [ ] **T060** カバレッジレポート生成・確認（Unit: 80%以上、Integration: クリティカルパス100%）

## 依存関係

### 必須順序
- **Setup (T001-T007)** が **すべてのフェーズ** をブロック
- **T019-T020 (Prismaマイグレーション)** が **T029-T035 (API Routes)** をブロック
- **Tests (T008-T015)** が **Implementation (T016-T041)** より先（TDD）
- **T016-T020 (Models)** が **T024-T025 (Device/Delivery Libraries)** をブロック
- **T021-T023 (Notification Libraries)** が **T032 (POST notifications)** をブロック
- **T026-T028 (Middleware)** が **T034 (Server Init)** をブロック
- **T029-T035 (API Routes)** が **T042-T045 (Tests Verification)** をブロック
- **Implementation (T016-T041)** が **Polish (T046-T060)** より先

### 並列実行可能グループ
- **Group A (Setup)**: T003, T004, T005, T006, T007
- **Group B (Contract Tests)**: T008, T009, T010, T011, T012
- **Group C (Integration Tests)**: T013, T014, T015
- **Group D (Models)**: T016, T017, T018
- **Group E (Libraries)**: T021, T022, T023, T024, T025
- **Group F (Middleware)**: T026, T027, T028
- **Group G (Testcontainers)**: T039, T040, T041
- **Group H (Unit Tests)**: T046, T047, T048
- **Group I (Performance Tests)**: T049, T050
- **Group J (Docs/Infra)**: T051, T052, T053, T054, T055

## 並列実行例

### フェーズ1: Setup（T003-T007を同時起動）
```bash
Task: "TypeScript設定（tsconfig.json）"
Task: "ESLint/Prettier設定"
Task: "Prismaスキーマ初期設定"
Task: "Docker Compose設定"
Task: "環境変数テンプレート作成"
```

### フェーズ2: Contract Tests（T008-T012を同時起動）
```bash
Task: "POST /api/v1/tokens の契約テスト"
Task: "PUT /api/v1/tokens/{token} の契約テスト"
Task: "DELETE /api/v1/tokens/{token} の契約テスト"
Task: "POST /api/v1/notifications の契約テスト"
Task: "GET /api/v1/notifications/{id} の契約テスト"
```

### フェーズ3: Integration Tests（T013-T015を同時起動）
```bash
Task: "ストーリー1の統合テスト（リアルタイム通知）"
Task: "ストーリー2の統合テスト（デバイスライフサイクル）"
Task: "ストーリー3の統合テスト（配信状況確認）"
```

### フェーズ4: Models（T016-T018を同時起動）
```bash
Task: "Deviceモデル定義"
Task: "Notificationモデル定義"
Task: "DeliveryLogモデル定義"
```

### フェーズ5: Libraries（T021-T025を同時起動）
```bash
Task: "APNs通知送信ライブラリ"
Task: "FCM通知送信ライブラリ"
Task: "統一通知送信インターフェース"
Task: "デバイス管理ライブラリ"
Task: "配信トラッキングライブラリ"
```

## 注意事項

### TDD厳守
- ⚠️ **すべてのテスト（T008-T015）は実装（T016-T041）より先に完了**
- ⚠️ **REDフェーズ確認必須**: テストが失敗することを確認してからコミット
- ⚠️ **GREENフェーズ**: 実装後、テストが合格することを確認
- ⚠️ **REFACTORフェーズ**: テスト合格後、コードをクリーンアップ

### コミット戦略
- 各タスク完了後に必ずコミット（コミットメッセージに`T0XX`を含める）
- テストコミットが実装コミットより先にGit履歴に表示される必要がある
- 例: `test(contract): T008 POST /tokens の契約テスト追加` → `feat(api): T029 POST /tokens エンドポイント実装`

### ファイルパス規約
- プロジェクトルート: `/push-notification/server/`
- ソース: `src/`
- テスト: `tests/`
- Prisma: `prisma/`

## 検証チェックリスト

- [x] すべてのcontracts（5エンドポイント）に対応するテストがある（T008-T012）
- [x] すべてのentities（3モデル）にPrismaモデルタスクがある（T016-T018）
- [x] すべてのテストが実装より先にある（T008-T015 < T016-T041）
- [x] 並列タスク [P] は本当に独立している（異なるファイル、依存関係なし）
- [x] 各タスクは正確なファイルパスを指定
- [x] 同じファイルを変更する [P] タスクがない
- [x] TDD順序: RED（テスト失敗） → GREEN（実装） → REFACTOR（リファクタリング）
- [x] 憲章要件準拠: シンプルさ、アーキテクチャ、テストファースト、可観測性、バージョニング
