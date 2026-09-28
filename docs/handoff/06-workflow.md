# 06: Workflow: test, QA, build, ship

## Everyday commands

```bash
npm install
npm run dev            # browser play at http://localhost:5173 (mock purchases); window.__app for debugging
npm run format         # Prettier (CI runs format:check)
npm run typecheck
npm test               # 85 Vitest tests, including i18n coverage for all 5 locales
npm run build          # typecheck + production web build to dist/
npm run sim -- --disableConsoleIntercept   # difficulty bot simulation (tests/difficulty.sim.ts), prints fail rates
npm run music          # record every music theme to WAV + print loudness (needs npm run dev)
```

Before every push, run `format:check`, `typecheck`, `test` and `build`. CI runs the same four steps, plus a macOS Xcode build.

## iOS (on a Mac with Xcode)

```bash
npm run ios:sync        # build the web app + copy into ios/
npx cap run ios         # build and launch in a Simulator (pick a device)
npm run ios:open        # open ios/App/App.xcodeproj in Xcode
```

- **Test purchases:** in Xcode, go to Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration and choose `PocketPlanet.storekit`.
- **Prebuilt Simulator app:** every CI run uploads **PocketPlanet-Simulator** under Actions → run → Artifacts. Install it with `xcrun simctl install booted App.app` and launch it with `xcrun simctl launch booted com.pocketplanet.game`.
- **Bundle ID:** `com.pocketplanet.game`.

## Visual QA

The cloud session drove the dev server with Playwright (headless Chromium, iPhone 14 and iPhone SE viewports).

- **The pattern:** open `http://127.0.0.1:5173/`, then set up state through `window.__app`, e.g. `p.tutorial = true; p.level = 24; a.showVoyage()`. Click through, take screenshots, and fail on any `pageerror` or console error.
- **On a Mac,** the local session can do the same, and should also check the real app in the iOS Simulator:
  - Run `npm run ios:sync`, then `npx cap run ios`.
  - Take a screenshot with `xcrun simctl io booted screenshot /tmp/pp.png`, then read the PNG to look at it.
  - Debug the web view with Safari → Develop → Simulator.
  - `window.__app` works there too.
- **Screens to always check:** home (320px and iPhone SE widths), level HUD, and every new sheet.

## Playable web build (Claude Artifact)

- **Build:** `VITE_MOCK_IAP=1 npx vite build --outDir <dir>` produces a web build with the mock store.
- **Publish:** the cloud session published it to https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR.
  - It used a small `game.html` holding the built `<script>` and `<link>` tags, plus a files map for `assets/*`.
  - Files from the previous version were set to `null` so they get removed.
- **Who can do it:** only a session with the Artifact tool. The cloud session republished Version 12 (rounds 1–6 plus the round 7 music) on 28 September. If a local session has no Artifact tool, the owner plays in the Simulator or with `npm run dev`, and the link stays at Version 12.

## Running it like a dev team (Claude + Codex)

The owner wants each milestone built the way a studio would build it, with **Claude as engineering manager** and **Codex as lead developer**. Codex saves Claude tokens on the bulk of the coding. Codex works on the owner's Mac, where it is installed and signed in. It could not run in the cloud sessions: the network policy blocks OpenAI, and there was no install or key.

**Check Codex first:**

- Run `codex --version` and `codex exec --help`. Flags change between versions, so trust `--help` over this doc.
- If Codex is missing, ask the owner. Don't install or sign in to anything on their behalf.

**Roles:**

| Role                  | Who                                                              | Does                                                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering manager   | Claude (main session)                                            | Splits a ROADMAP-v2 milestone into work packages with **disjoint file ownership**, writes one self-contained brief per package, dispatches it, reviews the `git diff` (not whole files), runs the checks, commits, pushes, updates the PR, and reports to the owner. |
| Lead developer        | Codex (`codex exec`, non-interactive, repo as working directory) | Implements one package per brief. Packages that touch different files can run in parallel. It doesn't commit; the engineering manager does.                                                                                                                          |
| Test engineer         | Claude sub-agent (or Codex)                                      | Writes unit tests from the spec: pure logic in `src/core` and `src/meta`, solver feasibility for new level rules, economy invariants and migrations.                                                                                                                 |
| Data analyst          | Claude sub-agent                                                 | Runs `npm run sim` and economy checks against the milestone's targets, and reports fail rates and currency flows before and after.                                                                                                                                   |
| QA analyst            | Claude sub-agent                                                 | Plays through the user journeys with Playwright at iPhone 14 and 320px widths, plus the iOS Simulator. Fails on any console error. Screenshots every new screen.                                                                                                     |
| Translators           | Cheap-model sub-agents, one per language                         | es, fr, de, pt-BR, ja (see Translations below).                                                                                                                                                                                                                      |
| Adversarial reviewers | Claude sub-agents plus Codex as an independent second opinion    | Review each milestone before push through 3 lenses: correctness/bugs, economy + kid safety, and UX + i18n. A second skeptic must confirm each finding before anyone fixes it. Codex reviews in a read-only sandbox.                                                  |

**Brief template for Codex.** Keep it self-contained; Codex has no memory of this chat.

```
Repo: <absolute path to oneshotgame>, branch claude/eager-planck-yfnmzf. Do NOT commit or push.
Goal: <one paragraph from ROADMAP-v2 milestone Mx, item y>
You own these files (create/edit only these): <list>. Do not touch: <list>.
Spec: <the rules and numbers, pasted from docs/product/ROADMAP-v2.md>
Conventions: TypeScript, Prettier, Canvas 2D art drawn in code (no image assets, no emoji in the game world);
pure logic in src/core and src/meta with unit tests; every player-facing string goes through t()/tp() from src/i18n.ts
(data-table strings also registered in tests/i18n.test.ts allKeys()); new Profile fields just need a default in
defaultProfile() (migrate() deep-merges); ownership derived from progress where possible; kid-safe money rules
(no random paid rewards, fixed-price previewable items, no pay-to-skip timers); levels must stay provably beatable via greedyPlan.
Done when: npm run format && npm run typecheck && npm test pass (translations may be left missing; list the new strings).
Report: what you changed (files + one line each), new strings, anything you were unsure about.
```

Typical calls: `codex exec --cd <repo> --sandbox workspace-write "<brief>"` to implement, and `codex exec --cd <repo> --sandbox read-only "<review brief>"` to review. Check `--help` for the exact flags.

**One milestone, start to finish:**

1. Plan the packages.
2. Test engineer writes tests while Codex implements the logic, then the UI.
3. The engineering manager reviews the diff and runs format, typecheck, test and build.
4. Data analyst runs the sim.
5. QA analyst plays through the journeys.
6. Translators fill all 5 locales.
7. Adversarial review, then verify each finding, then fix.
8. Commit and push. Watch CI and keep it green.
9. Update the PR description and ROADMAP-v2 status markers, and republish the playable build if possible.
10. Send the owner a short plain-language summary with what to try.

## Translations

For every new English string:

1. Wrap it in `t()` / `tp()`. If it lives in a data table, register it in `tests/i18n.test.ts` `allKeys()`.
2. Run `DUMP_KEYS=1 npx vitest run tests/i18n.test.ts` to write `src/locales/_keys.json`, then list the keys missing from `src/locales/de.json`.
3. Add translations to `es`, `fr`, `de`, `pt` (Brazilian) and `ja`, keeping `{placeholders}` and emoji identical.
   - **Tone:** warm and simple, for kids 6+.
   - **Informal forms:** German uses "du".
   - **Japanese:** mostly kana, with simple kanji.
4. **Large batches:** the cloud session ran parallel sub-agents, one per language pair, each writing via a small node script.

## Git and PR rules

- **Branch:** develop on `claude/eager-planck-yfnmzf`. Push with `git push -u origin claude/eager-planck-yfnmzf`. Only one session should push to it at a time. The cloud sessions have stopped, so the local session owns it now.
- **Commits:** a clear subject and a bullet body. End every commit message with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
  (A new session should use its own attribution line if its harness supplies one.) Never put model identifiers in PR text.
- **PR:** george-babyfig/oneshotgame#2 is the open draft. Update its description when a round lands. Keep CI green: if it goes red, fix it before doing anything else.
- **Never:** force-push someone else's branch, skip or disable tests, or merge without the owner saying so.

## How the owner likes to work

- **"keep going":** means continue with the next round without asking. Each round goes research → roadmap table → build → tests → translations → QA → commit/push → PR update → playable build.
- **Reports:** short, plain-language progress updates, with a summary at the end of each round that includes what to try in the game.
- **Studio quality:** custom art in code, depth, customization, polish.
- **Honesty:** be upfront about what couldn't be done (e.g. repo visibility, or the Simulator from the cloud) and about anything unverified.
- **Studio process:** scope like a senior PM, then build like a dev team with adversarial reviews (see above). Use Codex for the bulk of the implementation.
