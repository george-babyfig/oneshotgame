# 06: Workflow: test, QA, build, ship

## Everyday commands

```bash
npm install
npm run dev            # browser play at http://localhost:5173 (mock purchases); window.__app for debugging
npm run format         # Prettier (CI runs format:check)
npm run typecheck
npm test               # 84 Vitest tests, including i18n coverage for all 5 locales
npm run build          # typecheck + production web build to dist/
npm run sim -- --disableConsoleIntercept   # difficulty bot simulation (tests/difficulty.sim.ts), prints fail rates
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
- **On a Mac,** the local session can do the same, or just look at the Simulator directly.
- **Screens to always check:** home (320px and iPhone SE widths), level HUD, and every new sheet.

## Playable web build (Claude Artifact)

- **Build:** `VITE_MOCK_IAP=1 npx vite build --outDir <dir>` produces a web build with the mock store.
- **Publish:** the cloud session published it to https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR.
  - It used a small `game.html` holding the built `<script>` and `<link>` tags, plus a files map for `assets/*`.
  - Files from the previous version were set to `null` so they get removed.
- **Who can do it:** only a session with the Artifact tool. Otherwise, `npm run dev` is the way to play.

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

- **Branch:** develop on `claude/eager-planck-yfnmzf`. Push with `git push -u origin claude/eager-planck-yfnmzf`.
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
