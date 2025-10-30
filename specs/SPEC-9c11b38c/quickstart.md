# Quickstart: Unity Push通知Plugin

**機能ID**: SPEC-9c11b38c
**日付**: 2025-10-30

## 概要

このガイドでは、Unity Push通知PluginをUnityプロジェクトに統合し、最初のPush通知を受信するまでの手順を説明します。

**所要時間**: 30分以内

## 前提条件

- Unity 2021.3 LTS以降
- iOS 14+またはAndroid 7.0+対応デバイス
- iOS Native SDK（SPEC-58d1c0d1）が`.framework`形式で提供済み
- Android Native SDK（SPEC-628d6000）が`.aar`形式で提供済み
- REST APIサーバーがデプロイ済み（SPEC-2d193ce6）

## ステップ1: Unity Package Managerインストール

### 1.1 Git URL経由でインストール

**方法A: Package Manager UI経由**:

1. Unity Editorを開く
2. `Window > Package Manager`を選択
3. 左上の`+`ボタンをクリック
4. `Add package from git URL...`を選択
5. URLを入力:
   ```
   https://github.com/example/unity-push-notification.git
   ```
6. `Add`ボタンをクリック

**方法B: manifest.json直接編集**:

1. `Packages/manifest.json`を開く
2. `dependencies`セクションに追加:
   ```json
   {
     "dependencies": {
       "com.example.push-notification": "https://github.com/example/unity-push-notification.git#1.0.0",
       ...
     }
   }
   ```
3. Unity Editorに戻ると自動的にインストールされる

### 1.2 インストール確認

Package Managerで`Push Notification Plugin`が表示されることを確認。

## ステップ2: Native SDKプラグイン配置確認

Plugin内に以下のファイルが含まれているか確認:

```
Packages/com.example.push-notification/Plugins/
├── iOS/
│   └── PushNotificationSDK.framework/
└── Android/
    └── push-notification-sdk.aar
```

これらは自動的にビルドに含まれます。

## ステップ3: 初期化コード記述（3行）

### 3.1 GameManagerスクリプト作成

**Assets/Scripts/GameManager.cs**:

```csharp
using UnityEngine;
using PushNotification;

public class GameManager : MonoBehaviour
{
    void Start()
    {
        // ステップ1: SDK設定作成
        var config = new PushNotificationConfig
        {
            apiKey = "your-api-key-here",
            apiEndpoint = "https://api.example.com",
            enableLogging = true  // デバッグ時はtrue
        };

        // ステップ2: SDK初期化（3行目）
        PushNotificationManager.Initialize(config);

        // ステップ3: 通知ハンドラー登録（オプション）
        PushNotificationManager.SetNotificationHandler(
            onReceived: OnNotificationReceived,
            onOpened: OnNotificationOpened
        );

        Debug.Log("Push Notification SDK initialized");
    }

    private void OnNotificationReceived(NotificationData data)
    {
        Debug.Log($"Notification received: {data.title}");
    }

    private void OnNotificationOpened(NotificationData data)
    {
        Debug.Log($"Notification opened: {data.title}");

        // カスタムデータから画面IDを取得して遷移
        if (data.customData != null && data.customData.TryGetValue("screenId", out string screenId))
        {
            NavigateToScreen(screenId);
        }
    }

    private void NavigateToScreen(string screenId)
    {
        switch (screenId)
        {
            case "event":
                // イベント画面に遷移
                Debug.Log("Navigate to Event screen");
                break;
            case "friend":
                // フレンド画面に遷移
                Debug.Log("Navigate to Friend screen");
                break;
            default:
                Debug.LogWarning($"Unknown screen ID: {screenId}");
                break;
        }
    }
}
```

### 3.2 シーンに配置

1. ヒエラルキーで`Create Empty`を選択
2. 名前を`GameManager`に変更
3. `GameManager`スクリプトをアタッチ

## ステップ4: Unity Editorで疑似通知テスト

### 4.1 疑似通知送信UIを開く

1. Unity Editorでプレイモードを開始
2. メニューバーから`Window > Push Notification > Simulator`を選択

### 4.2 疑似通知送信

**疑似通知ウィンドウ**:
- **Title**: テスト通知
- **Body**: これはテスト通知です
- **Image URL**: （空欄でOK）
- **Custom Data**: `{"screenId":"event"}`

`Send Notification`ボタンをクリック。

### 4.3 コンソール確認

```
Push Notification SDK initialized
[Editor] Mock SDK initialized: your-api-key-here, https://api.example.com
[Editor] Mock token registered: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Notification received: テスト通知
```

## ステップ5: iOSビルド設定

### 5.1 Build Settings設定

1. `File > Build Settings`
2. `iOS`を選択
3. `Switch Platform`をクリック

### 5.2 Player Settings設定

**iOSタブ**:
- **Bundle Identifier**: `com.yourcompany.yourgame`
- **Minimum iOS Version**: `14.0`

**Other Settings**:
- **Target SDK**: `Device SDK`
- **Architecture**: `ARM64`

### 5.3 Push Notification Capability追加

**XcodeプロジェクトをビルドAfter**:
1. Xcodeで`.xcodeproj`を開く
2. `Signing & Capabilities`タブ
3. `+ Capability`をクリック
4. `Push Notifications`を追加

### 5.4 ビルド実行

1. `Build`ボタンをクリック
2. フォルダを選択してビルド開始
3. 完了後、Xcodeで開く
4. 実機を接続してRun

### 5.5 デバイストークン確認

**Xcodeコンソール出力例**:
```
[PushSDK] Device token registered: dG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6
```

## ステップ6: Androidビルド設定

### 6.1 Build Settings設定

1. `File > Build Settings`
2. `Android`を選択
3. `Switch Platform`をクリック

### 6.2 Player Settings設定

**Androidタブ**:
- **Package Name**: `com.yourcompany.yourgame`
- **Minimum API Level**: `24 (Android 7.0)`
- **Target API Level**: `33 (Android 13.0)`

**Publishing Settings**:
- `Custom Main Gradle Template`を有効化
- `Custom Gradle Properties Template`を有効化

### 6.3 Firebase設定

**google-services.jsonを配置**:
1. Firebaseコンソールからダウンロード
2. `Assets/Plugins/Android/google-services.json`に配置

**mainTemplate.gradle編集**:
```gradle
dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.3.1'
    implementation fileTree(dir: 'libs', include: ['*.jar'])
}

apply plugin: 'com.google.gms.google-services'
```

### 6.4 ビルド実行

1. `Build`ボタンをクリック
2. APKファイル名を指定して保存
3. 完了後、デバイスにインストール

### 6.5 デバイストークン確認

**Logcat出力例**:
```
PushNotificationSDK: Device token registered: fG4H8kJ2mL9nP3qR5sT7vW0xY2zA4bC6dE8fG0hI2jK4lM6
```

## ステップ7: サーバーからテスト通知送信

### 7.1 デバイストークンをコピー

iOS XcodeコンソールまたはAndroid Logcatからデバイストークンをコピー。

### 7.2 REST APIから通知送信

**curlコマンド例**:
```bash
curl -X POST https://api.example.com/api/notifications \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テスト通知",
    "body": "これはサーバーからの通知です",
    "tokens": ["デバイストークンをここに貼り付け"]
  }'
```

### 7.3 通知確認

- **iOS**: ロック画面に通知表示
- **Android**: ステータスバーに通知表示
- タップするとアプリが起動し、`OnNotificationOpened`コールバックが呼ばれる

## ステップ8: カスタム通知処理

### 8.1 プレイヤーアカウントID紐付け

**ユーザーログイン後**:
```csharp
public void OnUserLoggedIn(string playerId)
{
    PushNotificationManager.UpdatePlayerAccountId(playerId);
    Debug.Log($"Player ID updated: {playerId}");
}
```

### 8.2 リッチ通知送信

**REST API経由**:
```json
{
  "title": "イベント開始！",
  "body": "限定イベントが始まりました",
  "imageUrl": "https://example.com/images/event-banner.jpg",
  "customData": {
    "screenId": "event",
    "eventId": "123"
  },
  "actions": [
    {
      "id": "action_play",
      "label": "今すぐプレイ",
      "deepLink": "mygame://event/123"
    },
    {
      "id": "action_later",
      "label": "後で通知"
    }
  ],
  "tokens": ["デバイストークン"]
}
```

### 8.3 ディープリンク処理

```csharp
private void OnNotificationOpened(NotificationData data)
{
    // アクションボタンタップ時
    if (data.actions != null && data.actions.Length > 0)
    {
        foreach (var action in data.actions)
        {
            if (!string.IsNullOrEmpty(action.deepLink))
            {
                HandleDeepLink(action.deepLink);
            }
        }
    }

    // カスタムデータ処理
    if (data.customData != null)
    {
        if (data.customData.TryGetValue("eventId", out string eventId))
        {
            LoadEventScene(eventId);
        }
    }
}

private void HandleDeepLink(string deepLink)
{
    // ディープリンク解析: mygame://event/123
    var uri = new System.Uri(deepLink);
    var scheme = uri.Scheme;  // "mygame"
    var host = uri.Host;      // "event"
    var segments = uri.Segments;  // ["/", "123"]

    Debug.Log($"Deep link: {scheme}://{host}{string.Join("", segments)}");

    // 画面遷移処理
}
```

## ステップ9: ログアウト時の処理

```csharp
public void OnUserLoggedOut()
{
    PushNotificationManager.UnregisterToken();
    Debug.Log("Device token unregistered");
}
```

## トラブルシューティング

### 問題1: トークンが取得できない

**症状**: `CurrentDeviceToken`がnull

**iOS解決策**:
1. Xcodeで`Push Notifications` Capabilityが追加されているか確認
2. 実機で実行（Simulatorは非対応）
3. アプリ初回起動時に通知許可を許可

**Android解決策**:
1. `google-services.json`が正しく配置されているか確認
2. Firebase ConsoleでAndroidアプリが登録されているか確認
3. インターネット接続を確認

### 問題2: 通知が表示されない

**症状**: 通知受信はするが表示されない

**iOS解決策**:
1. 通知許可が許可されているか設定アプリで確認
2. フォアグラウンドでは通知表示されない（バックグラウンドでテスト）

**Android解決策**:
1. Android 13以降は通知許可が必要（初回起動時に許可ダイアログ表示）
2. 通知チャンネルが正しく作成されているか確認
3. アプリが通知をブロックしていないか設定確認

### 問題3: コールバックが呼ばれない

**症状**: `OnNotificationReceived`が実行されない

**解決策**:
1. `SetNotificationHandler`が`Initialize`の後に呼ばれているか確認
2. コールバック関数が正しく設定されているか確認
3. Unity Editorのコンソールでエラーログを確認

### 問題4: Unity Editorで疑似通知が動かない

**症状**: Simulatorウィンドウが表示されない

**解決策**:
1. `Window > Push Notification > Simulator`メニューが存在するか確認
2. Pluginが正しくインストールされているか確認
3. Unity Editorを再起動

## サンプルシーン

### サンプルシーンをインポート

1. Package Managerで`Push Notification Plugin`を選択
2. `Samples`タブをクリック
3. `Basic Integration`の`Import`ボタンをクリック
4. `Assets/Samples/Push Notification Plugin/1.0.0/BasicIntegration/`に配置される

### サンプルシーン実行

1. `BasicIntegration/Scenes/SampleScene.unity`を開く
2. プレイモードで実行
3. UIボタンで疑似通知送信テスト

## 次のステップ

1. **プロダクション環境デプロイ**: Firebase Production環境設定
2. **通知スケジューリング**: サーバー側でスケジュール通知実装
3. **通知分析**: Firebase Analyticsで通知開封率を計測
4. **A/Bテスト**: 通知メッセージのA/Bテスト実施

## サポート

- **ドキュメント**: [API仕様](./contracts/public-api.cs)
- **サンプルコード**: `Assets/Samples/`
- **Issues**: GitHub Issues

## API Reference

### PushNotificationManager

- `Initialize(PushNotificationConfig config)` - SDK初期化
- `SetNotificationHandler(onReceived, onOpened)` - 通知ハンドラー設定
- `UpdatePlayerAccountId(string playerId)` - プレイヤーID紐付け
- `UnregisterToken()` - トークン登録解除
- `IsInitialized` - 初期化済みフラグ
- `CurrentDeviceToken` - デバイストークン
- `CurrentPlatform` - プラットフォーム種別

### PushNotificationConfig

- `apiKey` - REST API認証キー（必須）
- `apiEndpoint` - REST APIエンドポイント（必須）
- `enableLogging` - ログ出力有効化（デフォルトfalse）
- `timeoutSeconds` - タイムアウト時間（デフォルト30秒）
- `autoRegisterToken` - 自動トークン登録（デフォルトtrue）
- `enableEditorSimulation` - Editor疑似通知有効化（デフォルトtrue）

### NotificationData

- `id` - 通知ID
- `title` - タイトル
- `body` - 本文
- `imageUrl` - 画像URL（オプション）
- `customData` - カスタムデータ（Key-Valueペア）
- `actions` - アクションボタン配列（最大3個）
- `timestamp` - 受信日時（UNIX時間）
- `badge` - バッジ番号（iOS専用）
- `sound` - サウンド設定
- `channelId` - 通知チャンネルID（Android専用）

## まとめ

Unity Push通知Pluginの統合は3つのステップで完了します：

1. ✅ UPMインストール（Git URL）
2. ✅ 初期化コード記述（3行）
3. ✅ 通知ハンドラー設定

Unity Editorでの疑似通知テストにより、実機ビルドなしで開発サイクルを短縮できます。
