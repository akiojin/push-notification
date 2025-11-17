# データモデル設計: SPEC-2d193ce6

## 概要

クロスプラットフォームPush通知配信システムのデータモデル定義。PostgreSQL + Prisma ORMを使用。

## エンティティ関係図

```
Device (1) ──────┐
                 │
                 │ N
                 ↓
         DeliveryLog (N)
                 ↑
                 │ 1
                 │
Notification (1) ┘
```

## エンティティ定義

### Device (デバイス登録情報)

モバイルデバイスのPush通知トークンを管理するエンティティ。

**フィールド**:

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|-----|------|
| id | UUID | PK | デバイスレコードの一意識別子 |
| token | String | UNIQUE, NOT NULL | APNs/FCMから取得したデバイストークン |
| platform | Enum(iOS, Android) | NOT NULL | デバイスプラットフォーム |
| playerAccountId | String | NULLABLE | プレイヤーアカウント識別子（オプション） |
| createdAt | DateTime | NOT NULL | 登録日時 |
| updatedAt | DateTime | NOT NULL | 最終更新日時 |

**検証ルール**:
- `token`: 必須、プラットフォーム別の形式検証
  - iOS: 64文字の16進数文字列（APNsデバイストークン形式）
  - Android: FCMトークン形式（可変長、英数字とハイフン/アンダースコア）
- `platform`: `iOS` または `Android` のみ許可
- `token` の一意性: 同じトークンが既に存在する場合は upsert（更新）処理

**インデックス**:
- `token` (UNIQUE): トークンによる高速検索
- `playerAccountId`: プレイヤーアカウント別のデバイス一覧取得用

**ビジネスルール**:
- 同じトークンの重複登録は許可しない（upsert処理）
- トークンが無効化された場合（APNs 410 Unregistered、FCM InvalidRegistration）、レコードを削除
- 同一プレイヤーが複数デバイス（スマホ＋タブレット）を登録可能

---

### Notification (通知メッセージ)

送信された通知メッセージの内容を保存するエンティティ。

**フィールド**:

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|-----|------|
| id | UUID | PK | 通知メッセージの一意識別子 |
| title | String | NOT NULL | 通知タイトル（最大100文字） |
| body | String | NOT NULL | 通知本文（最大500文字） |
| imageUrl | String | NULLABLE | 画像URL（リッチ通知用） |
| customData | JSON | NULLABLE | カスタムデータ（ディープリンク等） |
| createdAt | DateTime | NOT NULL | 通知作成日時 |

**検証ルール**:
- `title`: 必須、1文字以上100文字以下
- `body`: 必須、1文字以上500文字以下
- `imageUrl`: オプション、有効なURL形式
- `customData`: オプション、任意のJSONオブジェクト
- ペイロードサイズ合計: 4KB以内（APNs/FCMの制限）

**ビジネスルール**:
- 通知は一度作成されたら変更不可（イミュータブル）
- 配信完了後も履歴として保持（監査目的）

---

### DeliveryLog (配信履歴)

通知の配信状態を追跡するエンティティ。各デバイスへの配信ごとに1レコード作成。

**フィールド**:

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|-----|------|
| id | UUID | PK | 配信ログの一意識別子 |
| notificationId | UUID | FK → Notification, NOT NULL | 関連する通知メッセージID |
| deviceId | UUID | FK → Device, NOT NULL | 関連するデバイスID |
| status | Enum(pending, success, failed) | NOT NULL | 配信状態 |
| errorCode | String | NULLABLE | エラーコード（失敗時） |
| errorMessage | String | NULLABLE | エラーメッセージ（失敗時） |
| sentAt | DateTime | NOT NULL | 送信試行日時 |
| deliveredAt | DateTime | NULLABLE | 配信成功日時 |

**検証ルール**:
- `status`: `pending`, `success`, `failed` のいずれか
- `errorCode`, `errorMessage`: `status` が `failed` の場合のみ設定
- `deliveredAt`: `status` が `success` の場合のみ設定

**インデックス**:
- `notificationId`: 通知別の配信ログ一覧取得用
- `deviceId`: デバイス別の配信履歴取得用
- `status`: 配信状態別の集計用

**状態遷移**:
```
pending ──(配信成功)──> success
   │
   └─(配信失敗)──> failed
```

**ビジネスルール**:
- 通知送信時、すべての対象デバイスに対して `pending` 状態のレコードを作成
- APNs/FCMからのレスポンス受信後、状態を `success` または `failed` に更新
- リトライ処理: `failed` 状態のレコードを対象に、最大3回まで再送信
- 配信成功率の計算: `success` / (`success` + `failed`)

**エラーコード例**:
- `INVALID_TOKEN`: 無効なデバイストークン
- `UNREGISTERED`: デバイスが登録解除済み（APNs 410）
- `NETWORK_ERROR`: ネットワークエラー
- `RATE_LIMIT_EXCEEDED`: レート制限超過
- `PAYLOAD_TOO_LARGE`: ペイロードサイズ超過

---

## Prisma スキーマ例

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Platform {
  iOS
  Android
}

enum DeliveryStatus {
  pending
  success
  failed
}

model Device {
  id               String   @id @default(uuid())
  token            String   @unique
  platform         Platform
  playerAccountId  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  deliveryLogs     DeliveryLog[]

  @@index([playerAccountId])
}

model Notification {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(100)
  body        String   @db.VarChar(500)
  imageUrl    String?
  customData  Json?
  createdAt   DateTime @default(now())

  // Relations
  deliveryLogs DeliveryLog[]
}

model DeliveryLog {
  id             String         @id @default(uuid())
  notificationId String
  deviceId       String
  status         DeliveryStatus @default(pending)
  errorCode      String?
  errorMessage   String?
  sentAt         DateTime       @default(now())
  deliveredAt    DateTime?

  // Relations
  notification   Notification   @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  device         Device         @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([notificationId])
  @@index([deviceId])
  @@index([status])
}
```

## データベーススキーマ設計方針

1. **UUID主キー**: すべてのエンティティでUUIDを使用（セキュリティ、分散システム対応）
2. **Cascade削除**: デバイス削除時、関連するDeliveryLogも削除
3. **インデックス**: 頻繁にクエリされるフィールド（token, playerAccountId, notificationId等）にインデックス設定
4. **タイムスタンプ**: すべてのエンティティに作成日時を記録、更新可能なエンティティには更新日時も記録
5. **正規化**: 適度な正規化（第3正規形）、パフォーマンスとメンテナンス性のバランス

## クエリパターン

### よく使われるクエリ

1. **デバイストークン登録/更新**:
```typescript
// Upsert: 存在する場合は更新、しない場合は作成
await prisma.device.upsert({
  where: { token: deviceToken },
  update: { playerAccountId, updatedAt: new Date() },
  create: { token: deviceToken, platform, playerAccountId }
});
```

1. **プレイヤーのすべてのデバイス取得**:
```typescript
const devices = await prisma.device.findMany({
  where: { playerAccountId: playerId }
});
```

1. **通知送信とDeliveryLog作成**:
```typescript
const notification = await prisma.notification.create({
  data: { title, body, imageUrl, customData }
});

const deliveryLogs = await prisma.deliveryLog.createMany({
  data: deviceIds.map(deviceId => ({
    notificationId: notification.id,
    deviceId,
    status: 'pending'
  }))
});
```

1. **配信状況取得**:
```typescript
const logs = await prisma.deliveryLog.findMany({
  where: { notificationId },
  include: { device: true }
});
```

1. **失敗した配信のリトライ対象取得**:
```typescript
const failedLogs = await prisma.deliveryLog.findMany({
  where: {
    status: 'failed',
    errorCode: { in: ['NETWORK_ERROR', 'RATE_LIMIT_EXCEEDED'] }
  },
  include: { notification: true, device: true }
});
```

## パフォーマンス考慮事項

1. **バッチ挿入**: 大量のDeliveryLogを作成する際は `createMany` を使用
2. **接続プーリング**: Prismaのコネクションプール設定（デフォルト10接続）
3. **インデックス最適化**: 頻繁なクエリパターンに応じたインデックス設計
4. **N+1クエリ回避**: `include` を使った関連データの一括取得
5. **データ保持ポリシー**: 古い配信ログのアーカイブ/削除（例：90日後）

## セキュリティ考慮事項

1. **トークン保護**: デバイストークンは平文で保存（APNs/FCMへの送信に必要）、ただしデータベース暗号化推奨
2. **APIキー管理**: APIキーはハッシュ化して保存
3. **SQL Injection対策**: Prismaのパラメータ化クエリで自動対策
4. **監査ログ**: 重要な操作（トークン削除等）の監査ログ記録
