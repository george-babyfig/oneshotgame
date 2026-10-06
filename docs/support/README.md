# Comet Garden support operations

This is the English source for the support lead to translate after the launch string freeze. Replace `support@YOUR-DOMAIN` with the monitored address before launch. The app has no accounts or game server; never ask for a password, payment information, a child's name, or a full save file.

## Mailbox routine

1. Check the support mailbox every business day, including its spam folder. Acknowledge or answer each adult message within **2 business days**. Assign an owner, record the received date, subject category, response due date, and resolution without copying personal message text into a tracker.
2. First triage: purchases/refunds, lost progress, access/gate, privacy or deletion, bugs. Use the short English replies in [replies.md](replies.md) and translate them for the sender's language once reviewed. Personalize only the steps that actually apply.
3. If a message appears to come from a child, use the one-time child reply in [replies.md](replies.md) solely to ask for a grown-up. Do not answer the substantive request, ask follow-up questions, subscribe the address, or retain the child's message. Delete the inbound message and your reply after that one contact, including trash. This is the COPPA one-time-contact routine.
4. Keep other support email and details **only as long as needed to answer**, then delete the conversation, including attachments and trash. This matches `site/privacy.html`. Do not put a support email or diagnostic code into analytics or a public issue.
5. Check Xcode Organizer crashes weekly after launch. Link a crash trend to support reports by app version and broad symptom only; the app sends no diagnostics to us.

## Diagnostic code

Only Grown-ups, after the parental gate, can see **Diagnostic code: XXXX-XXXX** and copy it. The adult may choose to paste it into an email. The app never transmits it. Eight Base32 characters encode the three-part app version (major 0–31, minor 0–31, patch 0–63) and up to three leading 8-bit prefixes of the most frequent local error hashes. `0` means an empty slot. Decode with `decodeDiagnosticCode()` in `src/meta/diagnostics.ts`; never try to reverse the hashes into a message. The code contains no stack, URL, player text, or name. It does not identify a device and is not a ticket ID. Ask the adult what happened and which screen they were on; do not ask a child for details.

## Escalation and hotfix

Escalate immediately to the engineering lead for lost or corrupted progress, paid looks disappearing, an incorrect purchase, a parental gate bypass, child-side prices or external links, accidental data transmission, or a repeatable crash that blocks play. Include the app version, broad reproduction steps, affected iOS versions, and the diagnostic code if the adult supplied it. Use a hotfix branch and expedited App Review when a verified release defect cannot wait for the next planned update. For an active purchase or child-safety defect, the release lead decides whether to pause the phased release or remove the app from sale while the fix is reviewed. Never promise a recovery, refund, or deployment date before verification; Apple decides refunds.

Reference checks: [FTC COPPA FAQ, one-time response](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [Apple refunds](https://support.apple.com/en-gb/118223), [Apple Ask to Buy](https://support.apple.com/en-lamr/105055), and [Apple purchase restore](https://support.apple.com/en-gb/108096). Recheck the Apple steps when the reply translations are approved.
