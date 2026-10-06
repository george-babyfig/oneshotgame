# Product scope: raw material

This is what the senior-PM review behind [ROADMAP-v2.md](../ROADMAP-v2.md) was built from. The review ran in the second cloud session (28 September 2026). Keep these files to check any number or claim in the roadmap. They are working material, not specs.

| File                        | What's in it                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence.md`               | Four audits of the game as of `911d004`: core gameplay, economy and data (with a bot simulation and catalogue model), the Homeworld, and a played-through user journey. Also the market research on combos and hazards, base-builder purpose, and kid-safe revenue with benchmarks and Apple/regulatory rules. |
| `proposals.md`              | 45 proposals from five product managers: core loop, meta/Homeworld, UX, live-ops/data and monetization                                                               |
| `critiques.md`              | Five adversarial critiques of every proposal: kid safety, originality, engineering, economy and player advocate                                                                                 |
| `round7-research.json`      | Round 7 research on replay/remix modes and iMessage stickers: verified findings, rejected claims and pitfalls. The spec made from it is [../REMIX.md](../REMIX.md) |
| `prototypes/`               | The agents' scratch code: a round-rules prototype with reactions and hazards (`coreloop/`), level-design sims (`ld/`), and economy, catalogue and monetization models (`*.model.*`). They import the game's code by relative paths from a scratch folder, so treat them as reference, not runnable tools. |
| `screens/`                  | Twelve downsized screenshots from the journey audit: first launch, planet 1 failure, the calendar wall, a clipped iPhone SE home, the crowded mid-game home, Homeworld, shop and more. The full set (78 images, 48 MB) was not kept. |

These files are excluded from Prettier (`.prettierignore`) so they stay exactly as produced.
