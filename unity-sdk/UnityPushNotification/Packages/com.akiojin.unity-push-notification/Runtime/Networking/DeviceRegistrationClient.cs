using System;
using System.Collections;
using System.Text;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.Networking;

namespace PushNotification.SDK.Networking
{
    internal sealed class DeviceRegistrationClient
    {
        private string _apiKey;
        private Uri _baseUri;
        private bool _configured;

        private sealed class TokenPayload
        {
            // ReSharper disable once UnusedAutoPropertyAccessor.Local
            [JsonProperty("token")]
            public string Token { get; private set; }

            // ReSharper disable once UnusedAutoPropertyAccessor.Local
            [JsonProperty("platform")]
            public string Platform { get; private set; }

            [JsonProperty("playerAccountId", NullValueHandling = NullValueHandling.Ignore)]
            public string PlayerAccountId { get; private set; }

            public TokenPayload(string token, string platform, string playerAccountId)
            {
                Token = token;
                Platform = platform;
                PlayerAccountId = string.IsNullOrWhiteSpace(playerAccountId) ? null : playerAccountId;
            }
        }

        internal void Configure(string apiKey, string backendUrl)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new ArgumentException("API key is required", nameof(apiKey));
            }

            if (!Uri.TryCreate(backendUrl, UriKind.Absolute, out var uri))
            {
                throw new ArgumentException("Backend URL must be absolute", nameof(backendUrl));
            }

            _apiKey = apiKey;
            _baseUri = uri;
            _configured = true;
        }

        internal IEnumerator RegisterToken(string token, string platform, string playerAccountId)
        {
            if (!_configured)
            {
                throw new InvalidOperationException("DeviceRegistrationClient is not configured");
            }

            var payload = new TokenPayload(token, platform, playerAccountId);
            var json = JsonConvert.SerializeObject(payload);
            var url = new Uri(_baseUri, "/api/v1/tokens").ToString();

            using var request = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json)),
                downloadHandler = new DownloadHandlerBuffer()
            };

            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("x-api-key", _apiKey);

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.ConnectionError ||
                request.result == UnityWebRequest.Result.ProtocolError)
            {
                Debug.LogError($"PushNotificationSDK: failed to register token ({request.responseCode}) {request.error}");
            }
        }
    }
}
