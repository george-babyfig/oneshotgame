import Capacitor
import Foundation
import CryptoKit

/// Opt-in snapshots in the player's Apple account. No app server or live progress sync.
@objc(CloudBackupPlugin)
public class CloudBackupPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudBackupPlugin"
    public let jsName = "CloudBackup"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]
    private let rawLimit = 256 * 1024
    private let keyLimit = 96 * 1024
    private let totalLimit = 900 * 1024
    private let nonceKey = "pp.backup.nativeNonce"
    private var observer: NSObjectProtocol?
    private var quotaExceeded = false
    private var enabled: Bool { Bundle.main.object(forInfoDictionaryKey: "PPCloudBackup") as? Bool == true }
    private var account: Bool { enabled && FileManager.default.ubiquityIdentityToken != nil }

    deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }

    /// Even obtaining the store is forbidden until an opted-in JS operation arrives.
    private func store() -> NSUbiquitousKeyValueStore? {
        guard enabled, account else { return nil }
        let store = NSUbiquitousKeyValueStore.default
        if observer == nil {
            observer = NotificationCenter.default.addObserver(
                forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
                object: store, queue: .main
            ) { [weak self] note in
                guard let self = self else { return }
                let value = (note.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? NSNumber)?.intValue
                let reason: String
                switch value {
                case NSUbiquitousKeyValueStoreInitialSyncChange: reason = "initial"
                case NSUbiquitousKeyValueStoreQuotaViolationChange:
                    reason = "quota"
                    self.quotaExceeded = true
                case NSUbiquitousKeyValueStoreAccountChange: reason = "account"
                default: reason = "server"
                }
                self.notifyListeners("changed", data: ["reason": reason])
            }
            store.synchronize()
        }
        return store
    }
    private func parts(_ key: String) -> (String, String)? {
        let parts = key.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 4, parts[0] == "pp", parts[1] == "b" else { return nil }
        let valid: (Substring) -> Bool = { $0.count == 32 && $0.allSatisfy { "0123456789abcdef".contains($0) } }
        guard valid(parts[2]), valid(parts[3]) else { return nil }
        return (String(parts[2]), String(parts[3]))
    }
    private func envelope(_ value: Any?) -> [String: Any]? {
        guard let data = value as? Data, data.count <= keyLimit,
              let object = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
              let record = object as? [String: Any], record["format"] as? Int == 1,
              record["payload"] is Data, record["meta"] is [String: Any] else { return nil }
        return record
    }
    private func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    private func byteCount(_ value: Any) -> Int {
        // Apple counts key bytes too. Count all store entries, including unknown future entries.
        if let data = value as? Data { return data.count }
        return (try? PropertyListSerialization.data(fromPropertyList: value, format: .binary, options: 0).count) ?? totalLimit
    }
    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["enabled": enabled, "account": account])
    }
    @objc func list(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let store = self.store() else { call.resolve(["keys": []]); return }
            let keys: [[String: Any]] = store.dictionaryRepresentation.compactMap { key, value in
                guard self.parts(key) != nil, let record = self.envelope(value),
                      var meta = record["meta"] as? [String: Any], meta["key"] as? String == key else { return nil }
                meta["bytes"] = self.byteCount(value)
                return meta
            }
            call.resolve(["keys": keys])
        }
    }
    @objc func read(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let key = call.getString("key"), self.parts(key) != nil,
                  let store = self.store(), let record = self.envelope(store.object(forKey: key)),
                  let compressed = record["payload"] as? Data, var meta = record["meta"] as? [String: Any],
                  meta["key"] as? String == key else { call.resolve(["json": NSNull()]); return }
            do {
                let data = try (compressed as NSData).decompressed(using: .zlib) as Data
                guard data.count <= self.rawLimit, self.hash(data) == meta["sha256"] as? String,
                      let json = String(data: data, encoding: .utf8) else { call.reject("Invalid backup"); return }
                meta["bytes"] = self.byteCount(store.object(forKey: key)!)
                call.resolve(["json": json, "meta": meta])
            } catch { call.reject("Invalid compressed backup") }
        }
    }
    @objc func write(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.enabled, self.account else {
                call.resolve(["ok": false, "reason": self.enabled ? "account" : "disabled"]); return
            }
            guard let key = call.getString("key"), let (saveId, nonce) = self.parts(key),
                  let json = call.getString("json"), let raw = json.data(using: .utf8), raw.count <= self.rawLimit,
                  var meta = call.getObject("meta"), meta["key"] as? String == key,
                  meta["saveId"] as? String == saveId, meta["nonce"] as? String == nonce,
                  let seq = meta["seq"] as? Int, seq > 0,
                  let savedAt = meta["savedAt"] as? Double, savedAt.isFinite, savedAt >= 0,
                  let version = meta["v"] as? Int, version > 0,
                  let summary = meta["summary"] as? [String: Any], summary["level"] is Int, summary["friends"] is Int,
                  let object = try? JSONSerialization.jsonObject(with: raw) as? [String: Any],
                  object["v"] as? Int == version, meta["sha256"] as? String == self.hash(raw) else {
                call.reject("Invalid backup metadata"); return
            }
            // Binding is local, immutable across progress lines, and never comes from iCloud.
            if let bound = UserDefaults.standard.string(forKey: self.nonceKey), bound != nonce {
                call.reject("Another device's key cannot be written"); return
            }
            guard let store = self.store() else { call.resolve(["ok": false, "reason": "account"]); return }
            do {
                let compressed = try (raw as NSData).compressed(using: .zlib) as Data
                meta["bytes"] = compressed.count
                let record: [String: Any] = ["format": 1, "payload": compressed, "meta": meta]
                let data = try PropertyListSerialization.data(fromPropertyList: record, format: .binary, options: 0)
                let all = store.dictionaryRepresentation
                let backups = all.keys.filter { $0.hasPrefix("pp.b.") }
                let others = all.filter { $0.key != key }.reduce(0) { $0 + $1.key.utf8.count + self.byteCount($1.value) }
                guard !self.quotaExceeded, data.count <= self.keyLimit,
                      backups.count < 6 || all[key] != nil,
                      others + key.utf8.count + data.count <= self.totalLimit else {
                    call.resolve(["ok": false, "reason": "quota"]); return
                }
                if let old = self.envelope(all[key]), let oldMeta = old["meta"] as? [String: Any],
                   let oldSeq = oldMeta["seq"] as? Int, seq <= oldSeq {
                    call.reject("Stale device sequence"); return
                }
                UserDefaults.standard.set(nonce, forKey: self.nonceKey)
                store.set(data, forKey: key)
                store.synchronize() // Local acceptance; propagation to other devices is eventually consistent.
                call.resolve(["ok": true])
            } catch { call.reject("Backup compression failed") }
        }
    }
    @objc func remove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let key = call.getString("key"), self.parts(key) != nil, let store = self.store() else {
                call.resolve(); return
            }
            store.removeObject(forKey: key)
            self.quotaExceeded = false
            store.synchronize()
            call.resolve()
        }
    }
}
