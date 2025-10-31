using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;

namespace PushNotification.SDK.Editor
{
    public static class UnityTestRunner
    {
        [MenuItem("PushNotificationSDK/Run EditMode Tests")]
        public static void RunEditModeTests()
        {
            var api = new TestRunnerApi();
            var settings = new ExecutionSettings
            {
                filters = new[]
                {
                    new Filter
                    {
                        testMode = TestMode.EditMode
                    }
                }
            };
            api.Execute(settings);
        }
    }
}
