using PushNotification.SDK;
using UnityEngine;

namespace PushNotification.SDK.Samples
{
    public class PushNotificationSample : MonoBehaviour
    {
        [SerializeField] private string apiKey = "YOUR_API_KEY";
        [SerializeField] private string backendUrl = "https://api.example.com";
        [SerializeField] private string playerAccountId = "player-001";

        private void Start()
        {
            PushNotificationManager.Configure(apiKey, backendUrl, playerAccountId);
            PushNotificationManager.TokenRegistered += OnTokenRegistered;
            PushNotificationManager.NotificationOpened += OnNotificationOpened;
            PushNotificationManager.RequestAuthorization();
        }

        private void OnDestroy()
        {
            PushNotificationManager.TokenRegistered -= OnTokenRegistered;
            PushNotificationManager.NotificationOpened -= OnNotificationOpened;
        }

        private void OnTokenRegistered(string token)
        {
            Debug.Log($"[PushNotificationSample] Token registered: {token}");
        }

        private void OnNotificationOpened(NotificationPayload payload)
        {
            Debug.Log($"[PushNotificationSample] Notification opened: {payload.Title}\nBody: {payload.Body}");
        }
    }
}
