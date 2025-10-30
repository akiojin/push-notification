# 実装計画: クロスプラットフォームPush通知配信システム

**機能ID**: `SPEC-2d193ce6` | **日付**: 2025-10-30 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/SPEC-2d193ce6/spec.md`の機能仕様

## 実行フロー (/speckit.plan コマンドのスコープ)
```
1. 入力パスから機能仕様を読み込み ✓
2. 技術コンテキストを記入 → 進行中
3. 憲章チェックセクションを評価 → 進行中
4. Phase 0 を実行 → research.md
5. Phase 1 を実行 → contracts/, data-model.md, quickstart.md
6. 憲章チェックセクションを再評価
7. Phase 2 を計画 → タスク生成アプローチ記述
8. 停止 - /speckit.tasks コマンドの準備完了
```

## 概要

Unity/Unreal Engine向けPush通知SDKのバックエンド基盤として、REST API仕様とリファレンスサーバー実装を提供する。ゲーム開発者がiOS/Androidプレイヤーにリアルタイム通知を送信できるようにし、デバイストークン管理、通知配信、配信状況確認の機能を提供する。

**主要要件**:
- デバイストークン登録/更新/削除のREST API
- iOS（APNs）/Android（FCM）への通知配信
- 配信履歴と状態管理
- 認証・認可機構
- OpenAPI 3.0仕様書

## 技術コンテキスト
**言語/バージョン**: TypeScript 5.3, Node.js 22 LTS
**主要依存関係**: Fastify (HTTP framework), Prisma (ORM), node-apn (APNs client), firebase-admin (FCM SDK)
**ストレージ**: PostgreSQL 16 (デバイス登録、通知履歴)
**テスト**: Vitest (unit/integration), Supertest (API testing), Testcontainers (PostgreSQL for integration tests)
**対象プラットフォーム**: Linuxサーバー (Docker), Node.js runtime
**プロジェクトタイプ**: single (APIサーバー単体、フロントエンドなし)
**パフォーマンス目標**: 10,000デバイスへの同時通知送信、通知受信まで90%が10秒以内、配信成功率95%以上
**制約**: APNs/FCMのペイロードサイズ制限4KB、プラットフォームレート制限遵守、配信失敗時の自動リトライ
**スケール/スコープ**: 10,000デバイス同時通知、REST API 5エンドポイント、3エンティティ（Device, Notification, DeliveryLog）

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:
- プロジェクト数: 1 (api) ✓
- フレームワークを直接使用? Yes (Fastify直接使用、ラッパークラスなし) ✓
- 単一データモデル? Yes (Prismaスキーマのみ、DTOなし) ✓
- パターン回避? Yes (Repository/UoWパターンなし、Prisma直接使用) ✓

**アーキテクチャ**:
- すべての機能をライブラリとして? Yes (通知配信ロジックをlib/として分離)
- ライブラリリスト:
  - `lib/notification`: 通知送信ロジック（APNs/FCM抽象化）
  - `lib/device`: デバイストークン管理ロジック
  - `lib/delivery`: 配信状態トラッキング
- ライブラリごとのCLI: なし（APIサーバーのみ）
- ライブラリドキュメント: llms.txt形式でOpenAPI仕様を提供

**テスト (妥協不可)**:
- RED-GREEN-Refactorサイクルを強制? Yes (Vitestでテストファースト)
- Gitコミットはテストが実装より先に表示? Yes（TDD厳守）
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? Yes
- 実依存関係を使用? Yes (TestcontainersでPostgreSQL、APNs/FCM Sandboxモード)
- Integration testの対象: すべてのREST API、APNs/FCM統合
- 禁止: テスト前の実装、REDフェーズのスキップ ✓

**可観測性**:
- 構造化ロギング含む? Yes (Pino logger、JSON形式)
- フロントエンドログ → バックエンド? N/A (フロントエンドなし)
- エラーコンテキスト十分? Yes (エラーコード、スタックトレース、リクエストID)

**バージョニング**:
- バージョン番号割り当て済み? Yes (0.1.0から開始、MAJOR.MINOR.BUILD形式)
- 変更ごとにBUILDインクリメント? Yes (`npm version patch/minor/major`使用)
- 破壊的変更を処理? Yes (OpenAPI仕様でバージョニング、/v1プレフィックス)

## プロジェクト構造

### ドキュメント (この機能)
```
specs/SPEC-2d193ce6/
├── plan.md              # このファイル
├── research.md          # Phase 0 出力
├── data-model.md        # Phase 1 出力
├── quickstart.md        # Phase 1 出力
├── contracts/           # Phase 1 出力
│   └── openapi.yaml     # OpenAPI 3.0仕様
└── tasks.md             # Phase 2 出力 (/speckit.tasks)
```

### ソースコード (リポジトリルート)
```
# オプション1: 単一プロジェクト (選択)
server/
├── src/
│   ├── lib/                    # ビジネスロジックライブラリ
│   │   ├── notification/       # 通知送信ライブラリ
│   │   │   ├── apns.ts
│   │   │   ├── fcm.ts
│   │   │   └── index.ts
│   │   ├── device/             # デバイス管理ライブラリ
│   │   │   └── index.ts
│   │   └── delivery/           # 配信トラッキングライブラリ
│   │       └── index.ts
│   ├── routes/                 # REST APIルート
│   │   ├── tokens.ts           # /api/v1/tokens
│   │   └── notifications.ts    # /api/v1/notifications
│   ├── models/                 # Prismaスキーマ
│   │   └── schema.prisma
│   ├── middleware/             # 認証・ロギング
│   │   ├── auth.ts
│   │   └── logger.ts
│   └── server.ts               # Fastifyサーバーエントリーポイント
├── tests/
│   ├── contract/               # OpenAPI契約テスト
│   ├── integration/            # API統合テスト（実DB使用）
│   └── unit/                   # ユニットテスト
├── prisma/
│   └── migrations/             # DBマイグレーション
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── package.json
```

**構造決定**: 単一プロジェクト（APIサーバーのみ）

## Phase 0: アウトライン＆リサーチ

### 不明点と研究タスク

1. **APNs統合方法**:
   - タスク: "Research Apple Push Notification service (APNs) integration with Node.js"
   - 焦点: node-apn vs apn2 vs native HTTP/2, 証明書管理、Sandbox/Production環境

2. **FCM統合方法**:
   - タスク: "Research Firebase Cloud Messaging (FCM) integration with Node.js"
   - 焦点: firebase-admin SDK, サーバーキー管理、トピック vs デバイストークン

3. **認証方式**:
   - タスク: "Research API authentication patterns for game backend services"
   - 焦点: API Key vs OAuth2 vs JWT、ゲーム開発者向けのシンプルさ

4. **レート制限実装**:
   - タスク: "Research rate limiting strategies for push notification APIs"
   - 焦点: APNs/FCMのレート制限、リトライロジック、バックプレッシャー

5. **配信状態管理**:
   - タスク: "Research notification delivery status tracking patterns"
   - 焦点: 非同期配信結果の保存、Webhook vs Polling、デバイストークン無効化検出

### Research出力形式 (research.md)

各リサーチタスクの結果を以下の形式で記録：

```markdown
## [タスク名]

**決定**: [選択されたアプローチ]

**理由**:
- [選択した理由1]
- [選択した理由2]

**検討した代替案**:
- **[代替案1]**: [却下理由]
- **[代替案2]**: [却下理由]

**実装ノート**:
- [実装時の注意点]
```

## Phase 1: 設計＆契約

### 1. データモデル設計 (data-model.md)

#### エンティティ

**Device** (デバイス登録情報):
- id: UUID (PK)
- token: String (デバイストークン、Unique)
- platform: Enum (iOS, Android)
- playerAccountId: String (オプション、プレイヤー識別子)
- createdAt: DateTime
- updatedAt: DateTime

**検証ルール**:
- tokenは必須、プラットフォーム別の形式検証
- platformはiOS/Androidのみ
- 同じtokenの重複登録時はupsert（更新）

**Notification** (通知メッセージ):
- id: UUID (PK)
- title: String
- body: String
- imageUrl: String (オプション)
- customData: JSON (オプション、ディープリンク等)
- createdAt: DateTime

**検証ルール**:
- titleとbodyは必須
- ペイロードサイズ合計4KB以内

**DeliveryLog** (配信履歴):
- id: UUID (PK)
- notificationId: UUID (FK → Notification)
- deviceId: UUID (FK → Device)
- status: Enum (pending, success, failed)
- errorCode: String (オプション)
- errorMessage: String (オプション)
- sentAt: DateTime
- deliveredAt: DateTime (オプション)

**状態遷移**:
- pending → success (配信成功)
- pending → failed (配信失敗)

### 2. API契約 (contracts/openapi.yaml)

OpenAPI 3.0仕様を生成：

**エンドポイント**:

1. `POST /api/v1/tokens` - デバイストークン登録
   - Request: `{ token: string, platform: "iOS" | "Android", playerAccountId?: string }`
   - Response: `{ id: UUID, token: string, platform: string, createdAt: string }`

2. `PUT /api/v1/tokens/{token}` - デバイストークン更新
   - Request: `{ playerAccountId?: string }`
   - Response: `{ id: UUID, token: string, updatedAt: string }`

3. `DELETE /api/v1/tokens/{token}` - デバイストークン削除
   - Response: `{ success: true }`

4. `POST /api/v1/notifications` - 通知送信
   - Request: `{ tokens: string[], title: string, body: string, imageUrl?: string, customData?: object }`
   - Response: `{ notificationId: UUID, deliveryLogs: Array<{ deviceId: UUID, status: string }> }`

5. `GET /api/v1/notifications/{id}` - 通知配信状況確認
   - Response: `{ notificationId: UUID, deliveryLogs: Array<{ deviceId: UUID, status: string, errorCode?: string, errorMessage?: string }> }`

**認証**:
- `X-API-Key` ヘッダー（全エンドポイント必須）

**エラーレスポンス**:
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Device token format is invalid for iOS platform",
    "details": {
      "token": "...",
      "expectedFormat": "64-character hexadecimal string"
    }
  }
}
```

### 3. 契約テスト生成 (tests/contract/)

各エンドポイントに対して契約テスト作成：

- `tests/contract/tokens.test.ts`: トークン管理APIの契約テスト
- `tests/contract/notifications.test.ts`: 通知送信APIの契約テスト

テスト内容：
- OpenAPI仕様とレスポンススキーマの一致検証
- 必須フィールドの存在確認
- エラーレスポンスの形式検証

### 4. テストシナリオ抽出 (tests/integration/)

ユーザーストーリーからintegration testシナリオを作成：

**ストーリー1（P1）: リアルタイム通知送信**:
- Scenario 1: 単一デバイスへの通知送信成功
- Scenario 2: 複数デバイス（iOS/Android混在）への通知送信成功
- Scenario 3: 画像付き通知の送信と受信
- Scenario 4: カスタムデータ（ディープリンク）付き通知

**ストーリー2（P2）: デバイストークンライフサイクル**:
- Scenario 1: 新規デバイストークン登録
- Scenario 2: 既存トークンの更新（upsert）
- Scenario 3: トークン削除後、通知が送信されない
- Scenario 4: 同一プレイヤーの複数デバイス登録

**ストーリー3（P3）: 配信状況確認**:
- Scenario 1: 配信成功の確認
- Scenario 2: 配信失敗とエラー理由の確認
- Scenario 3: 大量配信の統計情報確認

### 5. エージェントファイル更新

`CLAUDE.md`を更新：
- 技術スタック: TypeScript, Fastify, Prisma, APNs/FCM
- プロジェクト構造: server/src/lib/notification等
- TDDサイクル: RED-GREEN-Refactor厳守
- OpenAPI仕様の場所: specs/SPEC-2d193ce6/contracts/openapi.yaml

## Phase 2: タスク計画アプローチ

**タスク生成戦略**:

1. **契約ベースタスク** (並列実行可能 [P]):
   - `/api/v1/tokens` 契約テスト作成 [P]
   - `/api/v1/notifications` 契約テスト作成 [P]
   - OpenAPI仕様検証タスク [P]

2. **エンティティベースタスク** (並列実行可能 [P]):
   - Device Prismaモデル作成 [P]
   - Notification Prismaモデル作成 [P]
   - DeliveryLog Prismaモデル作成 [P]
   - Prismaマイグレーション生成・適用

3. **ライブラリ実装タスク** (依存関係あり):
   - APNs通知送信ライブラリ (lib/notification/apns.ts)
   - FCM通知送信ライブラリ (lib/notification/fcm.ts)
   - デバイス管理ライブラリ (lib/device/)
   - 配信トラッキングライブラリ (lib/delivery/)

4. **APIルート実装タスク** (ライブラリ依存):
   - `/api/v1/tokens` POSTエンドポイント実装
   - `/api/v1/tokens/{token}` PUTエンドポイント実装
   - `/api/v1/tokens/{token}` DELETEエンドポイント実装
   - `/api/v1/notifications` POSTエンドポイント実装
   - `/api/v1/notifications/{id}` GETエンドポイント実装

5. **統合テストタスク** (各ストーリー):
   - ストーリー1: リアルタイム通知送信テスト（4シナリオ）
   - ストーリー2: トークンライフサイクルテスト（4シナリオ）
   - ストーリー3: 配信状況確認テスト（3シナリオ）

6. **インフラ・環境タスク**:
   - Dockerfile作成
   - docker-compose.yml作成（PostgreSQL, APNs/FCM設定）
   - 環境変数管理（.env.example）
   - CI/CD設定（GitHub Actions）

**順序戦略**:
- TDD順序: テストファイル作成 → テスト失敗確認 → 実装 → テスト成功
- 依存関係順序: Prismaモデル → ライブラリ → APIルート → 統合テスト
- 並列化: 契約テスト、エンティティモデル、個別ライブラリは並列実行可能

**推定出力**: tasks.mdに約35-40個のタスク

## Phase 3+: 今後の実装

**Phase 3**: タスク実行 (/speckit.tasksコマンドがtasks.mdを作成)
**Phase 4**: 実装 (tasks.mdを実行、TDD厳守)
**Phase 5**: 検証 (quickstart.md実行、パフォーマンステスト、配信成功率確認)

## 複雑さトラッキング

| 違反 | 必要な理由 | より単純な代替案が却下された理由 |
|------|-----------|--------------------------------|
| なし | - | - |

すべての憲章要件を満たしています。

## 進捗トラッキング

**フェーズステータス**:
- [x] Phase 0: Research完了 ✓
- [x] Phase 1: Design完了 ✓
- [x] Phase 2: Task planning完了 ✓
- [x] Phase 3: Tasks生成済み ✓ (60タスク、tasks.md作成完了)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲートステータス**:
- [x] 初期憲章チェック: 合格 ✓
- [x] 設計後憲章チェック: 合格 ✓
- [x] すべての要明確化解決済み ✓
- [x] 複雑さの逸脱を文書化済み (逸脱なし) ✓

---
*憲章 v2.1.1 に基づく - `/.specify/memory/constitution.md` 参照*
