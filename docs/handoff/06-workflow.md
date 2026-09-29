# 06: Workflow: test, QA, build, ship

## Everyday commands

```bash
npm install
npm run dev            # browser play at http://localhost:5173 (mock purchases); window.__app for debugging
npm run format         # Prettier (CI runs format:check)
npm run typecheck
npm test               # 257 Vitest tests, including i18n coverage for all 5 locales and the frozen snapshots
npm run build          # typecheck + production web build to dist/
npm run music          # record every music theme to WAV + print loudness (needs npm run dev)
```

**Sims** (all run Vitest with `SIM=1`):

```bash
npm run sim:quick      # difficulty survey, planets 1-60, casual/decent/sharp bots (~11 s); compares with tests/sim/baseline.json
npm run sim:baseline   # rewrite baseline.json (only when a difficulty change is intended)
npm run sim:economy    # 90-day careers for 7 player types; writes tests/sim/economy/report.json (git-ignored)
npm run sim            # every sim, including the level lint (tests/levels.lint.sim.ts)
```

**Playwright e2e** (`e2e/`, config in `playwright.config.ts`; installed this session with the owner's OK):

```bash
npm run e2e:install    # once: download Chromium and WebKit
npm run e2e            # 36 tests: J1 and J3, Chromium 320x568 and 390x844, WebKit 390x844, 6 languages + pseudo-locale
npm run e2e:quick      # English only, Chromium 390x844
```

Claude runs Playwright itself: Codex's sandbox can't bind a local port, so the dev server won't start there.

**Frozen snapshots:** if a test says a rules or level snapshot changed and you didn't mean to change the rules, it's a bug. Only for an intended change: `UPDATE_FIXTURES=1 npx vitest run tests/rules.snapshot.test.ts tests/levels.snapshot.test.ts` (see [03-architecture.md](03-architecture.md)).

Before every push, run `format:check`, `typecheck`, `test`, `build`, `e2e` and `sim:quick`. CI runs `verify` (format, typecheck, tests, build, and a check that dev tools never reach the production bundle), `sim-quick`, `e2e` and the macOS `ios-build`; `nightly.yml` runs the full sims.

## iOS (on a Mac with Xcode)

```bash
npm run ios:sync                                                   # build the web app + copy into ios/
npx cap run ios --target D986320D-44EE-4552-8BF7-6BAF254B7D52     # build and launch on the iPhone 17 Pro Simulator
npm run ios:open                                                   # open ios/App/App.xcodeproj in Xcode
xcrun simctl io D986320D-44EE-4552-8BF7-6BAF254B7D52 screenshot /tmp/pp.png   # then read the PNG
```

**Simulator gotchas (from the third session):**

- **Always pass the UDID.** The Pocket Planet Simulator is **iPhone 17 Pro, UDID `D986320D-44EE-4552-8BF7-6BAF254B7D52`**. The owner's other project often has a second Simulator ("BabyFig-iPhone") booted, so `booted` can hit the wrong one. Never touch the BabyFig Simulator.
- **Taps into the web view** need a press of about 0.25 s; quick taps are often missed.
- **For precise checks,** use the browser pane with `npm run dev` (`.claude/launch.json` has the config) and `window.__app` / `window.__scene`. Use the Simulator to confirm the real app runs and looks right.

- **Test purchases:** in Xcode, go to Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration and choose `PocketPlanet.storekit`.
- **Prebuilt Simulator app:** every CI run uploads **PocketPlanet-Simulator** under Actions → run → Artifacts. Install it with `xcrun simctl install <udid> App.app` and launch it with `xcrun simctl launch <udid> com.pocketplanet.game`.
- **Bundle ID:** `com.pocketplanet.game`.

## Visual QA

The committed journeys are in `e2e/` (see above). The cloud session drove the dev server with Playwright (headless Chromium, iPhone 14 and iPhone SE viewports).

- **The pattern:** open `http://127.0.0.1:5173/`, then set up state through `window.__app`, e.g. `p.tutorial = true; p.level = 24; a.showVoyage()`. Click through, take screenshots, and fail on any `pageerror` or console error.
- **On a Mac,** the local session can do the same, and should also check the real app in the iOS Simulator:
  - Run `npm run ios:sync`, then `npx cap run ios --target <udid>` (see the gotchas above).
  - Take a screenshot with `xcrun simctl io <udid> screenshot /tmp/pp.png`, then read the PNG to look at it.
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

- **Use the full path.** On the owner's Mac, `/opt/homebrew/bin/codex` is a dead symlink (the ChatGPT app moved it). The working binary is:
  ```
  /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
  ```
  It was version 0.158 and signed in during the third session.
- Run `<codex> --version` and `<codex> exec --help`. Flags change between versions, so trust `--help` over this doc.
- If Codex is missing or signed out, ask the owner. Don't install or sign in to anything on their behalf.

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

**Calls that worked (third session):** write the brief to a file, then pipe it in and let Codex write its report to a file:

```bash
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
# implement one package
$CODEX exec -C /Users/georgeapostolopoulos/oneshotgame -s workspace-write -c model_reasoning_effort="high" -o report-a.md - < brief-a.md
# independent review (no writes)
$CODEX exec -C /Users/georgeapostolopoulos/oneshotgame -s read-only -c model_reasoning_effort="high" -o review.md - < review-brief.md
```

Run packages in the background, in parallel when their files don't overlap. Keep briefs and reports in the scratchpad, not the repo. Codex can't open a local port, so it can't run Playwright or the dev server: Claude does those.

**One milestone, start to finish (the loop that worked for M0–M2):**

1. **Plan:** split the milestone into 2–3 Codex packages with **disjoint file ownership**. Write one shared "common" brief (repo, rules, conventions, checks) plus one brief per package.
2. **Tests first:** a test engineer sub-agent writes the tests and snapshots from the spec before or while Codex works.
3. **Build:** run the Codex packages (in parallel when files don't overlap).
4. **Check:** Claude reviews the diffs, then runs `format`, `typecheck`, `test`, `build`, `e2e` and `sim:quick` (and `sim:economy` when money changes).
5. **Translate:** translator sub-agents on a cheap model (haiku), one per language, or one for all 5 for a small batch. They write the locale JSON with a small node script, never by hand-editing.
6. **Review:** 3 adversarial Claude reviewers, each with a lens (correctness; economy and kid safety; UX and i18n), plus Codex in `-s read-only`. Claude verifies every finding before anyone fixes it.
7. **Fix:** one Codex fix pass for the verified findings; re-run the checks.
8. **Ship:** commit, push, watch CI with `gh run watch`, keep it green.
9. **Record:** update the PR #2 description, the milestone's "✅ built" note in ROADMAP-v2 section 8, `BUILT` in `tests/glossary.test.ts`, and the milestone's Linear document.
10. **Report:** a short plain-language summary to the owner with what to try in the Simulator.

## Linear

- **Project:** "Pocket Planet — Launch Roadmap" in the Linear team **"Pocket Planet"** (the owner created the team): https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db
- **Shape:** 22 milestones, each with one "work items" checklist **document**, plus an "Owner decisions and to-dos" document. There are **no issues**: the workspace hit the free-plan issue limit, and the owner chose checklists in documents. Don't create issues.
- **Order:** M7.5, M10.5, M11.5 and M17 sit at the end of Linear's milestone list, because the API can't reorder milestones.
- **Keep it in step:** when a milestone is built, mark its document ✅ (and tick its checklist). When the roadmap changes, change Linear too.
- **Never touch the Babyfig team** or anything else in the workspace. It belongs to the owner's other project.

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
