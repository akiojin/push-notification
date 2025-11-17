# Android Push Notification SDK

Android 7.0+ 向けの Push 通知 SDK。Firebase Cloud Messaging をラップし、バックエンド API (`SPEC-2d193ce6`) にデバイストークンを登録します。

## プロジェクト構成

- `build.gradle.kts`: Android ライブラリモジュール設定
- `src/main/java/com/push/notificationsdk`: SDK コード (初期化、トークン登録、通知表示)
- `src/test/java`: JUnit + MockK によるユニットテスト

## 依存条件

- Android Studio Iguana 以上 / AGP 8.5+ / Kotlin 1.9.24
- Firebase Messaging 24.x
- minSdk 24 (Android 7.0)
- Java 17 toolchain

## 使い方

1. `settings.gradle` にモジュールを include して、`implementation(project(":android-sdk"))` を追加
2. アプリの `Application` クラスで初期化

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        PushNotificationSdk.initialize(
            PushNotificationSdk.Configuration(
                application = this,
                apiKey = BuildConfig.PUSH_API_KEY,
                backendUrl = BuildConfig.PUSH_BACKEND_URL
            )
        )
    }
}
```

1. Firebase を設定し、`google-services.json` を配置
2. SDK が自動的に FCM トークンを取得し、バックエンドに登録します

## テスト

```bash
./gradlew :android-sdk:test
```

同梱の Gradle Wrapper (`./gradlew`) を利用するため、追加の Gradle インストールは不要です。テストではトークン登録の前提条件チェックとネットワーク呼び出しのモックを検証します。CI では Android SDK/NDK のセットアップが必要です。
