import Capacitor
import Foundation

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveToken",  returnType:
CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType:
CAPPluginReturnPromise),
    ]
                                                                           
    private let kAppGroup = "group.eazy.family"

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
        call.resolve()
    }
                                                              
    @objc func clearToken(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: kAppGroup)
        defaults?.removeObject(forKey: "eazy_access_token")
        defaults?.removeObject(forKey: "eazy_user_id")
        defaults?.synchronize()
        call.resolve()
    }
}
  
