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
- `POST /api/v1/notifications` 通知作成（配信ログ生成）
- `GET /healthz` ヘルスチェック (API キー不要)

Swagger ドキュメント: `GET /docs`

## テスト

`npm test` 実行時、統合テストは Fastify インスタンスをインメモリで構築します。PostgreSQL 接続が必要なテストは今後 Testcontainers 化する予定です。
