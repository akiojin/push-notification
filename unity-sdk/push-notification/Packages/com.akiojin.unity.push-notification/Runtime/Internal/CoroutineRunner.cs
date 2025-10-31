using System.Collections;
using UnityEngine;

namespace PushNotification.SDK.Internal
{
    internal sealed class CoroutineRunner : MonoBehaviour
    {
        private static CoroutineRunner _instance;

        internal static void Run(IEnumerator routine)
        {
            if (routine == null)
            {
                return;
            }

            if (_instance == null)
            {
                var runnerObject = new GameObject("PushNotificationSDK_CoroutineRunner")
                {
                    hideFlags = HideFlags.HideAndDontSave
                };
                _instance = runnerObject.AddComponent<CoroutineRunner>();
                DontDestroyOnLoad(runnerObject);
            }

            _instance.StartCoroutine(routine);
        }
    }
}
