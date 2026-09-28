# Game Center setup

Pocket Planet ships its own small Game Center plugin (`ios/App/App/GameCenterPlugin.swift`), registered by `MainViewController.swift`. The Game Center entitlement is in `ios/App/App/App.entitlements`. On the web and on Android every call does nothing.

## In Xcode

1. Open the project, select the **App** target and go to _Signing & Capabilities_.
2. Check that **Game Center** is listed. If Xcode shows a warning, click **+ Capability**, add Game Center, and keep the existing entitlements file.

## In App Store Connect

Open your app, then _Services → Game Center_. Create these leaderboards and achievements with the exact IDs below.

### Leaderboards

| ID                               | Name                    | Type                        | Sort        |
| -------------------------------- | ----------------------- | --------------------------- | ----------- |
| `com.pocketplanet.game.lb.stars` | Total Stars             | Classic                     | High to low |
| `com.pocketplanet.game.lb.life`  | Most Life on One Planet | Classic                     | High to low |
| `com.pocketplanet.game.lb.rush`  | Meteor Rush             | Classic                     | High to low |
| `com.pocketplanet.game.lb.daily` | Daily Planet            | Recurring, resets every day | High to low |

### Achievements

27 achievements in total. The points add up to under Apple's limit of 1000, and a test enforces that.

| ID                                         | Title            | Points |
| ------------------------------------------ | ---------------- | ------ |
| `com.pocketplanet.game.ach.first_planet`   | First World      | 10     |
| `com.pocketplanet.game.ach.planets_10`     | Planet Maker     | 20     |
| `com.pocketplanet.game.ach.planets_50`     | World Builder    | 40     |
| `com.pocketplanet.game.ach.planets_100`    | Galaxy Architect | 80     |
| `com.pocketplanet.game.ach.first_creature` | Hello, Neighbor  | 10     |
| `com.pocketplanet.game.ach.lifebook_half`  | Field Naturalist | 40     |
| `com.pocketplanet.game.ach.lifebook_full`  | Every Critter    | 100    |
| `com.pocketplanet.game.ach.legend`         | Living Legend    | 50     |
| `com.pocketplanet.game.ach.three_star_10`  | Perfectionist    | 30     |
| `com.pocketplanet.game.ach.chapter_1`      | Chapter One      | 15     |
| `com.pocketplanet.game.ach.chapter_5`      | Star Voyager     | 50     |
| `com.pocketplanet.game.ach.rank_5`         | Sky Sculptor     | 30     |
| `com.pocketplanet.game.ach.rank_8`         | Cosmic Architect | 60     |
| `com.pocketplanet.game.ach.momentum_3`     | On a Roll        | 20     |
| `com.pocketplanet.game.ach.hard_10`        | Tough Worlds     | 40     |
| `com.pocketplanet.game.ach.rush_300`       | Meteor Master    | 30     |
| `com.pocketplanet.game.ach.daily_7`        | Daily Explorer   | 30     |
| `com.pocketplanet.game.ach.habitat_1`      | Home Sweet Home  | 20     |
| `com.pocketplanet.game.ach.habitat_all`    | Every Habitat    | 80     |
| `com.pocketplanet.game.ach.memento_10`     | Keepsake Keeper  | 30     |
| `com.pocketplanet.game.ach.challenge_win`  | Friendly Rival   | 20     |
| `com.pocketplanet.game.ach.zen_100`        | Inner Peace      | 15     |
| `com.pocketplanet.game.ach.voyage_1`       | Bon Voyage       | 15     |
| `com.pocketplanet.game.ach.voyage_10`      | Seasoned Sailor  | 40     |
| `com.pocketplanet.game.ach.festival_1`     | Party Planet     | 15     |
| `com.pocketplanet.game.ach.stickers_30`    | Sticker Star     | 25     |
| `com.pocketplanet.game.ach.buddy_1`        | Best Buddies     | 10     |

Achievement descriptions and images are entered in App Store Connect. The game reports each achievement once, when it is earned.
