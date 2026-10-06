# Comet Garden — launch compliance review

Draft for owner and counsel, 5 October 2026. Product facts are checked against `src/meta/tuning.ts` and `ios/App/PocketPlanet.storekit`; legal conclusions and storefront choices still require owner sign-off. Operator: **OWNER NAME (placeholder)**. Domain: **YOUR-DOMAIN (placeholder)**.

## Product and age-rating controls

The game has no account, ads, analytics, tracking or app-run server. Local progress and play history may be included in a device backup. The native StoreKit purchase journal holds verified transaction and product IDs on the device until a saved grant is acknowledged; it is not sent to an app-run server. Purchases, sharing, rating, reminders and Game Center access use the parental gate. Game Center 1.0 uses achievements only, has an off switch, and its dashboard is behind the gate. The age-rating draft in `store/compliance.md` says Contests: None and expects 4+; confirm the final App Store Connect questionnaire and test the native build before submission.

The twelve-product 1.0 catalogue is frozen for owner approval in `store/catalogue-sheet.md`. Seven permanent looks products use Family Sharing; four fixed gem packs and the Gem Piggy Bank are consumable and do not. All twelve have fixed contents and a Grown-ups-only checkout; the Cosmic Pass pays looks along the Road rather than currency or power. The three Theme/Pack samplers are earned from Wishes independently of purchase. The six App Store metadata languages need native review before entry. No product has been created in App Store Connect from this sheet.

## COPPA: retention and security

No child personal information is intentionally collected by the app. Progress, settings and the local play ledger remain on the device until the player uses Settings → Reset progress, Grown-ups → Clear play history, or deletes the app; device backups may retain copies under the device owner's backup settings. The operator cannot remotely delete an Apple-managed backup. Access to purchases and outbound sharing stays behind the gate. The release review should verify local save integrity, no network calls, no unintended data in share sheets, and appropriate protection of any support mailbox. Support emails are used only to answer the request, then deleted. If a message appears to come from a child, send one reply asking for a grown-up, then delete the message and avoid collecting further information. Counsel should confirm this process against COPPA's one-time-contact exception and document an operational deletion target before launch.

## Children's Code assessment (UK)

The default is the **Golden lane**: no account, tracking, profiling, geolocation or public profile; outbound actions require the gate. Review this against the ICO Children's Code's best-interests, high-privacy-default, data-minimisation and nudge standards. In particular:

| Mechanic             | Assessment and release check                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Golden lane default  | Keep privacy settings at their highest level by default. Game Center is opt-in and may be switched off. Verify that first launch exposes no external action or purchase prompt on the kid side.             |
| One-tap gem spending | Gems can be bought with money; a quick spend could hide the value of a premium currency. Verify a clear amount and effect before every gem spend, no accidental repeat taps, and no pressure copy.          |
| Piggy Bank           | Accumulated gems may create a loss or urgency cue. Show the exact current amount and cap; avoid countdowns, expiring claims, or copy implying earned progress is at risk. Purchase stays in the gated shop. |
| Continues            | Paid or gem-funded continuation after a setback can create pressure. Review the fail flow for a calm free path, visible cost and confirmation, with no punishment for declining.                            |

This is a design assessment, not a claim of legal compliance. Have UK counsel review the shipped flow and the data-protection impact assessment.

## Japan: prepaid payment instruments

For Japanese counsel: purchased gems are an in-game balance and may be treated as prepaid payment instruments under Japan's Payment Services Act. Confirm the classification, any unspent-balance reporting or deposit threshold, expiry/refund terms and required disclosures before enabling Japan IAPs. Do not infer that an App Store transaction alone settles these duties.

## US state app-store age laws

Owner and US counsel should monitor state app-store age-verification and parental-consent laws, including effective dates, litigation and platform implementation. Confirm whether Apple supplies any required age or consent signal and whether this app must change its gate or store availability. Record counsel's view before release; the current 4+ App Store rating is not itself a legal age-verification mechanism.

## Open owner checks

- Replace **OWNER NAME** and **YOUR-DOMAIN** in the published policy and site. Add a monitored support mailbox and App Review contact.
- Approve the support-email deletion target and incident/access procedure.
- Approve the UK Children's Code, COPPA, Japan and US-state-law assessments with counsel.
- Complete App Store Connect business setup, EU DSA trader declaration and storefront choices in `store/APP_STORE_CONNECT.md`.

## Primary references for counsel and App Store Connect review

- [FTC COPPA FAQ, including one-time response to a child's email](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [UK ICO Children's Code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/age-appropriate-design-a-code-of-practice-for-online-services/)
- [Apple Paid Applications Agreement setup](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
- [Apple Family Sharing for IAP](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases/)
- [Apple EU Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- [Japan Financial Services Agency guide for game companies and prepaid instruments](https://www.fsa.go.jp/common/about/pamphlet/game.pdf)
- [Apple age-assurance developer guidance for regional laws](https://developer.apple.com/support/age-assurance)
