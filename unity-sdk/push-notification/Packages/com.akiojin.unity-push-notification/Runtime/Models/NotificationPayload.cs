using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace PushNotification.SDK
{
    [Serializable]
    public sealed class NotificationPayload
    {
        [JsonProperty("title")]
        public string Title { get; set; } = string.Empty;

        [JsonProperty("body")]
        public string Body { get; set; } = string.Empty;

        [JsonProperty("imageUrl")]
        public string ImageUrl { get; set; } = string.Empty;

        [JsonProperty("customData")]
        public Dictionary<string, string> CustomData { get; set; } = new();
    }
}
