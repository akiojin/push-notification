using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;

namespace PushNotification.SDK.Editor
{
    public static class UnityTestRunner
    {
        [MenuItem("PushNotificationSDK/Run EditMode Tests")]
        public static void RunEditModeTests()
        {
            var api = ScriptableObject.CreateInstance<TestRunnerApi>();
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
