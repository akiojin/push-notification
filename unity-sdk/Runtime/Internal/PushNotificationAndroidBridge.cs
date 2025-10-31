using UnityEngine;

namespace PushNotification.SDK.Internal
{
    internal static class PushNotificationAndroidBridge
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        private const string SdkClassName = "com.push.notificationsdk.PushNotificationSdk";
#endif

        internal static void Configure(string apiKey, string backendUrl)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
            using var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
            using var sdkClass = new AndroidJavaClass(SdkClassName);
            var configuration = new AndroidJavaObject(
                "com.push.notificationsdk.PushNotificationSdk$Configuration",
                activity,
                apiKey,
                backendUrl
            );
            sdkClass.CallStatic("initialize", configuration);
#else
            Debug.Log("PushNotificationSDK: Android configure stub called in editor");
#endif
        }

        internal static void RequestToken()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using var sdkClass = new AndroidJavaClass(SdkClassName);
            sdkClass.CallStatic("requestToken");
#endif
        }
    }
}
