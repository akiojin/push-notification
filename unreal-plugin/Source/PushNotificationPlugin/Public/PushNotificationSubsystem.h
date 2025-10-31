#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "PushNotificationSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPushTokenReceivedDelegate, const FString&, Token);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPushNotificationOpenedDelegate, const FString&, PayloadJson);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPushErrorDelegate, const FString&, ErrorMessage);

UCLASS()
class PUSHNOTIFICATIONPLUGIN_API UPushNotificationSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category="Push Notification")
    void InitializePushSDK(const FString& InApiKey, const FString& InBackendUrl, const FString& InPlayerAccountId);

    UFUNCTION(BlueprintCallable, Category="Push Notification")
    void RequestAuthorization();

    UFUNCTION(BlueprintCallable, Category="Push Notification")
    void RegisterDeviceToken(const FString& Token);

    UFUNCTION(BlueprintCallable, Category="Push Notification")
    void HandleNotificationOpened(const FString& PayloadJson);

    UPROPERTY(BlueprintAssignable, Category="Push Notification")
    FPushTokenReceivedDelegate OnTokenRegistered;

    UPROPERTY(BlueprintAssignable, Category="Push Notification")
    FPushNotificationOpenedDelegate OnNotificationOpened;

    UPROPERTY(BlueprintAssignable, Category="Push Notification")
    FPushErrorDelegate OnError;

private:
    FString ApiKey;
    FString BackendUrl;
    FString PlayerAccountId;

    bool bIsConfigured = false;

    void SendTokenRegistrationRequest(const FString& Token, const FString& Platform) const;
};
