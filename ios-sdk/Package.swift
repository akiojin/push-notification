// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PushNotificationSDK",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v12)
    ],
    products: [
        .library(
            name: "PushNotificationSDK",
            targets: ["PushNotificationSDK"]
        )
    ],
    targets: [
        .target(
            name: "PushNotificationSDK",
            dependencies: [],
            path: "Sources",
            resources: [
                .process("Resources/PrivacyInfo.xcprivacy")
            ]
        ),
        .testTarget(
            name: "PushNotificationSDKTests",
            dependencies: ["PushNotificationSDK"],
            path: "Tests"
        )
    ]
)
