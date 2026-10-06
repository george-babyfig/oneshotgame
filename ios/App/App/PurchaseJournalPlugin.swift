import Capacitor
import Foundation
import StoreKit

/// Captures StoreKit transactions before the web view, or another plugin, can finish them.
/// The journal survives termination; JavaScript removes entries only after its profile save.
@MainActor
final class PurchaseJournal {
    static let shared = PurchaseJournal()
    private let key = "verifiedPurchaseJournal.v1"
    private let limit = 4096
    private var started = false
    private var updatesTask: Task<Void, Never>?
    var onQueued: (() -> Void)?

    func start() {
        guard !started else { return }
        started = true
        updatesTask = Task {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result { append(transaction) }
            }
        }
        Task { await collectUnfinished() }
    }

    func collectUnfinished() async {
        for await result in Transaction.unfinished {
            if case .verified(let transaction) = result { append(transaction) }
        }
    }

    private func records() -> [[String: Any]] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
        return decoded
    }

    private func persist(_ records: [[String: Any]]) {
        guard let data = try? JSONSerialization.data(withJSONObject: records) else { return }
        UserDefaults.standard.set(data, forKey: key)
        UserDefaults.standard.synchronize()
    }

    func append(_ tx: Transaction) {
        var saved = records()
        let id = String(tx.id)
        guard !saved.contains(where: { $0["transactionId"] as? String == id }) else { return }
        // Never discard an unacknowledged purchase to make room for a new one.
        guard saved.count < limit else { return }
        saved.append([
            "transactionId": id,
            "originalTransactionId": String(tx.originalID),
            "productId": tx.productID,
            "purchaseDate": tx.purchaseDate.timeIntervalSince1970 * 1000,
            "revocationDate": tx.revocationDate.map { $0.timeIntervalSince1970 * 1000 } ?? NSNull(),
            "ownershipType": tx.ownershipType == .familyShared ? "familyShared" : "purchased"
        ])
        persist(saved)
        onQueued?()
    }

    func drain() async -> [[String: Any]] {
        await collectUnfinished()
        return records()
    }

    func ack(_ ids: Set<String>) async {
        let saved = records()
        let acknowledged = Set(saved.compactMap { $0["transactionId"] as? String }).intersection(ids)
        guard !acknowledged.isEmpty else { return }
        // Remove only records the caller persisted. A crash before this line replays safely.
        persist(saved.filter { !acknowledged.contains($0["transactionId"] as? String ?? "") })
        for await result in Transaction.unfinished {
            if case .verified(let tx) = result, acknowledged.contains(String(tx.id)) {
                await tx.finish()
            }
        }
        await collectUnfinished() // Refill the bounded journal if it had reached capacity.
    }
}

@objc(PurchaseJournalPlugin)
public class PurchaseJournalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurchaseJournalPlugin"
    public let jsName = "PurchaseJournal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "drain", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transactions", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        super.load()
        Task { @MainActor in
            PurchaseJournal.shared.onQueued = { [weak self] in
                self?.notifyListeners("queued", data: [:], retainUntilConsumed: true)
            }
            PurchaseJournal.shared.start()
        }
    }

    @objc func drain(_ call: CAPPluginCall) {
        Task { @MainActor in
            let records = await PurchaseJournal.shared.drain()
            call.resolve(["records": records])
        }
    }

    @objc func ack(_ call: CAPPluginCall) {
        let ids = Set(call.getArray("ids", String.self) ?? [])
        Task { @MainActor in
            await PurchaseJournal.shared.ack(ids)
            call.resolve()
        }
    }

    @objc func prices(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task { @MainActor in
            do {
                let products = try await Product.products(for: ids)
                let prices: [[String: Any]] = products.map { product in
                    ["id": product.id, "display": product.displayPrice,
                     "currency": product.priceFormatStyle.currencyCode,
                     "amount": NSDecimalNumber(decimal: product.price).doubleValue]
                }
                call.resolve(["prices": prices])
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else { call.reject("Missing product ID"); return }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Product unavailable")
                    return
                }
                switch try await product.purchase() {
                case .success(.verified(let tx)):
                    PurchaseJournal.shared.append(tx) // Durable before JavaScript sees success.
                    call.resolve(["ok": true, "txId": String(tx.id), "productId": tx.productID])
                case .success(.unverified(_, let error)):
                    call.reject(error.localizedDescription)
                case .pending:
                    call.resolve(["ok": false, "pending": true])
                case .userCancelled:
                    call.resolve(["ok": false, "cancelled": true])
                @unknown default:
                    call.reject("Unknown StoreKit result")
                }
            } catch { call.reject(error.localizedDescription) }
        }
    }

    private func ownedIds() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let tx) = result, tx.revocationDate == nil { ids.append(tx.productID) }
        }
        return ids
    }

    @objc func owned(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(["ids": await ownedIds()]) }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()
                call.resolve(["ids": await ownedIds()])
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func transactions(_ call: CAPPluginCall) {
        Task { @MainActor in
            var records: [[String: Any]] = []
            for await result in Transaction.all {
                if case .verified(let tx) = result {
                    records.append([
                        "transactionId": String(tx.id),
                        "originalTransactionId": String(tx.originalID),
                        "productId": tx.productID,
                        "purchaseDate": tx.purchaseDate.timeIntervalSince1970 * 1000,
                        "revocationDate": tx.revocationDate.map { $0.timeIntervalSince1970 * 1000 } ?? NSNull(),
                        "ownershipType": tx.ownershipType == .familyShared ? "familyShared" : "purchased"
                    ])
                }
            }
            call.resolve(["records": records])
        }
    }
}
