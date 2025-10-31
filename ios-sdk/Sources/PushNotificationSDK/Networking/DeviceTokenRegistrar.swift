import Foundation

enum DeviceTokenRegistrationError: Error {
    case notConfigured
    case invalidResponse
}

final class DeviceTokenRegistrar {
    private var configuration: Configuration?
    private let queue = DispatchQueue(label: "com.pushnotification.sdk.tokenregistrar")

    struct Configuration {
        let apiKey: String
        let backendURL: URL
        let session: URLSession
    }

    func configure(apiKey: String, backendURL: URL, session: URLSession) {
        configuration = Configuration(apiKey: apiKey, backendURL: backendURL, session: session)
    }

    func register(token: String, completion: @escaping (Result<Void, Error>) -> Void) {
        queue.async { [weak self] in
            guard let self else { return }
            guard let configuration = self.configuration else {
                completion(.failure(DeviceTokenRegistrationError.notConfigured))
                return
            }

            var request = URLRequest(url: configuration.backendURL.appendingPathComponent("/api/v1/tokens"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(configuration.apiKey, forHTTPHeaderField: "x-api-key")

            let body: [String: Any] = [
                "token": token,
                "platform": "IOS"
            ]

            request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [])

            configuration.session.dataTask(with: request) { _, response, error in
                if let error {
                    completion(.failure(error))
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse, 200..<300 ~= httpResponse.statusCode else {
                    completion(.failure(DeviceTokenRegistrationError.invalidResponse))
                    return
                }

                completion(.success(()))
            }.resume()
        }
    }
}
