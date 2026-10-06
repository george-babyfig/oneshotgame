# Game Center setup

Comet Garden ships its own small Game Center plugin (`ios/App/App/GameCenterPlugin.swift`), registered by `MainViewController.swift` through `SceneDelegate.swift`. The Game Center entitlement is in `ios/App/App/App.entitlements`. On the web and on Android every call does nothing.

## In Xcode

1. Open the project, select the **App** target and go to _Signing & Capabilities_.
2. Check that **Game Center** is listed. If Xcode shows a warning, click **+ Capability**, add Game Center, and keep the existing entitlements file.

## In App Store Connect

Open your app, then _Services → Game Center_. For 1.0, create achievements only. Do not create leaderboards or enable ranking screens. Game Center is opt-in, can be switched off, and the dashboard requires the parental gate. The age-rating Contests answer is **None**.

### Achievements

32 achievements in total. The points add up to Apple's limit of 1000, and a test enforces that.

| ID                                         | Title                  | Points | Description draft                       |
| ------------------------------------------ | ---------------------- | ------ | --------------------------------------- |
| `com.pocketplanet.game.ach.first_planet`   | First World            | 10     | Complete your first planet.             |
| `com.pocketplanet.game.ach.planets_10`     | Planet Maker           | 20     | Complete 10 planets.                    |
| `com.pocketplanet.game.ach.planets_50`     | World Builder          | 40     | Complete 50 planets.                    |
| `com.pocketplanet.game.ach.planets_100`    | Galaxy Architect       | 80     | Complete 100 planets.                   |
| `com.pocketplanet.game.ach.first_creature` | Hello, Neighbor        | 10     | Discover your first creature.           |
| `com.pocketplanet.game.ach.lifebook_half`  | Field Naturalist       | 40     | Discover 18 creatures.                  |
| `com.pocketplanet.game.ach.lifebook_full`  | Every Critter          | 100    | Discover all 36 creatures.              |
| `com.pocketplanet.game.ach.legend`         | Living Legend          | 50     | Discover a legendary creature.          |
| `com.pocketplanet.game.ach.three_star_10`  | Perfectionist          | 30     | Earn three stars on 10 planets.         |
| `com.pocketplanet.game.ach.chapter_1`      | Chapter One            | 15     | Open the first chapter chest.           |
| `com.pocketplanet.game.ach.chapter_5`      | Star Voyager           | 50     | Open five chapter chests.               |
| `com.pocketplanet.game.ach.rank_5`         | Sky Sculptor           | 30     | Reach rank 5 or open chapter 4’s chest. |
| `com.pocketplanet.game.ach.rank_8`         | Cosmic Architect       | 60     | Reach rank 8 or open chapter 7’s chest. |
| `com.pocketplanet.game.ach.momentum_3`     | On a Roll              | 20     | Build a streak of three.                |
| `com.pocketplanet.game.ach.hard_10`        | Tough Worlds           | 40     | Complete 10 Hard planets.               |
| `com.pocketplanet.game.ach.rush_300`       | Meteor Master          | 30     | Score 300 in Meteor Rush.               |
| `com.pocketplanet.game.ach.daily_7`        | Daily Explorer         | 30     | Complete seven Daily Planets.           |
| `com.pocketplanet.game.ach.habitat_1`      | Home Sweet Home        | 20     | Build your first habitat.               |
| `com.pocketplanet.game.ach.habitat_all`    | Every Habitat          | 80     | Build all six habitats.                 |
| `com.pocketplanet.game.ach.memento_10`     | Keepsake Keeper        | 30     | Collect 10 mementos.                    |
| `com.pocketplanet.game.ach.challenge_win`  | Friendly Rival         | 20     | Beat a shared challenge score.          |
| `com.pocketplanet.game.ach.zen_100`        | Inner Peace            | 15     | Make 100 throws in Zen Garden.          |
| `com.pocketplanet.game.ach.voyage_1`       | Bon Voyage             | 15     | Complete a Weekly Voyage.               |
| `com.pocketplanet.game.ach.voyage_10`      | Seasoned Sailor        | 40     | Complete 10 Weekly Voyages.             |
| `com.pocketplanet.game.ach.festival_1`     | Party Planet           | 15     | Add a festival item to the album.       |
| `com.pocketplanet.game.ach.stickers_30`    | Sticker Star           | 25     | Collect 30 stickers.                    |
| `com.pocketplanet.game.ach.buddy_1`        | Best Buddies           | 10     | Choose a Buddy.                         |
| `com.pocketplanet.game.ach.remix_first`    | First Remix            | 10     | Complete a chapter in Bonus Remix.      |
| `com.pocketplanet.game.ach.remix_boss`     | Remix a Comet Guardian | 10     | Earn a star on a Bonus Remix guardian.  |
| `com.pocketplanet.game.ach.remix_gold_1`   | First Gold Frame       | 10     | Earn one gold Remix frame.              |
| `com.pocketplanet.game.ach.remix_gold_5`   | Five Gold Frames       | 15     | Earn five gold Remix frames.            |
| `com.pocketplanet.game.ach.remix_gold_10`  | Ten Gold Frames        | 30     | Earn 10 gold Remix frames.              |

The existing `rank_5` and `rank_8` IDs stay stable. Sky Sculptor is earned by opening chapter 4’s chest; Cosmic Architect by opening chapter 7’s chest. Update their App Store Connect descriptions to match.

The description column is English App Store Connect draft copy; add localized descriptions and achievement images before creating permanent items. The game reports each achievement once, when it is earned.
