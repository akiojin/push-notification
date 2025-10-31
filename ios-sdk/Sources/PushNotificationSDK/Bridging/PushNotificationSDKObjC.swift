import Foundation
import UserNotifications

@MainActor
@objc(PNPushNotificationSDK)
public final class PushNotificationSDKObjC: NSObject {
    private let sdk = PushNotificationSDK.shared

    @objc public static let shared = PushNotificationSDKObjC()

    private override init() {
        super.init()
    }

    @objc public func configure(withAPIKey apiKey: String, backendURL: String) {
        guard let url = URL(string: backendURL) else {
            return
        }
        sdk.configure(apiKey: apiKey, backendURL: url)
    }

    @objc public func requestAuthorization() {
        sdk.requestAuthorization()
    }

    @objc public func registerDeviceToken(_ token: Data) {
        sdk.registerDeviceToken(token)
    }

    @objc public func handleNotificationResponse(_ response: UNNotificationResponse) {
        sdk.handleNotificationResponse(response)
    }

    @objc public func consumePendingNotificationResponse() -> UNNotificationResponse? {
        sdk.consumePendingNotificationResponse()
    }
}
