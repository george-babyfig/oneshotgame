# In-App Events — owner drafts

One event per new Road, badge **Special Event**, and no festival events (decision 93). Drafts are prepared here; only the owner creates, schedules or submits events in App Store Connect.

- [Road 1 draft](in-app-events/road01.md): six languages, measured 30/50/120-character copy, pending name/date and art capture.
- Deep link: `cometgarden://road`, with cold `getLaunchUrl` and warm `appUrlOpen` delivery. Session 1 and unlocks are respected; gate and purchase flows stay intact.
- Art shows the free Road with Hide paid looks on: no paid lane, price, Buy button or countdown.
- Schedule only after the matching build is available. Events last at most 31 days and may be published at most 14 days early; a Road remains playable after its event ends.
- Owner uses the [release train](../docs/qa/release-train.md) and approves native-reviewed copy/media before creating store objects.

Limits checked 14 October 2026 against [Apple's App Store Connect help](https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events/). Re-check at scheduling time.
