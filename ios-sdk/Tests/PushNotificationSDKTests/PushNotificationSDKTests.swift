import XCTest
@testable import PushNotificationSDK

final class PushNotificationSDKTests: XCTestCase {
    func testDataTokenConversion() {
        let bytes: [UInt8] = [0xde, 0xad, 0xbe, 0xef]
        let data = Data(bytes)
        XCTAssertEqual(data.tokenString, "deadbeef")
    }

    func testRegistrarRequiresConfiguration() {
        let registrar = DeviceTokenRegistrar()
        let expectation = XCTestExpectation(description: "completion called")
        registrar.register(token: "abc") { result in
            if case .failure(let error) = result, case DeviceTokenRegistrationError.notConfigured = error {
                expectation.fulfill()
            }
        }
        wait(for: [expectation], timeout: 0.5)
    }
}
