/**
 * Unreal Engine Push Notification Plugin - Public API Specification
 *
 * 機能ID: SPEC-bfa1680e
 * 日付: 2025-10-30
 *
 * このファイルは公開API仕様を定義します（実装コードではありません）
 */

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "PushNotificationTypes.h"
#include "PushNotificationSubsystem.generated.h"

/**
 * Push Notification Plugin メインサブシステム
 *
 * GameInstanceSubsystemとして提供され、SDK初期化・設定を管理します。
 *
 * 使用例（C++）:
 * @code
 * UPushNotificationSubsystem* PushNotification = GetGameInstance()->GetSubsystem<UPushNotificationSubsystem>();
 *
 * FPushNotificationConfig Config;
 * Config.ApiKey = TEXT("your-api-key");
 * Config.ApiEndpoint = TEXT("https://api.example.com");
 *
 * PushNotification->Initialize(Config);
 * @endcode
 *
 * 使用例（Blueprint）:
 * @code
 * Get Game Instance -> Get Push Notification Subsystem -> Initialize Push Notification
 * @endcode
 */
UCLASS()
class PUSHNOTIFICATIONPLUGIN_API UPushNotificationSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    // USubsystem interface
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    /**
     * SDKを初期化します。
     *
     * ゲーム起動時に1回だけ呼び出してください。
     * この関数は非同期で実行され、デバイストークン取得とREST API登録を行います。
     *
     * @param Config SDK設定オブジェクト
     * @return 初期化成功の場合true
     *
     * 使用例（C++）:
     * @code
     * FPushNotificationConfig Config;
     * Config.ApiKey = TEXT("your-api-key");
     * Config.ApiEndpoint = TEXT("https://api.example.com");
     * Config.bEnableLogging = true;
     *
     * bool bSuccess = PushNotification->Initialize(Config);
     * @endcode
     */
    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    bool Initialize(const FPushNotificationConfig& Config);

    /**
     * 通知ハンドラーを設定します（C++専用）。
     *
     * 通知受信・タップ時のカスタム処理を実装できます。
     * 設定しない場合、デフォルトの通知表示のみ行われます。
     *
     * @param OnReceived 通知受信時のデリゲート（フォアグラウンド/バックグラウンド両方）
     * @param OnOpened 通知タップ時のデリゲート
     *
     * 使用例（C++）:
     * @code
     * PushNotification->OnNotificationReceived.AddUObject(this, &AMyGameMode::OnNotificationReceived);
     * PushNotification->OnNotificationOpened.AddUObject(this, &AMyGameMode::OnNotificationOpened);
     * @endcode
     */
    FOnNotificationReceived OnNotificationReceived;
    FOnNotificationOpened OnNotificationOpened;

    /**
     * Blueprint通知ハンドラー（Blueprint専用）。
     *
     * Blueprintグラフで "Assign" してイベントをバインドします。
     *
     * 使用例（Blueprint）:
     * @code
     * On Notification Received (Event) -> Print String (Notification Title)
     * @endcode
     */
    UPROPERTY(BlueprintAssignable, Category = "Push Notification")
    FOnNotificationReceivedDynamic OnNotificationReceivedBP;

    UPROPERTY(BlueprintAssignable, Category = "Push Notification")
    FOnNotificationOpenedDynamic OnNotificationOpenedBP;

    /**
     * プレイヤーアカウントIDを更新します。
     *
     * ユーザーログイン後にプレイヤーアカウントIDをデバイストークンに紐付けます。
     * REST APIにPUTリクエストを送信し、サーバー側でトークン更新を行います。
     *
     * @param PlayerId プレイヤーアカウントID
     *
     * 使用例（C++）:
     * @code
     * // ユーザーログイン成功後
     * PushNotification->UpdatePlayerAccountId(TEXT("player-12345"));
     * @endcode
     */
    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    void UpdatePlayerAccountId(const FString& PlayerId);

    /**
     * デバイストークンを登録解除します。
     *
     * ユーザーログアウト時やPush通知オプトアウト時に呼び出します。
     * REST APIにDELETEリクエストを送信し、サーバー側でトークンを無効化します。
     *
     * 使用例（C++）:
     * @code
     * // ユーザーログアウト時
     * PushNotification->UnregisterToken();
     * @endcode
     */
    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    void UnregisterToken();

    /**
     * SDK初期化済みフラグを返します。
     */
    UFUNCTION(BlueprintPure, Category = "Push Notification")
    bool IsInitialized() const { return bIsInitialized; }

    /**
     * 現在のデバイストークンを取得します。
     *
     * @return デバイストークン（未取得の場合空文字列）
     */
    UFUNCTION(BlueprintPure, Category = "Push Notification")
    FString GetCurrentDeviceToken() const;

    /**
     * 現在のプラットフォームを取得します。
     *
     * @return プラットフォーム種別
     */
    UFUNCTION(BlueprintPure, Category = "Push Notification")
    EPlatformType GetCurrentPlatform() const;

    /**
     * エラーハンドラーを設定します（オプション、C++専用）。
     *
     * SDK内部エラー発生時に通知を受け取ります。
     *
     * 使用例（C++）:
     * @code
     * PushNotification->OnError.AddLambda([](const FPushNotificationError& Error)
     * {
     *     UE_LOG(LogTemp, Error, TEXT("[Push SDK] %s: %s"),
     *         *UEnum::GetValueAsString(Error.Code), *Error.Message);
     * });
     * @endcode
     */
    FOnPushNotificationError OnError;

    /**
     * Blueprint エラーハンドラー（Blueprint専用）。
     */
    UPROPERTY(BlueprintAssignable, Category = "Push Notification")
    FOnPushNotificationErrorDynamic OnErrorBP;

private:
    bool bIsInitialized = false;
    FPushNotificationConfig CurrentConfig;
    TSharedPtr<IPlatformBridge> PlatformBridge;
    FTokenState TokenState;
};

/**
 * Blueprint関数ライブラリ
 *
 * Blueprintから便利に呼び出せるヘルパー関数を提供します。
 */
UCLASS()
class PUSHNOTIFICATIONPLUGIN_API UPushNotificationBlueprintLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    /**
     * Push Notification Subsystemを取得します（Blueprintヘルパー）。
     *
     * @param WorldContextObject ワールドコンテキスト
     * @return Push Notification Subsystem
     */
    UFUNCTION(BlueprintPure, Category = "Push Notification", meta = (WorldContext = "WorldContextObject"))
    static UPushNotificationSubsystem* GetPushNotificationSubsystem(UObject* WorldContextObject);

    /**
     * 通知データからカスタムデータ値を取得します。
     *
     * @param NotificationData 通知データ
     * @param Key カスタムデータキー
     * @param OutValue カスタムデータ値（出力）
     * @return キーが存在する場合true
     */
    UFUNCTION(BlueprintPure, Category = "Push Notification")
    static bool GetCustomDataValue(const FPushNotificationData& NotificationData,
                                    const FString& Key,
                                    FString& OutValue);

    /**
     * ディープリンクURLを解析します。
     *
     * @param DeepLink ディープリンクURL（例: "mygame://event/123"）
     * @param OutScheme スキーム（例: "mygame"）
     * @param OutHost ホスト（例: "event"）
     * @param OutPath パス（例: "/123"）
     * @return 解析成功の場合true
     */
    UFUNCTION(BlueprintCallable, Category = "Push Notification")
    static bool ParseDeepLink(const FString& DeepLink,
                              FString& OutScheme,
                              FString& OutHost,
                              FString& OutPath);
};

/**
 * プラットフォームブリッジ抽象インターフェース
 *
 * iOS/Android/Editorの各実装がこのインターフェースを実装します。
 * 内部使用のみ、公開APIではありません。
 */
class IPlatformBridge
{
public:
    virtual ~IPlatformBridge() = default;

    /**
     * Native SDKを初期化します。
     *
     * @param ApiKey APIキー
     * @param Endpoint APIエンドポイント
     */
    virtual void Initialize(const FString& ApiKey, const FString& Endpoint) = 0;

    /**
     * デバイストークンを取得します。
     *
     * @return デバイストークン（未取得の場合空文字列）
     */
    virtual FString GetDeviceToken() const = 0;

    /**
     * デバイストークンをREST APIに登録します。
     *
     * @param Token デバイストークン
     */
    virtual void RegisterToken(const FString& Token) = 0;

    /**
     * 通知コールバックを設定します。
     *
     * @param Callback JSON文字列を受け取るコールバック
     */
    virtual void SetNotificationCallback(TFunction<void(FString)> Callback) = 0;

    /**
     * プレイヤーアカウントIDを更新します。
     *
     * @param PlayerId プレイヤーアカウントID
     */
    virtual void UpdatePlayerAccountId(const FString& PlayerId) = 0;

    /**
     * デバイストークンを登録解除します。
     */
    virtual void UnregisterToken() = 0;

    /**
     * プラットフォーム種別を取得します。
     *
     * @return プラットフォーム種別
     */
    virtual EPlatformType GetPlatformType() const = 0;
};

/**
 * Unreal Editor専用 - 疑似通知送信ユーティリティ
 *
 * Unreal Editorでのみ使用可能。実機ビルドでは無視されます。
 */
#if WITH_EDITOR

class PUSHNOTIFICATIONPLUGINEDITOR_API FEditorNotificationSimulator
{
public:
    /**
     * 疑似通知を送信します。
     *
     * Unreal Editorでのテスト用に、疑似的に通知を発火させます。
     *
     * @param Data 通知データ
     */
    static void SendNotification(const FPushNotificationData& Data);

    /**
     * 疑似デバイストークンを生成します。
     *
     * @return 疑似トークン（GUID）
     */
    static FString GenerateMockToken();
};

#endif // WITH_EDITOR

/**
 * プラットフォームブリッジファクトリー
 *
 * 実行中のプラットフォームに応じて適切なIPlatformBridge実装を返します。
 * 内部使用のみ。
 */
class FPlatformBridgeFactory
{
public:
    /**
     * 現在のプラットフォームに対応するブリッジを作成します。
     *
     * @return プラットフォームブリッジ実装
     */
    static TSharedPtr<IPlatformBridge> CreateBridge();
};

/**
 * ゲームスレッドディスパッチャー
 *
 * Native SDKコールバック（別スレッド）をUnrealゲームスレッドで実行します。
 * 内部使用のみ。
 */
class FGameThreadDispatcher
{
public:
    /**
     * シングルトンインスタンスを取得します。
     */
    static FGameThreadDispatcher& Get();

    /**
     * 初期化します（FTickerDelegate登録）。
     */
    void Initialize();

    /**
     * 関数をゲームスレッドキューに追加します。
     *
     * @param Function 実行する関数
     */
    void Enqueue(TFunction<void()> Function);

    /**
     * ゲームスレッドで即座に関数を実行します（毎フレーム呼ばれる）。
     *
     * @param DeltaTime フレーム時間
     */
    void Tick(float DeltaTime);

private:
    FGameThreadDispatcher() = default;

    TQueue<TFunction<void()>> ExecutionQueue;
};

/**
 * JSONシリアライザー
 *
 * FPushNotificationData ↔ JSON文字列変換を提供します。
 * 内部使用のみ。
 */
class FJsonSerializer
{
public:
    /**
     * JSON文字列からFPushNotificationDataに変換します。
     *
     * @param JsonString JSON文字列
     * @param OutData 通知データ（出力）
     * @return 変換成功の場合true
     */
    static bool JsonToStruct(const FString& JsonString, FPushNotificationData& OutData);

    /**
     * FPushNotificationDataからJSON文字列に変換します。
     *
     * @param Data 通知データ
     * @param OutJsonString JSON文字列（出力）
     * @return 変換成功の場合true
     */
    static bool StructToJson(const FPushNotificationData& Data, FString& OutJsonString);
};
