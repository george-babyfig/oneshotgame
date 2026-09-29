# Start the next session (local, on your Mac)

Two early sessions ran in the cloud. The third ran **locally on your Mac** (28–29 September 2026) and built milestones M0 to M5. The next one starts at M6. The next session must run locally too, so it can use the iOS Simulator, Xcode and Codex. Do the setup below first, then paste the prompt.

## 1. One-time checks on your Mac

Open **Terminal** and run these. Each should print a version; tell Claude about any that don't.

```bash
claude --version        # Claude Code
node -v                 # Node 20 or newer (the third session had 25.9)
xcodebuild -version     # Xcode (the third session had 26.4.1)
gh auth status          # GitHub CLI, signed in as george-babyfig
/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex --version   # Codex (plain `codex` is a broken link on this Mac)
```

## 2. Get the project folder up to date

```bash
cd ~/oneshotgame
git fetch origin && git checkout claude/eager-planck-yfnmzf && git pull
git status              # should be clean; if not, tell Claude before it starts
```

## 3. Start a LOCAL session (pick one way)

**Way A: in the Claude desktop app**

1. Click the **Code** tab and start a new session.
2. **Before typing anything**, find the environment picker in the message box and choose **Local**, not a cloud environment such as "Default".
3. Choose the folder `oneshotgame` in your home folder.
4. Pick the permission mode and model you like, then paste the prompt below.

A cloud session shows a cloud icon. A local one doesn't.

**Way B: from Terminal, then drive it from the Claude app.**

```bash
cd ~/oneshotgame
claude remote-control --name "Pocket Planet"  # answer y if asked to enable Remote Control
```

Then open the **Pocket Planet** session in the Claude app (Code tab) or at claude.ai/code, and paste the prompt below. Keep Terminal open and the Mac awake while you work.

Either way, the prompt's first step makes Claude prove it's on your Mac.

## 4. The prompt to paste

```
You are taking over development of Pocket Planet, an original casual iOS game I'm building to ship
on the App Store. Three earlier Claude Code sessions built everything so far: two in the cloud
(rounds 1-7, a senior-PM product scope and the ROADMAP-v2 plan), then one LOCAL session on my Mac
that built milestones M0 to M5, wrote the Homeworld and Flight design docs and put the roadmap on
Linear. You are continuing as that same developer: same standards, same conventions, same
momentum.

Before doing anything else:
0. Prove you are local: run `uname -s`. It must print Darwin. If it prints Linux, STOP and tell me
   you are a cloud session. I will restart you locally using docs/handoff/PROMPT.md.
1. In the oneshotgame folder: git fetch origin && git checkout claude/eager-planck-yfnmzf && git pull.
   Run git status. It should be clean. If there are uncommitted changes, don't discard them: tell
   me what you found first.
2. Read these in full, in order:
   docs/handoff/README.md
   docs/handoff/01-history.md       (the conversation so far and my preferences)
   docs/handoff/02-changes.md       (every commit)
   docs/handoff/03-architecture.md  (code map, conventions, the M1-M5 systems, gotchas)
   docs/handoff/04-research.md      (market research and principles)
   docs/handoff/05-status-and-next.md (where things stand and what's next)
   docs/handoff/06-workflow.md      (commands, sims, Playwright, the Simulator, Codex, the
                                     per-milestone loop, translator rules, Linear, git/PR rules)
   docs/product/ROADMAP-v2.md       (THE PLAN: milestones M0-M17, "✅ built" notes, decisions 1-27)
   docs/product/HOMEWORLD.md        (the full Homeworld design)
   docs/product/FLIGHT.md           (launchers, sky obstacles, Combos, the difficulty program)
   docs/product/REMIX.md            (the Remix and iMessage spec)
   Skim docs/handoff/07-transcript.md (every session word for word; search it for exact details).
3. Check the toolchain: npm install, then npm run format:check, npm run typecheck, npm test
   (435 tests), npm run build, npm run e2e (105 journeys) and npm run sim:quick must all pass
   (say which fail, if any). Also check xcodebuild -version,
   node -v, gh auth status, and Codex at its full path:
   /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex --version
   (/opt/homebrew/bin/codex is a dead symlink). Tell me what's missing. Don't install or sign in to
   anything without asking me.
4. Launch the game in the iOS Simulator so I can play it: npm run ios:sync, then
   npx cap run ios --target D986320D-44EE-4552-8BF7-6BAF254B7D52 (the iPhone 17 Pro). Always use
   that UDID: my other project often has a "BabyFig-iPhone" Simulator booted, so "booted" can hit
   the wrong one. Screenshot with
   xcrun simctl io D986320D-44EE-4552-8BF7-6BAF254B7D52 screenshot /tmp/pp.png and look at it.
5. Give me a short summary: where we left off and what you'll do next.

Ground rules (important):
- Never clone or reskin an existing hit game. Borrow design methodology, not mechanics.
- Kid-safe money only: no gambling themes, no random paid rewards, fixed-price previewable items,
  parental gate, no ads, no pay-to-skip timers, no energy timers.
- Difficulty must feel natural: not too hard at the beginning, but not too easy either.
- Every new string is translated into es, fr, de, pt-BR and ja (the i18n test enforces this).
- Keep CI green on PR george-babyfig/oneshotgame#2. Don't merge it unless I ask.
- You own the branch claude/eager-planck-yfnmzf. Commit and push as you finish each milestone, and
  keep the PR description current.
- Work like a game studio (docs/handoff/06-workflow.md): you are the engineering manager, Codex is
  your lead developer (self-contained briefs via codex exec, 2-3 packages per milestone with
  separate files), sub-agents are the test engineer, QA, data analyst and translators, and every
  milestone gets adversarial reviews (3 Claude lenses plus Codex read-only) before it's pushed.
- Linear: the plan is mirrored in the project "Pocket Planet — Launch Roadmap"
  (https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db), one checklist
  document per milestone and no issues (free plan limit). Mark a milestone's document ✅ when it's
  built. Never touch the Babyfig team.
- Talk to me in plain language, keep updates short, and tell me honestly what you couldn't do or
  haven't verified.

Then continue from where docs/handoff/05-status-and-next.md says: start M6 (Read every throw),
then build the rest of ROADMAP-v2 milestone by milestone (M6.5, M7, M7.5, M8 and on), following
the per-milestone loop in 06-workflow.md. Section 10 of the roadmap lists decisions only I can
make. Decision 1 is already answered: I chose "Keep gem packs too" (the 4 gem packs and the Piggy
Bank stay, sold only in the gated Grown-ups area), so don't ask it again. Use the stated defaults
for the rest unless I say otherwise. Don't wait
for me between milestones unless you're blocked or a decision is genuinely mine. When I say "keep
going", start the next milestone.
Before you stop at the end of a session, update docs/handoff/ (all files, including this prompt and
the transcript) and Linear so the next session can pick up perfectly.
```

## Tips

- **Codex:** it lives at `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`. If that stops working (for example after a ChatGPT app update), run `ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/` in Terminal and tell Claude the path.
- **Your to-dos:** make the repo private and switch its default branch to `main`, set up the Apple Developer account, create the 12 in-app purchase products in App Store Connect when ready, and run the T0 kid playtests (including a check that 9–11-year-olds can't easily pass the new parental gate). The full list is in [05-status-and-next.md](05-status-and-next.md).
- **Playing:** use the Simulator. The old web build at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR is still at Version 12 (rounds 1–6).
- **Only one session at a time** should push to the branch.
