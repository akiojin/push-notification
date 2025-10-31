#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FPushNotificationPluginModule : public IModuleInterface
{
public:
    virtual void StartupModule() override
    {
        UE_LOG(LogTemp, Log, TEXT("PushNotificationPlugin module started"));
    }

    virtual void ShutdownModule() override
    {
        UE_LOG(LogTemp, Log, TEXT("PushNotificationPlugin module shutdown"));
    }
};

IMPLEMENT_MODULE(FPushNotificationPluginModule, PushNotificationPlugin)
