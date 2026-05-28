import Capacitor
import Foundation
import StoreKit
import SwiftUI

// MARK: - SwiftUI wrapper

private struct EazySubscriptionView: View {
    let productIds: [String]
    let onDismiss: () -> Void

    var body: some View {
        SubscriptionStoreView(productIDs: productIds)
            .subscriptionStorePolicyDestination(
                url: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!,
                for: .termsOfService
            )
            .subscriptionStorePolicyDestination(
                url: URL(string: "https://eazy.family/privacy")!,
                for: .privacyPolicy
            )
            .onDisappear { onDismiss() }
    }
}

// MARK: - Capacitor plugin

/// Presents Apple's native SubscriptionStoreView sheet.
/// JS: SubscriptionPlugin.present({ productIds: ["com.eazy.family.annual", ...] })
/// Resolves { dismissed: true } when the sheet closes (purchase or cancel).
/// The caller should then refresh RevenueCat entitlements.
@objc(SubscriptionPlugin)
public class SubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionPlugin"
    public let jsName = "SubscriptionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
    ]

    @objc func present(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds") as? [String], !productIds.isEmpty else {
            call.reject("productIds array is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let rootVC = self?.bridge?.viewController else {
                call.reject("No root view controller")
                return
            }

            let storeView = EazySubscriptionView(productIds: productIds) {
                call.resolve(["dismissed": true])
            }

            let hostingVC = UIHostingController(rootView: storeView)
            hostingVC.modalPresentationStyle = .pageSheet

            if let sheet = hostingVC.sheetPresentationController {
                sheet.detents = [.large()]
                sheet.prefersGrabberVisible = true
            }

            rootVC.present(hostingVC, animated: true)
        }
    }
}
