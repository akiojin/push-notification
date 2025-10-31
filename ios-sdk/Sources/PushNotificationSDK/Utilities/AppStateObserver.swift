import Foundation
import UIKit

protocol AppStateObserving: AnyObject {
    func startObserving(_ sdk: PushNotificationSDK)
}

final class DefaultAppStateObserver: AppStateObserving {
    private var notificationCenter: NotificationCenter

    init(notificationCenter: NotificationCenter = .default) {
        self.notificationCenter = notificationCenter
    }

    func startObserving(_ sdk: PushNotificationSDK) {
        notificationCenter.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            if let response = sdk.consumePendingNotificationResponse() {
                sdk.delegate?.pushNotificationSDK(sdk, didReceiveNotification: response)
            }
        }
    }
}
