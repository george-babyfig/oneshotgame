# Road 1 In-App Event — owner draft only

Decision 93. No event has been created, scheduled or submitted. The Road's final name and opening date are pending owner input; “Road 1” is the draft name. The owner creates one event for this Road in App Store Connect after the build and copy are approved. No festival events.

## Copy draft

Native-speaker review is required before owner submission. Counts are Unicode characters (including spaces and punctuation), with limits name 30, short 50, long 120.

| Locale | Name (count/30) | Short (count/50)                                | Long (count/120)                                                                                             |
| ------ | --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| en-US  | Road 1 (6)      | Explore a new Road at your pace. (32)           | Earn new stars and complete Wishes along Road 1. Choose free looks for your journey, at your pace. (98)      |
| es-MX  | Camino 1 (8)    | Explora un nuevo Camino a tu ritmo. (35)        | Gana estrellas y cumple Deseos en el Camino 1. Elige estilos gratuitos para tu viaje, a tu ritmo. (97)       |
| fr-FR  | Route 1 (7)     | Explore une nouvelle Route à ton rythme. (40)   | Gagne des étoiles et réalise des Souhaits sur la Route 1. Choisis des styles gratuits pour ton voyage. (102) |
| de-DE  | Weg 1 (5)       | Entdecke einen neuen Weg in deinem Tempo. (41)  | Sammle Sterne und erfülle Wünsche auf Weg 1. Wähle kostenlose Looks für deine Reise, in deinem Tempo. (101)  |
| pt-BR  | Rota 1 (6)      | Explore uma nova Rota no seu ritmo. (35)        | Ganhe estrelas e realize Desejos na Rota 1. Escolha visuais gratuitos para sua viagem, no seu ritmo. (100)   |
| ja     | ロード1 (4)     | 自分のペースで、新しいロードを探検しよう。 (21) | ロード1で新しい星を集め、お願いをかなえよう。旅のための無料の見た目を、自分のペースで選べます。 (48)         |

## Owner scheduling and art

- Badge: **Special Event**. Reference name: `Road 1 introduction` (internal only).
- Deep link: `cometgarden://road`. It opens the play-earned Road only for a returning player with Road unlocked. Locked players land on Home quietly. Away, intro and stretch cards finish before queued navigation. Retained appUrlOpen delivers cold links; stale getLaunchUrl values are never replayed after a WebView reload. The first lesson, active rounds, parental gates and purchase sheets remain intact. It never opens a purchase or grants progress.
- Schedule: start on or after the owner-approved `opensOn` when the matching build is available. Choose an end no more than 31 days after the start; the Road itself remains playable afterward. Promotion may start at most 14 days before the event begins. A 56-day Road cannot use one 56-day event. Keep phased release enabled and check storefront/time-zone availability before promotion.
- Art brief (capture pending): capture the free Road lane with **Hide paid looks on**. Use free earned looks and actual game art. No paid lane, prices, Buy buttons, countdowns or paid-product claims. Capture event-card and detail media according to Apple's current specifications, then review in all six languages.
- Before creating the event: complete the release-train checklist, owner-approved catalogue sheet, native cold/warm URL smoke, gate/purchase safety and native review of this copy. The owner selects dates, uploads approved media and creates/schedules/submits the event. This file is a draft, not authorization to create store objects.

Apple limits verified **14 October 2026**: [App Store Connect — Offer In-App Events](https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events/) confirms 30/50/120-character metadata, a maximum 31-day duration and publishing up to 14 days early. [Apple In-App Events](https://developer.apple.com/app-store/in-app-events/) describes media and the Special Event badge. Re-check both before scheduling.
