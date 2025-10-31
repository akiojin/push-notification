# PushNotificationPlugin (Unreal Engine)

Unreal Engine 5.3+ 向けの Push 通知統合プラグイン。iOS/Android ネイティブ SDK と REST バックエンド (`SPEC-2d193ce6`) を橋渡しします。

## 機能

- GameInstanceSubsystem `UPushNotificationSubsystem` を提供
- Blueprint から API キー・バックエンド URL を設定し、トークン登録を呼び出し可能
- iOS/Android ネイティブ SDK へのブリッジ呼び出しを条件付きコンパイルで実装
- REST API `/api/v1/tokens` への HTTP POST でトークン登録
- デリゲートでトークン取得・通知オープン・エラーを通知

## ファイル構成

```
unreal-plugin/
├── PushNotificationPlugin.uplugin
├── Source/PushNotificationPlugin/
│   ├── PushNotificationPlugin.Build.cs
│   ├── Public/PushNotificationSubsystem.h
│   └── Private/
│       ├── PushNotificationPlugin.cpp
│       └── PushNotificationSubsystem.cpp
└── Resources/PushNotificationPlugin_Android_UPL.xml
```

## 組み込み手順

1. プラグインを `Plugins/PushNotificationPlugin` としてプロジェクトに追加
2. iOS: `ThirdParty/iOS/PushNotificationSDK.framework` を配置し、`.uplugin` の `PublicAdditionalFrameworks` パスを更新
3. Android: `android-sdk` モジュールを AAR としてビルドし、UPL で参照できるよう `build.gradle` にプロジェクトを追加
4. プロジェクト設定でプラグインを有効化し、Blueprint から `PushNotificationSubsystem` を利用

## Blueprint 利用例

- `Event BeginPlay` で `Get Game Instance Subsystem (PushNotificationSubsystem)`
- `Initialize Push SDK` ノードに API キー/バックエンド URL/PlayerAccountId を渡す
- `Request Authorization` ノードを呼び出す
- `On Token Registered` / `On Notification Opened` イベントで通知結果をハンドル

## TODO

- iOS/Android ネイティブ SDK ビルド設定の自動化
- Unreal Automation Test による HTTP リクエストのモック
- Android UPL 設定の詳細化 (google-services.json 配置など)
