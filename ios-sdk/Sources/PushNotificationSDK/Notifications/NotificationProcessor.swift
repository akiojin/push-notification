import Foundation
import UserNotifications

final class NotificationProcessor {
    private var pendingResponse: UNNotificationResponse?
    private let lock = NSLock()

    func storePending(response: UNNotificationResponse) {
        lock.lock()
        pendingResponse = response
        lock.unlock()
    }

    func consumePendingResponse() -> UNNotificationResponse? {
        lock.lock()
        defer { lock.unlock() }
        let response = pendingResponse
        pendingResponse = nil
        return response
    }
}
