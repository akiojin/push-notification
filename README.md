# Push Notification Platform

クロスプラットフォームで Push 通知を配信・受信するためのモノレポです。バックエンド API、iOS/Android ネイティブ SDK、Unity/Unreal プラグインを同一リポジトリで管理し、仕様 (`specs/`) と実装を同期します。

## リポジトリ構成

| ディレクトリ | 説明 |
| --- | --- |
| `specs/` | 各プラットフォーム/バックエンドの仕様、計画、契約ドキュメント |
| `server/` | Fastify + Prisma ベースの REST API (`SPEC-2d193ce6`) |
| `ios-sdk/` | iOS 13+ 対応 Swift Package (`SPEC-58d1c0d1`) |
| `android-sdk/` | Android 7.0+ 対応 Firebase Messaging ベース SDK (`SPEC-628d6000`) |
| `unity-sdk/` | Unity 2022.3+ 向け UPM パッケージ (`SPEC-9c11b38c`) |
| `unreal-plugin/` | Unreal Engine 5.3+ 向け Runtime プラグイン (`SPEC-bfa1680e`) |
| `templates/`, `memory/`, `scripts/` | 開発ツールやテンプレート |

## バックエンド API (`server/`)

### 前提
- Node.js 22+
- PostgreSQL 16 (Prisma 用)

### セットアップ
```bash
cd server
cp .env.example .env            # 環境変数テンプレートをコピー
npm install
npm run env:check               # 必須環境変数のチェック
npm run prisma:generate
```

`.env` には API キーや配信リトライワーカーの設定を記載します（詳細は `server/.env.example` 参照）。CI では `.env.example` をベースに Secrets で上書きしてください。

### CI Secrets

GitHub Actions の `Server CI` ワークフローでは以下の Secrets を参照して `.env` を生成します。環境に合わせて設定してください。

| Secret 名 | 説明 |
| --- | --- |
| `DATABASE_URL` | テスト用 PostgreSQL 接続文字列 (例: `postgresql://postgres:postgres@localhost:5432/push`) |
| `API_KEY` | API 認証キー |
| `RATE_LIMIT_MAX` | 任意。設定しない場合は `.env.example` の値を使用 |
| `RATE_LIMIT_TIME_WINDOW` | 任意。設定しない場合は `.env.example` の値を使用 |
| `DELIVERY_RETRY_INTERVAL_MS` | 任意。設定しない場合は `.env.example` の値を使用 |
| `DELIVERY_RETRY_BATCH_SIZE` | 任意。設定しない場合は `.env.example` の値を使用 |
| `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_BUNDLE_ID` / `APNS_PRIVATE_KEY` | APNs 資格情報 (テスト環境で不要なら空のままで可) |
| `FCM_CREDENTIALS` | FCM サービスアカウント JSON のパス、またはCIでの処理用にBase64化した文字列 |

> Secrets を設定しない場合、`.env.example` に記載されたデフォルト値が使用されます。認証が必要な項目 (`API_KEY` など) は必ず Secrets として登録してください。

### 実行・テスト
```bash
npm run dev         # ローカル開発 (tsx)
npm run build       # TypeScript -> dist
npm test            # Vitest (unit/integration)
npm run lint        # ESLint
```

ローカルで PostgreSQL を準備するには `server/docker-compose.yml` を利用してください。

```bash
cd server
docker compose up -d db
```
DB 初期化後は `npx prisma migrate deploy` でマイグレーションを適用できます。

> Prisma マイグレーション / Testcontainers は未導入。PostgreSQL を用いた統合テストは別途構築が必要です。

## iOS SDK (`ios-sdk/`)

- Swift Package Manager 対応 (`Package.swift`)
- `PushNotificationSDK.shared` で初期化、`DeviceTokenRegistrar` が REST API に登録
- Objective-C (`PNPushNotificationSDK`) ブリッジで Unity/Unreal からも利用可能

### ビルド & テスト
```bash
cd ios-sdk
swift test   # ※ローカルに Swift toolchain が必要
```

## Android SDK (`android-sdk/`)

- AGP 8.5 / Kotlin 1.9.24
- Firebase Cloud Messaging 24.x をラップし、REST API 登録 (`DeviceTokenRegistrar`)

### ビルド & テスト
```bash
cd android-sdk
./gradlew assembleDebug   # Android SDK/NDK が必要
./gradlew test            # ユニットテスト (MockK)
```

## Unity パッケージ (`unity-sdk/UnityPushNotification/Packages/com.akiojin.unity-push-notification/`)

- Unity Package Manager 用 embedded package
- `PushNotificationManager` が iOS/Android ブリッジ呼び出し & REST 登録
- NUnit ベースの簡易テスト / `Minimal Setup` サンプル同梱

### 追加方法
`Packages/manifest.json` に下記を追記してパッケージマネージャーから導入できます:

```json
"com.akiojin.unity-push-notification": "git+https://github.com/akiojin/push-notification.git?path=unity-sdk/UnityPushNotification/Packages/com.akiojin.unity-push-notification"
```

Unity Test Runner (Edit Mode) でテスト可。Samples タブから **Minimal Setup** をインポートして初期化例を確認してください。

## Unreal プラグイン (`unreal-plugin/`)

- `UPushNotificationSubsystem` を GameInstanceSubsystem として提供
- Blueprint から初期化/トークン登録/通知ハンドリングが可能
- iOS: `pn_*` ブリッジ経由で Swift SDK を呼び出し / Android: JNI で Kotlin SDK を呼び出し

### 組み込み手順
1. プロジェクトの `Plugins/PushNotificationPlugin` として配置
2. iOS: `ThirdParty/iOS/PushNotificationSDK.framework` を配置し、`.Build.cs` のパスを調整
3. Android: `android-sdk` を AAR 化して UPL (`Resources/PushNotificationPlugin_Android_UPL.xml`) から参照
4. Unreal エディタでプラグインを有効化し、Blueprint から利用

## 開発ロードマップ
- [ ] Prisma マイグレーション & DB コンテナ(Testcontainers)導入
- [ ] REST API との契約テスト (OpenAPI + Prism など)
- [ ] iOS/Android SDK からの通知コールバック → Unity/Unreal への伝播
- [ ] CI/CD パイプライン整備 (Node, Swift, Gradle, Unity, Unreal)
- [ ] サンプルアプリ/ゲームの追加 (エンドツーエンド検証)

## リント / フォーマット
- ルートで `pnpm install` を実行すると Husky フックがセットアップされます（`prepare` スクリプト）。
- Markdown: `pnpm run lint:md`
- Server(TypeScript): `pnpm run lint:server`
- iOS(Swift): `pnpm run lint:ios`（SwiftLint 必須）
- Android(Kotlin): `pnpm run lint:android`（Android SDK が必要）
- Unity/Unreal(C#): `pnpm run lint:unity`（.NET SDK 8+ が必要）
- まとめて実行: `pnpm run check:all`

## CI

GitHub Actions 上で以下のワークフローが自動実行されます:

| Workflow | 対象 | 内容 |
| --- | --- | --- |
| `.github/workflows/server.yml` | server | Node 22 で lint / Prisma migrate / Vitest |
| `.github/workflows/android.yml` | android-sdk | Gradle Wrapper で `:android-sdk:test` |
| `.github/workflows/ios.yml` | ios-sdk | macOS runner 上で `swift test` |
| `.github/workflows/unity.yml` | unity-sdk | Unity 2022.3 Edit Mode tests |

詳細な CI 設定と Secrets については [`docs/CI.md`](docs/CI.md) を参照してください。

## ライセンス
Apache License 2.0
