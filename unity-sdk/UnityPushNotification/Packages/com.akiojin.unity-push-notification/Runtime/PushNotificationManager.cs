using System;
using System.Collections;
using PushNotification.SDK.Internal;
using PushNotification.SDK.Networking;
using UnityEngine;

namespace PushNotification.SDK
{
    public static class PushNotificationManager
    {
        private static readonly DeviceRegistrationClient RegistrationClient = new();
        private static string _playerAccountId;
        private static string _platform;
        private static bool _isConfigured;

        public static event Action<string> TokenRegistered;
        public static event Action<NotificationPayload> NotificationOpened;

        public static void Configure(string apiKey, string backendUrl, string playerAccountId = "")
        {
            RegistrationClient.Configure(apiKey, backendUrl);
            _playerAccountId = playerAccountId;
#if UNITY_IOS && !UNITY_EDITOR
            _platform = "IOS";
            PushNotificationIosBridge.Configure(apiKey, backendUrl);
#elif UNITY_ANDROID && !UNITY_EDITOR
            _platform = "ANDROID";
            PushNotificationAndroidBridge.Configure(apiKey, backendUrl);
#else
            _platform = Application.platform switch
            {
                RuntimePlatform.IPhonePlayer => "IOS",
                RuntimePlatform.Android => "ANDROID",
                _ => "EDITOR"
            };
#endif
            _isConfigured = true;
        }

        public static void RequestAuthorization()
        {
            if (!_isConfigured)
            {
                Debug.LogWarning("PushNotificationSDK: Configure must be called before RequestAuthorization");
                return;
            }
#if UNITY_IOS && !UNITY_EDITOR
            PushNotificationIosBridge.RequestAuthorization();
#elif UNITY_ANDROID && !UNITY_EDITOR
            PushNotificationAndroidBridge.RequestToken();
#else
            Debug.Log("PushNotificationSDK: RequestAuthorization called in editor");
#endif
        }

        public static void RegisterDeviceToken(string token)
        {
            if (!_isConfigured)
            {
                Debug.LogWarning("PushNotificationSDK: Configure must be called before token registration");
                return;
            }

            CoroutineRunner.Run(RegisterTokenRoutine(token));
        }

        private static IEnumerator RegisterTokenRoutine(string token)
        {
            yield return RegistrationClient.RegisterToken(token, _platform, _playerAccountId);
            TokenRegistered?.Invoke(token);
        }

        public static void HandleNotificationOpened(NotificationPayload payload)
        {
            NotificationOpened?.Invoke(payload);
        }
    }
}
