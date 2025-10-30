# クイックスタート: Push通知API

## 概要

このガイドでは、Push通知APIをローカル環境でセットアップし、実際に通知を送信するまでの手順を説明します。

## 前提条件

- Node.js 22 LTS以上
- Docker & Docker Compose（PostgreSQLコンテナ用）
- APNs認証キー（.p8ファイル）またはFCMサービスアカウントキー（JSON）

## セットアップ

### 1. リポジトリのクローンと依存関係インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourorg/push-notification.git
cd push-notification/server

# 依存関係をインストール
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/pushnotification?schema=public"

# API
API_KEY_HASH="$2b$10$..."  # bcryptハッシュ化されたAPIキー
PORT=3000
NODE_ENV=development

# APNs Configuration
APNS_KEY_ID="ABC123XYZ"
APNS_TEAM_ID="DEF456UVW"
APNS_TOPIC="com.yourcompany.yourgame"
APNS_KEY_PATH="./certs/AuthKey_ABC123XYZ.p8"
APNS_PRODUCTION=false  # Sandbox環境

# FCM Configuration
FCM_SERVICE_ACCOUNT_PATH="./certs/firebase-service-account.json"
```

### 3. PostgreSQLの起動

```bash
# Docker Composeでデータベースを起動
docker-compose up -d postgres

# データベースが起動するまで待機
sleep 5
```

### 4. データベースマイグレーション

```bash
# Prismaマイグレーションを実行
npx prisma migrate dev

# Prisma Clientを生成
npx prisma generate
```

### 5. サーバー起動

```bash
# 開発モードで起動
npm run dev

# または本番モード
npm run build
npm start
```

サーバーが起動したら、`http://localhost:3000` でアクセス可能になります。

## 基本的な使用方法

### APIキーの生成

```bash
# APIキーを生成（UUIDv4）
npm run generate-api-key

# 出力例:
# API Key: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
# Hash (for .env): $2b$10$...
```

生成されたハッシュを`.env`の`API_KEY_HASH`に設定します。

### 1. デバイストークンの登録

```bash
curl -X POST http://localhost:3000/api/v1/tokens \
  -H "Content-Type: application/json" \
  -H "X-API-Key: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6" \
  -d '{
    "token": "your-device-token-here",
    "platform": "iOS",
    "playerAccountId": "player-12345"
  }'
```

レスポンス例：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "your-device-token-here",
  "platform": "iOS",
  "playerAccountId": "player-12345",
  "createdAt": "2025-10-30T12:00:00.000Z",
  "updatedAt": "2025-10-30T12:00:00.000Z"
}
```

### 2. Push通知の送信

```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6" \
  -d '{
    "tokens": ["your-device-token-here"],
    "title": "New Mission Available!",
    "body": "Check out the new daily mission in the game",
    "imageUrl": "https://example.com/images/mission.png",
    "customData": {
      "action": "open_mission",
      "missionId": "123"
    }
  }'
```

レスポンス例：

```json
{
  "notificationId": "660f9511-f3ac-52e5-b827-557766551111",
  "deliveryLogs": [
    {
      "deviceId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "pending"
    }
  ]
}
```

### 3. 配信状況の確認

```bash
curl -X GET http://localhost:3000/api/v1/notifications/660f9511-f3ac-52e5-b827-557766551111 \
  -H "X-API-Key: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
```

レスポンス例：

```json
{
  "notificationId": "660f9511-f3ac-52e5-b827-557766551111",
  "title": "New Mission Available!",
  "body": "Check out the new daily mission in the game",
  "createdAt": "2025-10-30T12:00:00.000Z",
  "deliveryLogs": [
    {
      "deviceId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "success",
      "errorCode": null,
      "errorMessage": null,
      "sentAt": "2025-10-30T12:00:05.000Z",
      "deliveredAt": "2025-10-30T12:00:08.000Z"
    }
  ]
}
```

## トラブルシューティング

### 通知が届かない場合

1. **デバイストークンの確認**:
   - iOSの場合: APNs Sandboxトークンを使用していることを確認
   - Androidの場合: FCMトークンが有効であることを確認

2. **APNs/FCM設定の確認**:
   - `.env`ファイルの設定が正しいか確認
   - APNs `.p8`キーファイルのパスが正しいか確認
   - FCMサービスアカウントJSONのパスが正しいか確認

3. **ログの確認**:
```bash
# サーバーログを確認
docker-compose logs -f server

# エラーログをフィルタ
docker-compose logs server | grep ERROR
```

### エラーレスポンス例

**無効なデバイストークン**:

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Device token format is invalid for iOS platform",
    "details": {
      "token": "invalid-token",
      "expectedFormat": "64-character hexadecimal string"
    }
  }
}
```

**認証エラー**:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

**レート制限超過**:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds"
  }
}
```

## テストの実行

```bash
# 全テストを実行
npm test

# 契約テストのみ実行
npm run test:contract

# 統合テストのみ実行
npm run test:integration

# ユニットテストのみ実行
npm run test:unit

# カバレッジレポート生成
npm run test:coverage
```

## OpenAPI仕様の確認

```bash
# OpenAPI仕様をブラウザで確認（Swagger UI）
open http://localhost:3000/api-docs

# OpenAPI仕様をJSON形式で取得
curl http://localhost:3000/api/v1/openapi.json
```

## 次のステップ

1. **Unity/Unreal Engineクライアント統合**:
   - iOS/Android SDKのセットアップ
   - クライアント側でのデバイストークン取得
   - 通知受信ハンドラーの実装

2. **本番環境デプロイ**:
   - APNs Production環境への切り替え
   - FCM Production設定
   - ドメイン設定とHTTPS有効化

3. **スケーリング**:
   - Redis導入（レート制限、セッション管理）
   - 水平スケーリング（複数サーバーインスタンス）
   - 配信キューの導入（大量通知時）

## ヘルプとサポート

- **OpenAPI仕様**: [contracts/openapi.yaml](./contracts/openapi.yaml)
- **データモデル**: [data-model.md](./data-model.md)
- **実装計画**: [plan.md](./plan.md)
- **GitHub Issues**: https://github.com/yourorg/push-notification/issues
