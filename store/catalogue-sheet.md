# Frozen launch catalogue — owner approval sheet

Draft freeze, 6 October 2026. This sheet is the source for the twelve App Store Connect objects; owner approval is required before they are created. USD is the US fallback; StoreKit shows the local storefront price in the app. Family Sharing is enabled for the seven permanent looks products and disabled for the five consumables. Free Wish samplers are earned independently of purchase.

The Tidepool Theme includes the separately Wish-earned `sampler_tidepool`, Comet Candy includes `sampler_cometcandy`, and Crystal Frost includes `sampler_crystalfrost`. These are available free and are excluded from the purchased item IDs. Road 0 adds twenty kid-side gem-priced style singles: four rising 180/240/280/300-gem series across the suit, hat, launcher look and trail slots, plus four 300-gem Starfog looks. They total **5,200 gems** of optional looks and have no real-money Buy link.

## Products

| Product ID                              | Type          |    USD | Family Sharing | Fixed contents                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------- | -----: | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| com.pocketplanet.game.gems80            | Consumable    |  $0.99 | Off            | 80 gems                                                                                                                                                                                                                                                               |
| com.pocketplanet.game.gems500           | Consumable    |  $4.99 | Off            | 500 gems                                                                                                                                                                                                                                                              |
| com.pocketplanet.game.gems1200          | Consumable    |  $9.99 | Off            | 1,200 gems                                                                                                                                                                                                                                                            |
| com.pocketplanet.game.gems2800          | Consumable    | $19.99 | Off            | 2,800 gems                                                                                                                                                                                                                                                            |
| com.pocketplanet.game.piggy             | Consumable    |  $1.99 | Off            | The gems saved so far, up to 250                                                                                                                                                                                                                                      |
| com.pocketplanet.game.startercrew       | NonConsumable |  $2.99 | On             | Aurora atmosphere; Aurora Explorer suit; Aurora trail; Aurora Passport banner; Aurora hat; Aurora launcher look; Aurora Homeworld paint                                                                                                                               |
| com.pocketplanet.game.road00            | NonConsumable |  $3.99 | On             | Cosmic atmosphere; Golden Orbit launcher look; Halo Ring hat; Comet Tail trail; Star Captain suit; Gilded Homeworld ground paint; Liquid Gold Homeworld sea paint; Starfield photo frame; Gilded Passport banner; Star Captain title; Star Captain pose; Cosmic burst |
| com.pocketplanet.game.theme.tidepool    | NonConsumable |  $2.99 | On             | Six Tidepool Lab skins; Tidepool Den skin; Tidepool Greenhouse skin; Tidepool Launch Bay skin; Tidepool ground paint; Tidepool sea paint; Three Tidepool decoration skins; Two Tidepool friend outfits                                                                |
| com.pocketplanet.game.theme.cometcandy  | NonConsumable |  $2.99 | On             | Six Comet Candy Lab skins; Comet Candy Den skin; Comet Candy Greenhouse skin; Comet Candy Launch Bay skin; Comet Candy ground paint; Comet Candy sea paint; Three Comet Candy decoration skins; Two Comet Candy friend outfits                                        |
| com.pocketplanet.game.pack.crystalfrost | NonConsumable |  $2.99 | On             | Crystal Frost Keeper suit; Crystal Frost Keeper hat; Six Crystal Frost object trails; Six Crystal Frost object bursts; Crystal Frost Fusion style                                                                                                                     |
| com.pocketplanet.game.style.nebula      | NonConsumable |  $1.99 | On             | Nebula Swirl Supernova style; Nebula Swirl trail                                                                                                                                                                                                                      |
| com.pocketplanet.game.style.firefly     | NonConsumable |  $1.99 | On             | Firefly Sparks Supernova style; Firefly Sparks trail                                                                                                                                                                                                                  |

## Localized App Store Connect metadata

Six locales. Display names are at most 30 Unicode characters; descriptions are at most 45. Translations require native review before submission.

The names and descriptions below are the exact targets for the locale owner in `src/locales`. The StoreKit and App Store Connect values meet Apple’s 30-character name and 45-character description limits. Repeated English keys apply to both Theme products.

| Language | English key                                  | Required value                                               |
| -------- | -------------------------------------------- | ------------------------------------------------------------ |
| fr       | The gems saved so far, up to 250             | Gemmes gardées, jusqu’à 250                                  |
| es       | Seven Aurora looks for Keeper and Homeworld  | 7 looks Aurora: Guardián y Planeta Hogar                     |
| fr       | Seven Aurora looks for Keeper and Homeworld  | 7 looks Aurore: Gardien et Planète Mère                      |
| es       | 12 looks along the Cosmic Road paid lane     | 12 looks de pago del Camino Cósmico                          |
| fr       | 12 looks along the Cosmic Road paid lane     | 12 looks de la voie payante, Route Cosmique                  |
| es       | Homeworld paints, building skins and outfits | Pinturas, edificios y trajes: Planeta Hogar                  |
| fr       | Homeworld paints, building skins and outfits | Peintures, bâtiments, tenues: Planète Mère                   |
| es       | Keeper set, six trails and bursts, Fusion    | Guardián, 6 estelas, 6 destellos y Fusión                    |
| fr       | Keeper set, six trails and bursts, Fusion    | Gardien, 6 traînées, éclats et Fusion                        |
| es       | Nebula Supernova style and matching trail    | Supernova Espiral Nebular y estela                           |
| fr       | Nebula Supernova style and matching trail    | Supernova nébuleuse et traînée                               |
| es       | Style Single: Firefly Sparks                 | Estilo: Chispas de Luciérnaga                                |
| es       | Firefly Sparks Supernova and matching trail  | Supernova Chispas de Luciérnaga y estela                     |
| fr       | Style Single: Firefly Sparks                 | Style : Étincelles de lucioles                               |
| fr       | Firefly Sparks Supernova and matching trail  | Supernova Étincelles de lucioles et traînée                  |
| de       | Style Single: Firefly Sparks                 | Einzelstil: Glühwürmchenfunken                               |
| de       | Firefly Sparks Supernova and matching trail  | Glühwürmchenfunken-Supernova & passende Spur                 |
| pt       | Style Single: Firefly Sparks                 | Estilo: Faíscas de Vaga-Lume                                 |
| pt       | Firefly Sparks Supernova and matching trail  | Supernova e rastro Faíscas de Vaga-Lume                      |
| ja       | Style Single: Firefly Sparks                 | スタイル単品：ホタルのきらめき                               |
| ja       | Firefly Sparks Supernova and matching trail  | ホタルのきらめきのスーパーノヴァスタイルとおそろいのトレイル |

| Product ID                              | Locale | Display name                             | Description                                                  |
| --------------------------------------- | ------ | ---------------------------------------- | ------------------------------------------------------------ |
| com.pocketplanet.game.gems80            | en_US  | Handful of Gems                          | 80 gems                                                      |
| com.pocketplanet.game.gems80            | es_MX  | Puñado de Gemas                          | 80 gemas                                                     |
| com.pocketplanet.game.gems80            | fr_FR  | Poignée de gemmes                        | 80 gemmes                                                    |
| com.pocketplanet.game.gems80            | de_DE  | Handvoll Edelsteine                      | 80 Edelsteine                                                |
| com.pocketplanet.game.gems80            | pt_BR  | Punhado de Gemas                         | 80 gemas                                                     |
| com.pocketplanet.game.gems80            | ja_JP  | ひとつかみのジェム                       | 80ジェム                                                     |
| com.pocketplanet.game.gems500           | en_US  | Pouch of Gems                            | 500 gems                                                     |
| com.pocketplanet.game.gems500           | es_MX  | Bolsita de Gemas                         | 500 gemas                                                    |
| com.pocketplanet.game.gems500           | fr_FR  | Bourse de gemmes                         | 500 gemmes                                                   |
| com.pocketplanet.game.gems500           | de_DE  | Beutel voller Edelsteine                 | 500 Edelsteine                                               |
| com.pocketplanet.game.gems500           | pt_BR  | Bolsinha de Gemas                        | 500 gemas                                                    |
| com.pocketplanet.game.gems500           | ja_JP  | ジェムのふくろ                           | 500ジェム                                                    |
| com.pocketplanet.game.gems1200          | en_US  | Chest of Gems                            | 1,200 gems                                                   |
| com.pocketplanet.game.gems1200          | es_MX  | Cofre de Gemas                           | 1200 gemas                                                   |
| com.pocketplanet.game.gems1200          | fr_FR  | Coffre de gemmes                         | 1 200 gemmes                                                 |
| com.pocketplanet.game.gems1200          | de_DE  | Truhe voller Edelsteine                  | 1.200 Edelsteine                                             |
| com.pocketplanet.game.gems1200          | pt_BR  | Baú de Gemas                             | 1200 gemas                                                   |
| com.pocketplanet.game.gems1200          | ja_JP  | ジェムの宝箱                             | 1,200ジェム                                                  |
| com.pocketplanet.game.gems2800          | en_US  | Galaxy of Gems                           | 2,800 gems                                                   |
| com.pocketplanet.game.gems2800          | es_MX  | Galaxia de Gemas                         | 2800 gemas                                                   |
| com.pocketplanet.game.gems2800          | fr_FR  | Galaxie de gemmes                        | 2 800 gemmes                                                 |
| com.pocketplanet.game.gems2800          | de_DE  | Edelstein-Galaxie                        | 2.800 Edelsteine                                             |
| com.pocketplanet.game.gems2800          | pt_BR  | Galáxia de Gemas                         | 2800 gemas                                                   |
| com.pocketplanet.game.gems2800          | ja_JP  | ジェムの銀河                             | 2,800ジェム                                                  |
| com.pocketplanet.game.piggy             | en_US  | Gem Piggy Bank                           | The gems saved so far, up to 250                             |
| com.pocketplanet.game.piggy             | es_MX  | Alcancía de Gemas                        | Las gemas ahorradas hasta ahora, hasta 250                   |
| com.pocketplanet.game.piggy             | fr_FR  | Tirelire à gemmes                        | Gemmes gardées, jusqu’à 250                                  |
| com.pocketplanet.game.piggy             | de_DE  | Edelstein-Sparschwein                    | Die bisher gesparten Edelsteine, bis zu 250                  |
| com.pocketplanet.game.piggy             | pt_BR  | Cofrinho de Gemas                        | As gemas economizadas até agora, até 250                     |
| com.pocketplanet.game.piggy             | ja_JP  | ジェムちょきんばこ                       | 今までに保存したジェム、最大250                              |
| com.pocketplanet.game.startercrew       | en_US  | Starter Crew                             | Seven Aurora looks for Keeper and Homeworld                  |
| com.pocketplanet.game.startercrew       | es_MX  | Tripulación Iniciadora                   | 7 looks Aurora: Guardián y Planeta Hogar                     |
| com.pocketplanet.game.startercrew       | fr_FR  | Équipe de démarrage                      | 7 looks Aurore: Gardien et Planète Mère                      |
| com.pocketplanet.game.startercrew       | de_DE  | Startmannschaft                          | Sieben Aurora-Looks für Hüter und Heimatwelt                 |
| com.pocketplanet.game.startercrew       | pt_BR  | Tripulação Iniciante                     | Sete visuais Aurora para Guardião e Mundo-Lar                |
| com.pocketplanet.game.startercrew       | ja_JP  | スターターコース                         | キーパーとホームワールド用のオーロラのコーデ7点              |
| com.pocketplanet.game.road00            | en_US  | Cosmic Pass: Cosmic Road                 | 12 looks along the Cosmic Road paid lane                     |
| com.pocketplanet.game.road00            | es_MX  | Pase Cósmico: Camino Cósmico             | 12 looks de pago del Camino Cósmico                          |
| com.pocketplanet.game.road00            | fr_FR  | Pass Cosmique : Route Cosmique           | 12 looks de la voie payante, Route Cosmique                  |
| com.pocketplanet.game.road00            | de_DE  | Kosmos-Pass: Kosmische Straße            | 12 Pass-Looks entlang der Kosmischen Straße                  |
| com.pocketplanet.game.road00            | pt_BR  | Passe Cósmico: Estrada Cósmica           | 12 visuais na pista paga da Estrada Cósmica                  |
| com.pocketplanet.game.road00            | ja_JP  | コズミックパス：コズミックロード         | コズミックロードの有料レーンで手に入るコーデ12点             |
| com.pocketplanet.game.theme.tidepool    | en_US  | Homeworld Theme: Tidepool                | Homeworld paints, building skins and outfits                 |
| com.pocketplanet.game.theme.tidepool    | es_MX  | Tema de Hogar: Poza Marina               | Pinturas, edificios y trajes: Planeta Hogar                  |
| com.pocketplanet.game.theme.tidepool    | fr_FR  | Thème : Marée                            | Peintures, bâtiments, tenues: Planète Mère                   |
| com.pocketplanet.game.theme.tidepool    | de_DE  | Heimatwelt: Gezeitenbecken               | Heimatwelt-Farben, Gebäude-Looks und Outfits                 |
| com.pocketplanet.game.theme.tidepool    | pt_BR  | Tema do Mundo-Lar: Maré                  | Tintas, visuais de construções e roupas                      |
| com.pocketplanet.game.theme.tidepool    | ja_JP  | ホームワールドテーマ：タイドプール       | ホームワールドのペイント、建物スキン、友だちコーデ           |
| com.pocketplanet.game.theme.cometcandy  | en_US  | Homeworld Theme: Comet Candy             | Homeworld paints, building skins and outfits                 |
| com.pocketplanet.game.theme.cometcandy  | es_MX  | Tema de Hogar: Dulce Cometa              | Pinturas, edificios y trajes: Planeta Hogar                  |
| com.pocketplanet.game.theme.cometcandy  | fr_FR  | Thème : Bonbon Comète                    | Peintures, bâtiments, tenues: Planète Mère                   |
| com.pocketplanet.game.theme.cometcandy  | de_DE  | Heimatwelt: Kometenbonbon                | Heimatwelt-Farben, Gebäude-Looks und Outfits                 |
| com.pocketplanet.game.theme.cometcandy  | pt_BR  | Tema do Mundo-Lar: Doce Cometa           | Tintas, visuais de construções e roupas                      |
| com.pocketplanet.game.theme.cometcandy  | ja_JP  | ホームワールドテーマ：すいせいキャンディ | ホームワールドのペイント、建物スキン、友だちコーデ           |
| com.pocketplanet.game.pack.crystalfrost | en_US  | Planet Pack: Crystal Frost               | Keeper set, six trails and bursts, Fusion                    |
| com.pocketplanet.game.pack.crystalfrost | es_MX  | Pack Planeta: Cristal Helado             | Guardián, 6 estelas, 6 destellos y Fusión                    |
| com.pocketplanet.game.pack.crystalfrost | fr_FR  | Pack planète : Cristal givré             | Gardien, 6 traînées, éclats et Fusion                        |
| com.pocketplanet.game.pack.crystalfrost | de_DE  | Planetenpaket: Kristallfrost             | Hüter-Set, sechs Spuren und Funken, Fusion                   |
| com.pocketplanet.game.pack.crystalfrost | pt_BR  | Pacote: Geada Cristalina                 | Traje, chapéu, 6 rastros, 6 explosões e Fusão                |
| com.pocketplanet.game.pack.crystalfrost | ja_JP  | 惑星パック：クリスタルフロスト           | キーパーのセット、トレイルとバースト各6種、フュージョン      |
| com.pocketplanet.game.style.nebula      | en_US  | Style Single: Nebula Swirl               | Nebula Supernova style and matching trail                    |
| com.pocketplanet.game.style.nebula      | es_MX  | Estilo: Espiral Nebular                  | Supernova Espiral Nebular y estela                           |
| com.pocketplanet.game.style.nebula      | fr_FR  | Style : Tourbillon nébuleux              | Supernova nébuleuse et traînée                               |
| com.pocketplanet.game.style.nebula      | de_DE  | Einzelstil: Nebelwirbel                  | Nebelwirbel-Supernova-Stil und passende Spur                 |
| com.pocketplanet.game.style.nebula      | pt_BR  | Estilo: Redemoinho Nebular               | Supernova e rastro Redemoinho Nebular                        |
| com.pocketplanet.game.style.nebula      | ja_JP  | スタイル単品：星雲のうず                 | 星雲のうずのスーパーノヴァスタイルとおそろいのトレイル       |
| com.pocketplanet.game.style.firefly     | en_US  | Style Single: Firefly Sparks             | Firefly Sparks Supernova and matching trail                  |
| com.pocketplanet.game.style.firefly     | es_MX  | Estilo: Chispas de Luciérnaga            | Supernova Chispas de Luciérnaga y estela                     |
| com.pocketplanet.game.style.firefly     | fr_FR  | Style : Étincelles de lucioles           | Supernova Étincelles de lucioles et traînée                  |
| com.pocketplanet.game.style.firefly     | de_DE  | Einzelstil: Glühwürmchenfunken           | Glühwürmchenfunken-Supernova & passende Spur                 |
| com.pocketplanet.game.style.firefly     | pt_BR  | Estilo: Faíscas de Vaga-Lume             | Supernova e rastro Faíscas de Vaga-Lume                      |
| com.pocketplanet.game.style.firefly     | ja_JP  | スタイル単品：ホタルのきらめき           | ホタルのきらめきのスーパーノヴァスタイルとおそろいのトレイル |

## Owner sign-off

- [ ] Approve permanent IDs, contents, USD tiers and Family Sharing before creating IAPs.
- [ ] Have native speakers review all non-English names and descriptions.
- [ ] Capture one review image per product from the final build, then verify the image and this sheet agree.
