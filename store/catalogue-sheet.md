# Frozen catalogue — M14 — owner approval sheet

Draft freeze, 14 October 2026. Road 1 names and contents are proposed for owner approval. This sheet is the source for the fifteen App Store Connect objects; owner approval is required before they are created. USD is the US fallback; StoreKit shows the local storefront price in the app. Family Sharing is enabled for the ten permanent looks products and disabled for the five consumables. Free Wish samplers are earned independently of purchase.

The Tidepool Theme includes the separately Wish-earned `sampler_tidepool`, Comet Candy includes `sampler_cometcandy`, and Crystal Frost includes `sampler_crystalfrost`. These are available free and are excluded from the purchased item IDs. Road 0 adds twenty kid-side gem-priced style singles: four rising 180/240/280/300-gem series across the suit, hat, launcher look and trail slots, plus four 300-gem Starfog looks. They total **5,200 gems** of optional looks and have no real-money Buy link.

## Products

| Product ID                               | Type          |    USD | Family Sharing | Fixed contents                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------- | -----: | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| com.pocketplanet.game.gems80             | Consumable    |  $0.99 | Off            | 80 gems                                                                                                                                                                                                                                                                                                                                                                                  |
| com.pocketplanet.game.gems500            | Consumable    |  $4.99 | Off            | 500 gems                                                                                                                                                                                                                                                                                                                                                                                 |
| com.pocketplanet.game.gems1200           | Consumable    |  $9.99 | Off            | 1,200 gems                                                                                                                                                                                                                                                                                                                                                                               |
| com.pocketplanet.game.gems2800           | Consumable    | $19.99 | Off            | 2,800 gems                                                                                                                                                                                                                                                                                                                                                                               |
| com.pocketplanet.game.piggy              | Consumable    |  $1.99 | Off            | The gems saved so far, up to 250                                                                                                                                                                                                                                                                                                                                                         |
| com.pocketplanet.game.startercrew        | NonConsumable |  $2.99 | On             | Aurora atmosphere; Aurora Explorer suit; Aurora trail; Aurora Passport banner; Aurora hat; Aurora launcher look; Aurora Homeworld paint                                                                                                                                                                                                                                                  |
| com.pocketplanet.game.road00             | NonConsumable |  $3.99 | On             | Cosmic atmosphere; Golden Orbit launcher look; Halo Ring hat; Comet Tail trail; Star Captain suit; Gilded Homeworld ground paint; Liquid Gold Homeworld sea paint; Starfield photo frame; Gilded Passport banner; Star Captain title; Star Captain pose; Cosmic burst                                                                                                                    |
| com.pocketplanet.game.theme.tidepool     | NonConsumable |  $2.99 | On             | Six Tidepool Lab skins; Tidepool Den skin; Tidepool Greenhouse skin; Tidepool Launch Bay skin; Tidepool ground paint; Tidepool sea paint; Three Tidepool decoration skins; Two Tidepool friend outfits                                                                                                                                                                                   |
| com.pocketplanet.game.theme.cometcandy   | NonConsumable |  $2.99 | On             | Six Comet Candy Lab skins; Comet Candy Den skin; Comet Candy Greenhouse skin; Comet Candy Launch Bay skin; Comet Candy ground paint; Comet Candy sea paint; Three Comet Candy decoration skins; Two Comet Candy friend outfits                                                                                                                                                           |
| com.pocketplanet.game.pack.crystalfrost  | NonConsumable |  $2.99 | On             | Crystal Frost Keeper suit; Crystal Frost crown; Six Crystal Frost object trails; Six Crystal Frost object bursts; Crystal Frost Fusion style                                                                                                                                                                                                                                             |
| com.pocketplanet.game.style.nebula       | NonConsumable |  $1.99 | On             | Nebula Swirl Supernova style; Nebula Swirl trail                                                                                                                                                                                                                                                                                                                                         |
| com.pocketplanet.game.style.firefly      | NonConsumable |  $1.99 | On             | Firefly Sparks Supernova style; Firefly Sparks trail                                                                                                                                                                                                                                                                                                                                     |
| com.pocketplanet.game.road01             | NonConsumable |  $3.99 | On             | Moonpetal atmosphere; Moonpetal launcher look; Moonpetal ground paint; Moonpetal sea paint; Moonpetal folded hat; Moonpetal Passport banner; Moonpetal lantern; Moonpetal ribbon trail; Moonpetal Keeper suit; Moonpetal friend outfit; Moonpetal friend scarf; Moonpetal seed burst                                                                                                     |
| com.pocketplanet.game.theme.papergarden  | NonConsumable |  $2.99 | On             | Paper Garden Rock Lab; Paper Garden Ice Lab; Paper Garden Magma Lab; Paper Garden Seed Lab; Paper Garden Rain Lab; Paper Garden Sun Lab; Paper Garden Den; Paper Garden Greenhouse; Paper Garden Launch Bay; Paper Garden ground paint; Paper Garden sea paint; Paper Garden flowers; Paper Garden fountain; Paper Garden lantern; Paper Garden friend outfit; Paper Garden friend scarf |
| com.pocketplanet.game.style.crescentlace | NonConsumable |  $1.99 | On             | Crescent Lace Supernova style; Crescent Lace trail                                                                                                                                                                                                                                                                                                                                       |

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

| Product ID                               | Locale | Display name                             | Description                                                  |
| ---------------------------------------- | ------ | ---------------------------------------- | ------------------------------------------------------------ |
| com.pocketplanet.game.gems80             | en_US  | Handful of Gems                          | 80 gems                                                      |
| com.pocketplanet.game.gems80             | es_MX  | Puñado de Gemas                          | 80 gemas                                                     |
| com.pocketplanet.game.gems80             | fr_FR  | Poignée de gemmes                        | 80 gemmes                                                    |
| com.pocketplanet.game.gems80             | de_DE  | Handvoll Edelsteine                      | 80 Edelsteine                                                |
| com.pocketplanet.game.gems80             | pt_BR  | Punhado de Gemas                         | 80 gemas                                                     |
| com.pocketplanet.game.gems80             | ja_JP  | ひとつかみのジェム                       | 80ジェム                                                     |
| com.pocketplanet.game.gems500            | en_US  | Pouch of Gems                            | 500 gems                                                     |
| com.pocketplanet.game.gems500            | es_MX  | Bolsita de Gemas                         | 500 gemas                                                    |
| com.pocketplanet.game.gems500            | fr_FR  | Bourse de gemmes                         | 500 gemmes                                                   |
| com.pocketplanet.game.gems500            | de_DE  | Beutel voller Edelsteine                 | 500 Edelsteine                                               |
| com.pocketplanet.game.gems500            | pt_BR  | Bolsinha de Gemas                        | 500 gemas                                                    |
| com.pocketplanet.game.gems500            | ja_JP  | ジェムのふくろ                           | 500ジェム                                                    |
| com.pocketplanet.game.gems1200           | en_US  | Chest of Gems                            | 1,200 gems                                                   |
| com.pocketplanet.game.gems1200           | es_MX  | Cofre de Gemas                           | 1200 gemas                                                   |
| com.pocketplanet.game.gems1200           | fr_FR  | Coffre de gemmes                         | 1 200 gemmes                                                 |
| com.pocketplanet.game.gems1200           | de_DE  | Truhe voller Edelsteine                  | 1.200 Edelsteine                                             |
| com.pocketplanet.game.gems1200           | pt_BR  | Baú de Gemas                             | 1200 gemas                                                   |
| com.pocketplanet.game.gems1200           | ja_JP  | ジェムの宝箱                             | 1,200ジェム                                                  |
| com.pocketplanet.game.gems2800           | en_US  | Galaxy of Gems                           | 2,800 gems                                                   |
| com.pocketplanet.game.gems2800           | es_MX  | Galaxia de Gemas                         | 2800 gemas                                                   |
| com.pocketplanet.game.gems2800           | fr_FR  | Galaxie de gemmes                        | 2 800 gemmes                                                 |
| com.pocketplanet.game.gems2800           | de_DE  | Edelstein-Galaxie                        | 2.800 Edelsteine                                             |
| com.pocketplanet.game.gems2800           | pt_BR  | Galáxia de Gemas                         | 2800 gemas                                                   |
| com.pocketplanet.game.gems2800           | ja_JP  | ジェムの銀河                             | 2,800ジェム                                                  |
| com.pocketplanet.game.piggy              | en_US  | Gem Piggy Bank                           | The gems saved so far, up to 250                             |
| com.pocketplanet.game.piggy              | es_MX  | Alcancía de Gemas                        | Las gemas ahorradas hasta ahora, hasta 250                   |
| com.pocketplanet.game.piggy              | fr_FR  | Tirelire à gemmes                        | Gemmes gardées, jusqu’à 250                                  |
| com.pocketplanet.game.piggy              | de_DE  | Edelstein-Sparschwein                    | Die bisher gesparten Edelsteine, bis zu 250                  |
| com.pocketplanet.game.piggy              | pt_BR  | Cofrinho de Gemas                        | As gemas economizadas até agora, até 250                     |
| com.pocketplanet.game.piggy              | ja_JP  | ジェムちょきんばこ                       | 今までに保存したジェム、最大250                              |
| com.pocketplanet.game.startercrew        | en_US  | Starter Crew                             | Seven Aurora looks for Keeper and Homeworld                  |
| com.pocketplanet.game.startercrew        | es_MX  | Tripulación Iniciadora                   | 7 looks Aurora: Guardián y Planeta Hogar                     |
| com.pocketplanet.game.startercrew        | fr_FR  | Équipe de démarrage                      | 7 looks Aurore: Gardien et Planète Mère                      |
| com.pocketplanet.game.startercrew        | de_DE  | Startmannschaft                          | Sieben Aurora-Looks für Hüter und Heimatwelt                 |
| com.pocketplanet.game.startercrew        | pt_BR  | Tripulação Iniciante                     | Sete visuais Aurora para Guardião e Mundo-Lar                |
| com.pocketplanet.game.startercrew        | ja_JP  | スターターコース                         | キーパーとホームワールド用のオーロラのコーデ7点              |
| com.pocketplanet.game.road00             | en_US  | Cosmic Pass: Cosmic Road                 | 12 looks along the Cosmic Road paid lane                     |
| com.pocketplanet.game.road00             | es_MX  | Pase Cósmico: Camino Cósmico             | 12 looks de pago del Camino Cósmico                          |
| com.pocketplanet.game.road00             | fr_FR  | Pass Cosmique : Route Cosmique           | 12 looks de la voie payante, Route Cosmique                  |
| com.pocketplanet.game.road00             | de_DE  | Kosmos-Pass: Kosmische Straße            | 12 Pass-Looks entlang der Kosmischen Straße                  |
| com.pocketplanet.game.road00             | pt_BR  | Passe Cósmico: Estrada Cósmica           | 12 visuais na pista paga da Estrada Cósmica                  |
| com.pocketplanet.game.road00             | ja_JP  | コズミックパス：コズミックロード         | コズミックロードの有料レーンで手に入るコーデ12点             |
| com.pocketplanet.game.theme.tidepool     | en_US  | Homeworld Theme: Tidepool                | Homeworld paints, building skins and outfits                 |
| com.pocketplanet.game.theme.tidepool     | es_MX  | Planeta Hogar: Poza Marina               | Pinturas, edificios y trajes: Planeta Hogar                  |
| com.pocketplanet.game.theme.tidepool     | fr_FR  | Planète Mère : Marée                     | Peintures, bâtiments, tenues: Planète Mère                   |
| com.pocketplanet.game.theme.tidepool     | de_DE  | Heimatwelt: Gezeitenbecken               | Heimatwelt-Farben, Gebäude-Looks und Outfits                 |
| com.pocketplanet.game.theme.tidepool     | pt_BR  | Tema do Mundo-Lar: Maré                  | Tintas, visuais de construções e roupas                      |
| com.pocketplanet.game.theme.tidepool     | ja_JP  | ホームワールドテーマ：タイドプール       | ホームワールドのペイント、建物スキン、友だちコーデ           |
| com.pocketplanet.game.theme.cometcandy   | en_US  | Homeworld Theme: Comet Candy             | Homeworld paints, building skins and outfits                 |
| com.pocketplanet.game.theme.cometcandy   | es_MX  | Planeta Hogar: Dulce Cometa              | Pinturas, edificios y trajes: Planeta Hogar                  |
| com.pocketplanet.game.theme.cometcandy   | fr_FR  | Planète Mère : Bonbon Comète             | Peintures, bâtiments, tenues: Planète Mère                   |
| com.pocketplanet.game.theme.cometcandy   | de_DE  | Heimatwelt: Kometenbonbon                | Heimatwelt-Farben, Gebäude-Looks und Outfits                 |
| com.pocketplanet.game.theme.cometcandy   | pt_BR  | Tema do Mundo-Lar: Doce Cometa           | Tintas, visuais de construções e roupas                      |
| com.pocketplanet.game.theme.cometcandy   | ja_JP  | ホームワールドテーマ：すいせいキャンディ | ホームワールドのペイント、建物スキン、友だちコーデ           |
| com.pocketplanet.game.pack.crystalfrost  | en_US  | Planet Pack: Crystal Frost               | Keeper set, six trails and bursts, Fusion                    |
| com.pocketplanet.game.pack.crystalfrost  | es_MX  | Pack Planeta: Cristal Helado             | Guardián, 6 estelas, 6 destellos y Fusión                    |
| com.pocketplanet.game.pack.crystalfrost  | fr_FR  | Pack planète : Cristal givré             | Gardien, 6 traînées, éclats et Fusion                        |
| com.pocketplanet.game.pack.crystalfrost  | de_DE  | Planetenpaket: Kristallfrost             | Hüter-Set, sechs Spuren und Funken, Fusion                   |
| com.pocketplanet.game.pack.crystalfrost  | pt_BR  | Pacote: Geada Cristalina                 | Traje, chapéu, 6 rastros, 6 explosões e Fusão                |
| com.pocketplanet.game.pack.crystalfrost  | ja_JP  | 惑星パック：クリスタルフロスト           | キーパーのセット、トレイルとバースト各6種、フュージョン      |
| com.pocketplanet.game.style.nebula       | en_US  | Style Single: Nebula Swirl               | Nebula Supernova style and matching trail                    |
| com.pocketplanet.game.style.nebula       | es_MX  | Estilo: Espiral Nebular                  | Supernova Espiral Nebular y estela                           |
| com.pocketplanet.game.style.nebula       | fr_FR  | Style : Tourbillon nébuleux              | Supernova nébuleuse et traînée                               |
| com.pocketplanet.game.style.nebula       | de_DE  | Einzelstil: Nebelwirbel                  | Nebelwirbel-Supernova-Stil und passende Spur                 |
| com.pocketplanet.game.style.nebula       | pt_BR  | Estilo: Redemoinho Nebular               | Supernova e rastro Redemoinho Nebular                        |
| com.pocketplanet.game.style.nebula       | ja_JP  | スタイル単品：星雲のうず                 | 星雲のうずのスーパーノヴァスタイルとおそろいのトレイル       |
| com.pocketplanet.game.style.firefly      | en_US  | Style Single: Firefly Sparks             | Firefly Sparks Supernova and matching trail                  |
| com.pocketplanet.game.style.firefly      | es_MX  | Estilo: Chispas de Luciérnaga            | Supernova Chispas de Luciérnaga y estela                     |
| com.pocketplanet.game.style.firefly      | fr_FR  | Style : Étincelles de lucioles           | Supernova Étincelles de lucioles et traînée                  |
| com.pocketplanet.game.style.firefly      | de_DE  | Einzelstil: Glühwürmchenfunken           | Glühwürmchenfunken-Supernova & passende Spur                 |
| com.pocketplanet.game.style.firefly      | pt_BR  | Estilo: Faíscas de Vaga-Lume             | Supernova e rastro Faíscas de Vaga-Lume                      |
| com.pocketplanet.game.style.firefly      | ja_JP  | スタイル単品：ホタルのきらめき           | ホタルのきらめきのスーパーノヴァスタイルとおそろいのトレイル |
| com.pocketplanet.game.road01             | en_US  | Cosmic Pass: Moonpetal                   | 12 looks along the Moonpetal paid lane                       |
| com.pocketplanet.game.road01             | es_MX  | Pase Cósmico: Pétalo Lunar               | 12 looks de pago del Camino Pétalo Lunar                     |
| com.pocketplanet.game.road01             | fr_FR  | Pass Cosmique : Pétale-de-Lune           | 12 looks de la voie payante, Pétale-de-Lune                  |
| com.pocketplanet.game.road01             | de_DE  | Kosmos-Pass: Mondblütenblatt             | 12 Pass-Looks auf der Mondblütenblatt-Straße                 |
| com.pocketplanet.game.road01             | pt_BR  | Passe Cósmico: Pétala-da-Lua             | 12 visuais na pista paga da Pétala-da-Lua                    |
| com.pocketplanet.game.road01             | ja_JP  | コズミックパス：つきのはなびら           | つきのはなびらロードの有料レーンで手に入るコーデ12点         |
| com.pocketplanet.game.theme.papergarden  | en_US  | Homeworld Theme: Paper Garden            | Paper Garden paints, skins and friend outfits                |
| com.pocketplanet.game.theme.papergarden  | es_MX  | Planeta Hogar: Jardín de Papel           | Pinturas, aspectos y ropa: Jardín de Papel                   |
| com.pocketplanet.game.theme.papergarden  | fr_FR  | Planète Mère : Jardin origami            | Peintures, bâtiments, tenues : Jardin origami                |
| com.pocketplanet.game.theme.papergarden  | de_DE  | Heimatwelt: Papiergarten                 | Papiergarten-Farben, -Looks und -Outfits                     |
| com.pocketplanet.game.theme.papergarden  | pt_BR  | Mundo-Lar: Jardim de Papel               | Tintas, visuais e roupas do Jardim de Papel                  |
| com.pocketplanet.game.theme.papergarden  | ja_JP  | ホームワールドテーマ：おりがみのお庭     | おりがみのお庭のペイント、スキン、友だちコーデ               |
| com.pocketplanet.game.style.crescentlace | en_US  | Style Single: Crescent Lace              | Crescent Lace Supernova and matching trail                   |
| com.pocketplanet.game.style.crescentlace | es_MX  | Estilo: Encaje Media Luna                | Supernova Encaje Media Luna y estela                         |
| com.pocketplanet.game.style.crescentlace | fr_FR  | Style : Dentelle lunaire                 | Supernova Dentelle lunaire et traînée                        |
| com.pocketplanet.game.style.crescentlace | de_DE  | Einzelstil: Halbmondspitzen              | Halbmondspitzen-Supernova und passende Spur                  |
| com.pocketplanet.game.style.crescentlace | pt_BR  | Estilo: Renda Meia-Lua                   | Supernova e rastro Renda Meia-Lua                            |
| com.pocketplanet.game.style.crescentlace | ja_JP  | スタイル単品：みかづきレース             | みかづきレースのスーパーノヴァスタイルとおそろいのトレイル   |

## Owner sign-off

- [ ] Approve permanent IDs, contents, USD tiers and Family Sharing before creating IAPs.
- [ ] Have native speakers review all non-English names and descriptions.
- [ ] Capture one review image per product from the final build, then verify the image and this sheet agree.

## Road 1 contents freeze (decision 49 / 50)

Owner approval pending. No App Store Connect objects or submissions are authorized by this draft. Opening date is unpinned until the owner gives the launch date (decision 81). Existing Road 0 contents and gem sinks are unchanged.

Road name candidates: Moonpetal (working name), Paper Moon, Petal Path. The lead measures and approves all six translations before any permanent metadata is created; French and Portuguese Road names must be at most 14 characters.

### Free lane

20 steps of 10 points; 150 gems, 12,850 stardust, 17 boosters, seven looks. Step 20 pays 1,000 stardust and the Moonpetal Road sticker; no free title.

| Step | Free fixed contents                            | Pass fixed contents                           |
| ---- | ---------------------------------------------- | --------------------------------------------- |
| 1    | 10 gems                                        | Moonpetal atmosphere; Moonpetal launcher look |
| 2    | 2 shower; 10 gems                              | Moonpetal ground paint                        |
| 3    | 400 stardust                                   | Moonpetal sea paint                           |
| 4    | Petal Path ground paint; 10 gems               | Moonpetal folded hat                          |
| 5    | 10 gems                                        | Moonpetal Passport banner                     |
| 6    | 2 spark; 2 scope; Petal Twig launcher look     | —                                             |
| 7    | 1,200 stardust                                 | Moonpetal lantern                             |
| 8    | Paper Daisy flowers; 10 gems                   | Moonpetal ribbon trail                        |
| 9    | 10 gems                                        | Moonpetal Keeper suit                         |
| 10   | 3 shower; 3 spark; 3 scope; Petal Thread trail | —                                             |
| 11   | 3,000 stardust                                 | Moonpetal friend outfit                       |
| 12   | Petal Scout suit; 15 gems                      | Moonpetal friend scarf                        |
| 13   | 20 gems; Paper Daisy burst                     | —                                             |
| 14   | 6,000 stardust; 15 gems; Petal Clip hat        | —                                             |
| 15   | 40 gems                                        | Moonpetal seed burst                          |
| 16   | 500 stardust                                   | —                                             |
| 17   | 1 shower                                       | —                                             |
| 18   | 750 stardust                                   | —                                             |
| 19   | 1 spark                                        | —                                             |
| 20   | 1,000 stardust; Moonpetal Road sticker         | —                                             |

### Theme, Style Single, samplers and stardust

Paper Garden: Paper Garden Rock Lab; Paper Garden Ice Lab; Paper Garden Magma Lab; Paper Garden Seed Lab; Paper Garden Rain Lab; Paper Garden Sun Lab; Paper Garden Den; Paper Garden Greenhouse; Paper Garden Launch Bay; Paper Garden ground paint; Paper Garden sea paint; Paper Garden flowers; Paper Garden fountain; Paper Garden lantern; Paper Garden friend outfit; Paper Garden friend scarf. Free Wish sampler: Paper Garden folded flowers (`sampler_papergarden`), excluded from purchased contents.

Crescent Lace: Crescent Lace Supernova style; Crescent Lace trail.

Woven Sky seed trail — 5,000 stardust; Woven Sky seed burst — 12,000 stardust; Woven Sky Fusion — 25,000 stardust; Woven Sky Supernova — 50,000 stardust.

### Gem singles

Provisional total: 5,700 gems, controlled solely by `ROAD01_GEM_SINGLE_TOTAL` in `src/meta/content/road01.ts`. Package D measures both windows; the lead repins that constant to at least 0.85 times the larger free supply. Prices are distributed in 10-gem units, with no single above 300 gems. At this pin: twenty 260-gem singles and two 250-gem singles.

| ID                          | Name                    | Gems |
| --------------------------- | ----------------------- | ---: |
| `road01_reedfold_suit`      | Reedfold suit           |  260 |
| `road01_reedfold_hat`       | Reedfold folded hat     |  260 |
| `road01_reedfold_launcher`  | Reedfold launcher look  |  260 |
| `road01_reedfold_trail`     | Reedfold ribbon trail   |  260 |
| `road01_duskfold_suit`      | Duskfold suit           |  260 |
| `road01_duskfold_hat`       | Duskfold folded hat     |  260 |
| `road01_duskfold_launcher`  | Duskfold launcher look  |  260 |
| `road01_duskfold_trail`     | Duskfold ribbon trail   |  260 |
| `road01_clayfold_suit`      | Clayfold suit           |  260 |
| `road01_clayfold_hat`       | Clayfold folded hat     |  260 |
| `road01_clayfold_launcher`  | Clayfold launcher look  |  260 |
| `road01_clayfold_trail`     | Clayfold ribbon trail   |  260 |
| `road01_inkfold_suit`       | Inkfold suit            |  260 |
| `road01_inkfold_hat`        | Inkfold folded hat      |  260 |
| `road01_inkfold_launcher`   | Inkfold launcher look   |  260 |
| `road01_inkfold_trail`      | Inkfold ribbon trail    |  260 |
| `road01_pearlfold_suit`     | Pearlfold suit          |  260 |
| `road01_pearlfold_hat`      | Pearlfold folded hat    |  260 |
| `road01_pearlfold_launcher` | Pearlfold launcher look |  260 |
| `road01_pearlfold_trail`    | Pearlfold ribbon trail  |  260 |
| `road01_reedfold_ground`    | Reedfold ground paint   |  250 |
| `road01_inkfold_sea`        | Inkfold sea paint       |  250 |

### Festival keepsakes (decision 94)

January: Sparkle Fan (`sparklefan`). June: Splash Ribbon (`splashribbon`). Both are permanently earned, never sold. Party Hat and Sunglasses remain the existing 40-gem singles; existing owners retain them. Edition 2 is deferred.

### Approval and capture status

New product IDs are draft permanent IDs. Names, descriptions and contents are frozen in English; the five other locales contain explicit English draft values for the lead to translate. Approval includes those final translations and the three real Simulator review captures. See `iap-review/README.md` and `review-notes.md`.
