import Capacitor
import WebKit

/// Registers the app's own native plugins with the Capacitor bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // Set before Capacitor loads index.html so the first screen uses the app's iOS language.
        let language = Bundle.main.preferredLocalizations.first ?? Locale.preferredLanguages.first ?? "en"
        if let quoted = try? JSONSerialization.data(withJSONObject: [language]),
           let array = String(data: quoted, encoding: .utf8) {
            let literal = String(array.dropFirst().dropLast())
            webView?.configuration.userContentController.addUserScript(
                WKUserScript(source: "window.__nativeLanguage = \(literal);", injectionTime: .atDocumentStart, forMainFrameOnly: true)
            )
        }
        bridge?.registerPluginInstance(GameCenterPlugin())
        bridge?.registerPluginInstance(PurchaseJournalPlugin())
    }
}
