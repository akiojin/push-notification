#include "PushNotificationSubsystem.h"

#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Json.h"
#include "JsonUtilities.h"
#include "Misc/CharConversion.h"

#if PLATFORM_ANDROID
#include "Android/AndroidApplication.h"
#include "Android/AndroidJNI.h"
#endif

DEFINE_LOG_CATEGORY_STATIC(LogPushNotificationSubsystem, Log, All);

namespace
{
    FString GetPlatformName()
    {
#if PLATFORM_IOS
        return TEXT("IOS");
#elif PLATFORM_ANDROID
        return TEXT("ANDROID");
#else
        return TEXT("EDITOR");
#endif
    }
}

#if PLATFORM_IOS
extern "C"
{
    void pn_configure(const char* ApiKey, const char* BackendUrl);
    void pn_request_authorization();
    void pn_consume_pending_notification();
}
#endif

void UPushNotificationSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
}

void UPushNotificationSubsystem::InitializePushSDK(const FString& InApiKey, const FString& InBackendUrl, const FString& InPlayerAccountId)
{
    ApiKey = InApiKey;
    BackendUrl = InBackendUrl;
    PlayerAccountId = InPlayerAccountId;
    bIsConfigured = !ApiKey.IsEmpty() && !BackendUrl.IsEmpty();

    if (!bIsConfigured)
    {
        UE_LOG(LogPushNotificationSubsystem, Warning, TEXT("PushNotificationSDK: Missing API key or backend URL"));
        return;
    }

#if PLATFORM_IOS
    {
        FTCHARToUTF8 ApiKeyUtf8(*ApiKey);
        FTCHARToUTF8 BackendUrlUtf8(*BackendUrl);
        pn_configure(ApiKeyUtf8.Get(), BackendUrlUtf8.Get());
    }
#elif PLATFORM_ANDROID
    if (JNIEnv* Env = FAndroidApplication::GetJavaEnv())
    {
        jclass SdkClass = FAndroidApplication::FindJavaClass("com/push/notificationsdk/PushNotificationSdk");
        if (SdkClass)
        {
            jclass ConfigClass = FAndroidApplication::FindJavaClass("com/push/notificationsdk/PushNotificationSdk$Configuration");
            if (ConfigClass)
            {
                jmethodID Ctor = Env->GetMethodID(ConfigClass, "<init>", "(Landroid/app/Application;Ljava/lang/String;Ljava/lang/String;)V");
                jmethodID Initialize = Env->GetStaticMethodID(SdkClass, "initialize", "(Lcom/push/notificationsdk/PushNotificationSdk$Configuration;)V");
                jobject Activity = FAndroidApplication::GetGameActivityThis();

                jstring ApiKeyJava = Env->NewStringUTF(TCHAR_TO_UTF8(*ApiKey));
                jstring BackendUrlJava = Env->NewStringUTF(TCHAR_TO_UTF8(*BackendUrl));
                jobject ConfigObject = Env->NewObject(ConfigClass, Ctor, Activity, ApiKeyJava, BackendUrlJava);
                Env->CallStaticVoidMethod(SdkClass, Initialize, ConfigObject);

                Env->DeleteLocalRef(ConfigObject);
                Env->DeleteLocalRef(ApiKeyJava);
                Env->DeleteLocalRef(BackendUrlJava);
                Env->DeleteLocalRef(ConfigClass);
            }
            Env->DeleteLocalRef(SdkClass);
        }
    }
#endif
}

void UPushNotificationSubsystem::RequestAuthorization()
{
    if (!bIsConfigured)
    {
        UE_LOG(LogPushNotificationSubsystem, Warning, TEXT("PushNotificationSDK: Call InitializePushSDK before RequestAuthorization"));
        return;
    }

#if PLATFORM_IOS
    pn_request_authorization();
#elif PLATFORM_ANDROID
    if (JNIEnv* Env = FAndroidApplication::GetJavaEnv())
    {
        jclass SdkClass = FAndroidApplication::FindJavaClass("com/push/notificationsdk/PushNotificationSdk");
        if (SdkClass)
        {
            jmethodID RequestToken = Env->GetStaticMethodID(SdkClass, "requestToken", "()V");
            Env->CallStaticVoidMethod(SdkClass, RequestToken);
            Env->DeleteLocalRef(SdkClass);
        }
    }
#else
    UE_LOG(LogPushNotificationSubsystem, Log, TEXT("PushNotificationSDK: RequestAuthorization in editor"));
#endif
}

void UPushNotificationSubsystem::RegisterDeviceToken(const FString& Token)
{
    if (!bIsConfigured)
    {
        UE_LOG(LogPushNotificationSubsystem, Warning, TEXT("PushNotificationSDK: Configure before registering token"));
        return;
    }

    const FString Platform = GetPlatformName();
    SendTokenRegistrationRequest(Token, Platform);
}

void UPushNotificationSubsystem::HandleNotificationOpened(const FString& PayloadJson)
{
    OnNotificationOpened.Broadcast(PayloadJson);
}

void UPushNotificationSubsystem::SendTokenRegistrationRequest(const FString& Token, const FString& Platform) const
{
    if (ApiKey.IsEmpty() || BackendUrl.IsEmpty())
    {
        UE_LOG(LogPushNotificationSubsystem, Warning, TEXT("PushNotificationSDK: Missing credentials"));
        return;
    }

    const FString Url = BackendUrl.EndsWith(TEXT("/")) ? BackendUrl + TEXT("api/v1/tokens") : BackendUrl + TEXT("/api/v1/tokens");
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(Url);
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetHeader(TEXT("x-api-key"), ApiKey);

    TSharedPtr<FJsonObject> Payload = MakeShared<FJsonObject>();
    Payload->SetStringField(TEXT("token"), Token);
    Payload->SetStringField(TEXT("platform"), Platform);
    if (!PlayerAccountId.IsEmpty())
    {
        Payload->SetStringField(TEXT("playerAccountId"), PlayerAccountId);
    }

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(Payload.ToSharedRef(), Writer);

    Request->SetContentAsString(OutputString);
    Request->OnProcessRequestComplete().BindLambda([this, Token](FHttpRequestPtr Req, FHttpResponsePtr Response, bool bSuccess)
    {
        if (!bSuccess || !Response.IsValid())
        {
            const FString Error = TEXT("PushNotificationSDK: Token registration failed - no response");
            UE_LOG(LogPushNotificationSubsystem, Error, TEXT("%s"), *Error);
            OnError.Broadcast(Error);
            return;
        }

        if (Response->GetResponseCode() < 200 || Response->GetResponseCode() >= 300)
        {
            const FString Error = FString::Printf(TEXT("PushNotificationSDK: Token registration HTTP %d"), Response->GetResponseCode());
            UE_LOG(LogPushNotificationSubsystem, Error, TEXT("%s"), *Error);
            OnError.Broadcast(Error);
            return;
        }

        UE_LOG(LogPushNotificationSubsystem, Log, TEXT("PushNotificationSDK: Token registered successfully"));
        OnTokenRegistered.Broadcast(Token);
    });

    if (!Request->ProcessRequest())
    {
        const FString Error = TEXT("PushNotificationSDK: Failed to send HTTP request");
        UE_LOG(LogPushNotificationSubsystem, Error, TEXT("%s"), *Error);
        OnError.Broadcast(Error);
    }
}
