import Capacitor
import Foundation
import StoreKit

// MARK: - Capacitor plugin

/// Purchases a single subscription product directly via StoreKit 2.
/// Skips SubscriptionStoreView — the caller already shows plan selection UI.
/// JS: SubscriptionPlugin.present({ productIds: ["EZ.Family.Annual"] })
/// Resolves { purchased: true } on success, { purchased: false } on cancel/pending.
@objc(SubscriptionPlugin)
public class SubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionPlugin"
    public let jsName = "SubscriptionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
    ]

    @objc func present(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds") as? [String],
              let productId = productIds.first else {
            call.reject("productIds array is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["purchased": true])
                    case .unverified:
                        call.resolve(["purchased": false])
                    }
                case .pending:
                    call.resolve(["purchased": false, "pending": true])
                case .userCancelled:
                    call.resolve(["purchased": false, "cancelled": true])
                @unknown default:
                    call.resolve(["purchased": false])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}
