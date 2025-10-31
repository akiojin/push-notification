import Foundation

extension Data {
    var tokenString: String? {
        map { String(format: "%02.2hhx", $0) }.joined()
    }
}
