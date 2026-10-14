# 06: Workflow: test, QA, build, ship

## Everyday commands

```bash
npm install
npm run dev            # browser play at http://localhost:5173 (mock purchases); window.__app for debugging
npm run format         # Prettier (CI runs format:check)
npm run typecheck
npm test               # 586 Vitest tests (2 skipped), including i18n coverage for all 5 locales and the frozen snapshots
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
npm run e2e            # 201 tests: J1, J2, J3, J6 overlap, J7 resume, palette.spec, prices.spec, gate.spec, showtime.spec, scenebot.spec, sky.spec; Chromium 320x568 and 390x844, WebKit 390x844; 6 languages + pseudo-locale
npm run e2e:quick      # English only, Chromium 390x844
```

Claude runs Playwright itself: Codex's sandbox can't bind a local port or launch Chromium, so neither the dev server nor the browser starts there.

In dev, `window.__gate.answer()` returns the parental gate's answer so journeys can pass Gate v2; `e2e/helpers.ts` uses it.

**Frozen snapshots:** if a test says a rules or level snapshot changed and you didn't mean to change the rules, it's a bug. Only for an intended change: `UPDATE_FIXTURES=1 npx vitest run tests/rules.snapshot.test.ts tests/levels.snapshot.test.ts` (see [03-architecture.md](03-architecture.md)).

Before every push, run `format:check`, `typecheck`, `test`, `build`, `e2e` and `sim:quick` (and the `balance` command below when a difficulty or Trouble change is in play). CI runs `verify` (format, typecheck, tests, build, and a grep that fails if `Balance Report`, `__app`, `__i18n`, `__scene` or `__gate` appear in `dist/`), `sim-quick`, `balance` (M8: the pooled 1–60 curve and two-sided lint, `GOAL-RAMP`/`TEACH` included, 30-minute limit), `e2e` (three parallel jobs, one per browser project, since the suite outgrew a single 20-minute job) and the macOS `ios-build`; `nightly.yml` runs the full sims. The Showtime frame-time gates (`e2e/showtime.spec.ts`) only assert locally — CI's runners have no GPU, so there they just report the numbers.

**Balance** (M8, `balance` CI job): `SIM=1 SIM_BALANCE=1 TROUBLE_RUNS=32 npx vitest run tests/sim/balance.sim.ts tests/sim/trouble-cost.sim.ts` — the pooled 1–60 chapter/tier bands and the two-sided lint (including `GOAL-RAMP` and `TEACH`) under two master seeds × 96 attempts, plus 32 paired Trouble-cost runs. About 8 minutes locally.

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
- **`xcrun simctl launch` can open the app behind the Home Screen.** The app icon shows it installed fine, but the launched app sometimes doesn't come to the front on its own — tap the icon on the Home Screen instead of trusting the launch to front it.
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

**One milestone, start to finish (the loop that worked for M0–M7):**

1. **Plan:** split the milestone into 2–3 Codex packages with **disjoint file ownership**. Write one shared "common" brief (repo, rules, conventions, checks) plus one brief per package.
2. **Tests first:** a test engineer sub-agent writes the tests and snapshots from the spec before or while Codex works.
3. **Build:** run the Codex packages (in parallel when files don't overlap).
4. **Integrate:** each Codex package may only edit its own files, so after parallel packages there is always an integration pass (by Claude or one more Codex brief) to wire them together: imports in `app.ts`, new `EarnSource` entries in `wallet.ts`, `unlocks.ts` rows, tests that span packages.
5. **Check:** Claude reviews the diffs, then runs `format`, `typecheck`, `test`, `build`, `e2e` and `sim:quick` (and `sim:economy` when money changes).
6. **Translate:** translator sub-agents on a cheap model (haiku), one per language, or one for all 5 for a small batch. They write the locale JSON with a small node script, never by hand-editing. See the translator rules under Translations below.
7. **Review:** 3 adversarial Claude reviewers, each with a lens (correctness; economy and kid safety; UX and i18n), plus Codex in `-s read-only`. Claude verifies every finding before anyone fixes it.
8. **Fix:** one Codex fix pass for the verified findings; re-run the checks.
9. **Ship:** commit, push, watch CI with `gh run watch`, keep it green.
10. **Record:** update the PR #2 description, the milestone's "✅ built" note in ROADMAP-v2 section 8, `BUILT` in `tests/glossary.test.ts` (it lists M0–M7 now; see [05-status-and-next.md](05-status-and-next.md)), and the milestone's Linear document.
11. **Report:** a short plain-language summary to the owner with what to try in the Simulator.

**Lessons learned (M6–M8):**

- **Codex can't run Playwright or a dev server.** Its sandbox can't bind a local port or launch a browser, so the engineering manager (Claude) runs Playwright itself after Codex's packages land, never Codex. This cuts both ways: when Codex **writes** a new Playwright spec (as M7.5's Scene Bot package did for `e2e/scenebot.spec.ts`), the lead still has to be the one to run it and debug it — Codex can't see whether its own spec even passes. M7.5's Scene Bot spec initially reported "no last hit" on every run; the cause was an intro card left open (`window.__scene`'s dev hooks respect the same `modalOpen` guard a real tap does), and only running it locally in the browser surfaced that.
- **Never `git stash` while a QA agent's Vite server is running.** The dev server hot-reloads, so a stash pulls the old code out from under a server that's still up and the QA agent ends up testing stale behaviour. Stop the server (or let the QA agent finish) before stashing.
- **Simulator QA with a mid-game save:** generate a profile JSON in a headless browser via `window.__app` against the dev server, then write it straight into the app's own container plist (not the plain domain form, which writes to the wrong place):
  1. Terminate the app in the Simulator first.
  2. Find its container: `xcrun simctl get_app_container <UDID> com.pocketplanet.game data`.
  3. Write the save: `xcrun simctl spawn <UDID> defaults write <container>/Library/Preferences/com.pocketplanet.game CapacitorStorage.pp.profile -string "$(cat profile.json)"`.
- **Run the full Playwright suite after every tuning pass, before pushing — not just the sims.** It's what caught a Reduce Motion regression in M6.5/M7 that a narrower check would have missed, and it's what caught M8's goals regression: across the difficulty program's phases B–E, salt-picking had quietly dropped the goal off every planet 1–13 and most of Normal 11–20, because the bots only measure fail/star rates and never check whether the on-screen goal chip is actually there. J1's first-session journey does check for it on planet 6, and that's the run that failed. Two new lint gates (`GOAL-RAMP`, `TEACH` in `tests/sim/lint.ts`) now catch this class of bug inside the sims themselves, but the Playwright run is still what found it first — see [01-history.md](01-history.md) §28.
- **GitHub's runners are meaningfully slower than the dev Mac — budget for it, don't just copy the local time.** The M8 `balance` job measured about 8 minutes locally but was still getting cancelled at GitHub's 10-minute default; its job limit is now 30 minutes. As a rule of thumb, expect a GitHub Actions runner to take **roughly 1.5–2× as long** as the Mac for a CPU-heavy sim job, and size new CI timeouts with that margin rather than the number you saw locally.
- **`store/` copy must avoid other games' names, the same as in-game text.** `tests/terms.test.ts` (the M1 originality lint) was widened to scan every `store/*.md` file too, so a listing draft that slips in a hit-game name or term fails CI the same way an in-game string would.

## Linear

- **Project:** "Pocket Planet — Launch Roadmap" in the Linear team **"Pocket Planet"** (the owner created the team): https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db
- **Shape:** 22 milestones, each with one "work items" checklist **document**, plus an "Owner decisions and to-dos" document. There are **no issues**: the workspace hit the free-plan issue limit, and the owner chose checklists in documents. Don't create issues.
- **Order:** M7.5, M10.5, M11.5 and M17 sit at the end of Linear's milestone list, because the API can't reorder milestones.
- **Keep it in step:** when a milestone is built, mark its document ✅ (and tick its checklist). When the roadmap changes, change Linear too.
- **State now:** M0–M7 are marked built, and owner decision 1 (keep gem packs, Grown-ups only) is recorded in the "Owner decisions and to-dos" document.
- **Never touch the Babyfig team** or anything else in the workspace. It belongs to the owner's other project.

## Translations

For every new English string:

1. Wrap it in `t()` / `tp()`. If it lives in a data table, register it in `tests/i18n.test.ts` `allKeys()`.
2. Run `DUMP_KEYS=1 npx vitest run tests/i18n.test.ts` to write `src/locales/_keys.json`, then list the keys missing from `src/locales/de.json`.
3. Add translations to `es`, `fr`, `de`, `pt` (Brazilian) and `ja`, keeping `{placeholders}` and emoji identical.
   - **Tone:** warm and simple, for kids 6+.
   - **Informal forms:** German uses "du".
   - **Japanese:** mostly kana, with simple kanji.
4. **Large batches:** run parallel sub-agents, one per language, each writing via a small node script.

**Translator rules (learned the hard way in M5).** Tell every translator sub-agent, in so many words:

- **Never run git.** Never revert, restore, checkout or reset files.
- **Only add keys.** Don't delete or rewrite existing translations.
- **Only edit your own language file** (`src/locales/<lang>.json`).

In M5 one translator ran a revert and wiped three languages' work. After translators finish, **recount the keys in every locale** against `src/locales/_keys.json` before moving on.

**The glossary test will flag translator slips.** `tests/glossary.test.ts` checks that game nouns are translated the same way everywhere and that no never-introduced word appears. Expect it to fail after a translation batch and fix what it names. Examples:

- Japanese must use 星 (star), 銀河 (galaxy), おまつり (festival) and さばく (desert).
- "Orbit" is a never-introduced word: don't use it in any language.

Give translators the glossary's terms for their language up front.

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
- **Decisions:** ask the owner only when a decision in ROADMAP-v2 section 10 is genuinely theirs and blocks the next milestone. They answer briefly (decision 1: "Keep gem packs too"), then say "continue".
