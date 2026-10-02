import Capacitor
import GameKit

/// Minimal Game Center bridge: sign-in, leaderboards and achievements.
/// Every call resolves (never rejects) when Game Center is unavailable, so the game keeps working offline.
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showDashboard", returnType: CAPPluginReturnPromise),
    ]

    @objc func authenticate(_ call: CAPPluginCall) {
        if GKLocalPlayer.local.isAuthenticated {
            call.resolve(["authenticated": true])
            return
        }
        let interactive = call.getBool("interactive") ?? false
        var resolved = false
        let finish: (Bool, String) -> Void = { authenticated, error in
            guard !resolved else { return }
            resolved = true
            call.resolve(["authenticated": authenticated, "error": error])
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
            finish(false, "Game Center timed out")
        }
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            DispatchQueue.main.async {
                guard !resolved else { return }
                if let viewController = viewController {
                    guard interactive, let presenter = self?.bridge?.viewController, presenter.presentedViewController == nil else {
                        finish(false, "")
                        return
                    }
                    presenter.present(viewController, animated: true)
                    return
                }
                finish(GKLocalPlayer.local.isAuthenticated, error?.localizedDescription ?? "")
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId"), let score = call.getInt("score") else {
            call.resolve(["submitted": false])
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["submitted": false])
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
            call.resolve(["submitted": error == nil])
        }
    }

    @objc func reportAchievements(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["reported": false])
            return
        }
        let items = call.getArray("achievements", JSObject.self) ?? []
        let achievements: [GKAchievement] = items.compactMap { item in
            guard let id = item["id"] as? String else { return nil }
            let achievement = GKAchievement(identifier: id)
            achievement.percentComplete = (item["percent"] as? NSNumber)?.doubleValue ?? 100
            achievement.showsCompletionBanner = true
            return achievement
        }
        if achievements.isEmpty {
            call.resolve(["reported": true])
            return
        }
        GKAchievement.report(achievements) { error in
            call.resolve(["reported": error == nil])
        }
    }

    @objc func showDashboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.resolve(["shown": false])
                return
            }
            let viewController = GKGameCenterViewController(state: .dashboard)
            viewController.gameCenterDelegate = self
            self.bridge?.viewController?.present(viewController, animated: true)
            call.resolve(["shown": true])
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
