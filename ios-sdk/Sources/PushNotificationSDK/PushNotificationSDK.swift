import Foundation
import UserNotifications
#if canImport(UIKit)
import UIKit
#endif

public enum PushNotificationError: Error {
    case permissionsDenied
    case registrationFailed(String)
    case invalidConfiguration
}

@available(macOS 10.14, *)
public protocol PushNotificationDelegate: AnyObject {
    func pushNotificationSDK(_ sdk: PushNotificationSDK, didReceiveToken token: String)
    func pushNotificationSDK(_ sdk: PushNotificationSDK, didReceiveNotification response: UNNotificationResponse)
    func pushNotificationSDK(_ sdk: PushNotificationSDK, didReceiveForegroundNotification notification: UNNotification)
    func pushNotificationSDK(_ sdk: PushNotificationSDK, didFailWithError error: PushNotificationError)
}

@MainActor
@available(macOS 10.14, *)
public final class PushNotificationSDK: NSObject {
    public static let shared = PushNotificationSDK()

    private let authorizationCenter: UNUserNotificationCenter
    private let tokenRegistrar: DeviceTokenRegistrar
    private let notificationProcessor: NotificationProcessor
    private let appStateObserver: AppStateObserving

    public weak var delegate: PushNotificationDelegate?

    private override init() {
        authorizationCenter = UNUserNotificationCenter.current()
        tokenRegistrar = DeviceTokenRegistrar()
        notificationProcessor = NotificationProcessor()
        appStateObserver = DefaultAppStateObserver()
        super.init()
#if canImport(UIKit)
        authorizationCenter.delegate = self
#endif
        appStateObserver.startObserving(self)
    }

    public func configure(apiKey: String, backendURL: URL, session: URLSession = .shared) {
        tokenRegistrar.configure(apiKey: apiKey, backendURL: backendURL, session: session)
    }

    public func requestAuthorization(options: UNAuthorizationOptions = [.alert, .badge, .sound]) {
        authorizationCenter.requestAuthorization(options: options) { [weak self] granted, error in
            guard let self else { return }
            if let error {
                self.delegate?.pushNotificationSDK(self, didFailWithError: .registrationFailed(error.localizedDescription))
                return
            }

            guard granted else {
                self.delegate?.pushNotificationSDK(self, didFailWithError: .permissionsDenied)
                return
            }

#if canImport(UIKit)
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
#endif
        }
    }

    public func registerDeviceToken(_ tokenData: Data) {
        guard let tokenString = tokenData.tokenString else {
            delegate?.pushNotificationSDK(self, didFailWithError: .registrationFailed("Invalid token"))
            return
        }

        tokenRegistrar.register(token: tokenString) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success:
                delegate?.pushNotificationSDK(self, didReceiveToken: tokenString)
            case .failure(let error):
                delegate?.pushNotificationSDK(self, didFailWithError: .registrationFailed(error.localizedDescription))
            }
        }
    }

    public func handleNotificationResponse(_ response: UNNotificationResponse) {
        notificationProcessor.storePending(response: response)
        delegate?.pushNotificationSDK(self, didReceiveNotification: response)
    }

    public func consumePendingNotificationResponse() -> UNNotificationResponse? {
        return notificationProcessor.consumePendingResponse()
    }
}

#if canImport(UIKit)
@available(macOS 10.14, *)
extension PushNotificationSDK: UNUserNotificationCenterDelegate {
    public func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        handleNotificationResponse(response)
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        delegate?.pushNotificationSDK(self, didReceiveForegroundNotification: notification)
        return [.banner, .sound]
    }
}
#endif
