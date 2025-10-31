using System.Collections.Generic;
using NUnit.Framework;

namespace PushNotification.SDK.Tests
{
    public sealed class NotificationPayloadTests
    {
        [Test]
        public void CustomDataDefaultsToEmptyDictionary()
        {
            var payload = new NotificationPayload();
            Assert.IsNotNull(payload.CustomData);
            Assert.AreEqual(0, payload.CustomData.Count);
        }

        [Test]
        public void CustomDataCanBeAssigned()
        {
            var payload = new NotificationPayload
            {
                CustomData = new Dictionary<string, string> { { "missionId", "42" } }
            };

            Assert.AreEqual("42", payload.CustomData["missionId"]);
        }
    }
}
