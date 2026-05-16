import Capacitor
import Foundation

/// Capacitor plugin that bridges the Supabase JWT from the JS layer
/// into the shared App Group UserDefaults so the widget extension can read it.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveToken",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType: CAPPluginReturnPromise),
    ]

    private let kAppGroup = "group.eazy.family"

    /// Called from JS after successful login.
    /// JS: WidgetBridge.saveToken({ accessToken: "...", userId: "..." })
    @objc func saveToken(_ call: CAPPluginCall) {
        guard let token = call.getString("accessToken") else {
            call.reject("accessToken is required")
            return
        }
        let userId = call.getString("userId") ?? ""

        let defaults = UserDefaults(suiteName: kAppGroup)
        defaults?.set(token,  forKey: "eazy_access_token")
        defaults?.set(userId, forKey: "eazy_user_id")
        defaults?.synchronize()

        // Tell WidgetKit to reload all timelines immediately
        reloadWidgets()
        call.resolve()
    }

    /// Called from JS on logout.
    @objc func clearToken(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: kAppGroup)
        defaults?.removeObject(forKey: "eazy_access_token")
        defaults?.removeObject(forKey: "eazy_user_id")
        defaults?.synchronize()

        reloadWidgets()
        call.resolve()
    }

    private func reloadWidgets() {
        // WidgetCenter is in WidgetKit — only available iOS 14+
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
