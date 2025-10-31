using UnrealBuildTool;

public class PushNotificationPlugin : ModuleRules
{
    public PushNotificationPlugin(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "Json",
            "JsonUtilities"
        });

        PrivateDependencyModuleNames.AddRange(new[]
        {
            "HTTP"
        });

        if (Target.Platform == UnrealTargetPlatform.IOS)
        {
            PublicSystemLibraries.Add("c++");
            PublicAdditionalFrameworks.Add(new Framework("PushNotificationSDK", "../ThirdParty/iOS/PushNotificationSDK.embeddedframework.zip"));
        }
        else if (Target.Platform == UnrealTargetPlatform.Android)
        {
            string PluginPath = Utils.MakePathRelativeTo(ModuleDirectory, Target.RelativeEnginePath);
            AdditionalPropertiesForReceipt.Add("AndroidPlugin", System.IO.Path.Combine(PluginPath, "../Resources/PushNotificationPlugin_Android_UPL.xml"));
        }
    }
}
