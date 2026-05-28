import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // Every time app comes to foreground, pull token from WKWebView localStorage → App Group
    func applicationDidBecomeActive(_ application: UIApplication) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.syncTokenFromWebView()
        }
    }

    private func syncTokenFromWebView() {
        let rootView = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })?.rootViewController?.view
        guard let webView = findWebView(in: rootView) else {
            print("⚠️ WidgetBridge: WKWebView not found")
            return
        }

        let js = """
        JSON.stringify({
            token: localStorage.getItem('eazy_widget_token'),
            userId: localStorage.getItem('eazy_widget_user')
        })
        """

        webView.evaluateJavaScript(js) { result, error in
            guard let jsonStr = result as? String,
                  let data = jsonStr.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let token = obj["token"] as? String,
                  !token.isEmpty else {
                print("⚠️ WidgetBridge: no token in localStorage yet")
                return
            }

            let userId = obj["userId"] as? String ?? ""
            let defaults = UserDefaults(suiteName: "group.eazy.family")
            defaults?.set(token,  forKey: "eazy_access_token")
            defaults?.set(userId, forKey: "eazy_user_id")
            defaults?.synchronize()
            print("✅ WidgetBridge: token synced for user \(userId.prefix(8))")
        }
    }

    private func findWebView(in view: UIView?) -> WKWebView? {
        guard let view = view else { return nil }
        if let wk = view as? WKWebView { return wk }
        for sub in view.subviews {
            if let found = findWebView(in: sub) { return found }
        }
        return nil
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
