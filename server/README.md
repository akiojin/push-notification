# Push Notification API Server

TypeScript/Fastify ベースのバックエンド API。デバイストークン管理と通知送信を提供し、iOS/Android 向け SDK から利用されることを想定しています。

## 開発前提

- Node.js 22+
- PostgreSQL 16
- `prisma` CLI

## セットアップ

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d db   # ローカル PostgreSQL を起動
```

### マイグレーション

```bash
# 初期化（DBが空の場合）
npx prisma migrate deploy

# スキーマ変更を開発中に適用
npm run prisma:migrate
```

> `docker compose down -v` でローカルの `pgdata` ボリュームを削除すると、DB をリセットできます。

## 開発コマンド

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | tsx を用いたホットリロードサーバー |
| `npm run test` | Vitest (unit + integration) |
| `npm run lint` | ESLint による静的解析 |
| `npm run format:fix` | Prettier フォーマット |
| `npm run prisma:migrate` | Prisma マイグレーション |

## API トップレベル

- `POST /api/v1/tokens` デバイストークン登録/更新
- `DELETE /api/v1/tokens/:token` デバイストークン削除
- `GET /api/v1/tokens/:token` デバイストークン詳細と配信履歴取得
- `POST /api/v1/notifications` 通知作成（配信ログ生成）
- `GET /healthz` ヘルスチェック (API キー不要)

Swagger ドキュメント: `GET /docs`

## テスト

`npm test` 実行時、統合テストは Fastify インスタンスをインメモリで構築します。PostgreSQL 接続が必要なテストは今後 Testcontainers 化する予定です。

## 環境変数

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `API_KEY` | API 認証に使用するキー | - |
| `DATABASE_URL` | PostgreSQL 接続 URL | - |
| `RATE_LIMIT_MAX` | 1 分間のリクエスト上限 | `100` |
| `RATE_LIMIT_TIME_WINDOW` | レート制限の時間窓 | `1 minute` |
| `DELIVERY_RETRY_INTERVAL_MS` | 配信リトライワーカーのポーリング間隔 (ms) | `1000` |
| `DELIVERY_RETRY_BATCH_SIZE` | リトライ 1 周期で処理する DeliveryLog 件数 | `20` |
| `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_BUNDLE_ID` / `APNS_PRIVATE_KEY` | APNs 配信用資格情報 | - |
| `FCM_CREDENTIALS` | FCM サービスアカウント JSON のパス | - |

> 本番環境では配信 SLA に応じて `DELIVERY_RETRY_INTERVAL_MS` と `DELIVERY_RETRY_BATCH_SIZE` を調整してください。
