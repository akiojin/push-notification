using System.Runtime.InteropServices;
using UnityEngine;

namespace PushNotification.SDK.Internal
{
    internal static class PushNotificationIosBridge
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void pn_configure(string apiKey, string backendUrl);

        [DllImport("__Internal")]
        private static extern void pn_request_authorization();

        [DllImport("__Internal")]
        private static extern void pn_consume_pending_notification();
#else
        private static void pn_configure(string apiKey, string backendUrl) { }
        private static void pn_request_authorization() { }
        private static void pn_consume_pending_notification() { }
#endif

        internal static void Configure(string apiKey, string backendUrl)
        {
#if UNITY_IOS && !UNITY_EDITOR
            pn_configure(apiKey, backendUrl);
#else
            Debug.Log("PushNotificationSDK: iOS configure stub called in editor");
#endif
        }

        internal static void RequestAuthorization()
        {
#if UNITY_IOS && !UNITY_EDITOR
            pn_request_authorization();
#else
            Debug.Log("PushNotificationSDK: requestAuthorization stub");
#endif
        }

        internal static void ConsumePending()
        {
#if UNITY_IOS && !UNITY_EDITOR
            pn_consume_pending_notification();
#endif
        }
    }
}
