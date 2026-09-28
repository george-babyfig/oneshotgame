# Start the new session (local, on your Mac)

Two earlier sessions ran in the cloud. The last one could not open the iOS Simulator or use Codex, because both only exist on your Mac. So the next session **must run locally**. Do the setup below first, then paste the prompt.

## 1. One-time checks on your Mac

Open **Terminal** and run these. Each should print a version; tell Claude about any that don't.

```bash
claude --version        # Claude Code. If missing: curl -fsSL https://claude.ai/install.sh | bash   then run: claude   (to log in)
node -v                 # Node 20 or newer
xcodebuild -version     # Xcode. If missing: install Xcode from the Mac App Store and open it once to accept the licence
codex --version         # Codex (already signed in on this Mac for your other projects)
```

## 2. Get the project folder up to date

```bash
cd ~
[ -d oneshotgame ] || git clone https://github.com/george-babyfig/oneshotgame.git
cd ~/oneshotgame
git fetch origin && git checkout claude/eager-planck-yfnmzf && git pull
```

## 3. Start a LOCAL session (pick one way)

**Way A: in the Claude desktop app**

1. Click the **Code** tab and start a new session.
2. **Before typing anything**, find the environment picker in the message box and choose **Local**, not a cloud environment such as "Default". Last time the session started in the cloud because this was left on a cloud environment.
3. Choose the folder `oneshotgame` in your home folder.
4. Pick the permission mode and model you like, then paste the prompt below.

A cloud session shows a cloud icon. A local one doesn't.

**Way B: from Terminal, then drive it from the Claude app.** This is how your BabyFig sessions run, and Codex works there.

```bash
cd ~/oneshotgame
claude                                        # first time in this folder only: accept the "trust this folder" prompt, then type /exit
claude remote-control --name "Pocket Planet"  # answer y if asked to enable Remote Control
```

Then open the **Pocket Planet** session in the Claude app (Code tab) or at claude.ai/code, and paste the prompt below. Keep Terminal open and the Mac awake while you work. If the Mac sleeps it reconnects, but closing Terminal ends the session.

Either way, the prompt's first step makes Claude prove it's on your Mac.

## 4. The prompt to paste

```
You are taking over development of Pocket Planet, an original casual iOS game I'm building to ship
on the App Store. Two earlier Claude Code sessions (both in the cloud) built everything so far:
rounds 1-6, the round 7 music, round 7 research with a Remix spec, and a senior-PM product scope
with a milestone roadmap. You are continuing as that same developer: same standards, same
conventions, same momentum. This session is meant to run LOCALLY on my Mac, so you can do what the
cloud sessions couldn't: run the iOS Simulator, use Xcode, and use Codex.

Before doing anything else:
0. Prove you are local: run `uname -s`. It must print Darwin. If it prints Linux, STOP and tell me
   you are a cloud session. I will restart you locally using docs/handoff/PROMPT.md.
1. In the oneshotgame folder: git fetch origin && git checkout claude/eager-planck-yfnmzf && git pull,
   and confirm git status is clean.
2. Read these in full, in order:
   docs/handoff/README.md
   docs/handoff/01-history.md       (the conversation so far and my preferences)
   docs/handoff/02-changes.md       (every commit)
   docs/handoff/03-architecture.md  (code map, conventions, gotchas)
   docs/handoff/04-research.md      (market research and principles)
   docs/handoff/05-status-and-next.md (where things stand and what's next)
   docs/handoff/06-workflow.md      (commands, QA, the Claude + Codex dev-team playbook, git/PR rules)
   docs/product/ROADMAP-v2.md       (THE PLAN: the point of the game, systems, milestones M1...)
   docs/product/REMIX.md            (the Remix and iMessage spec)
   Skim docs/handoff/07-transcript.md (both sessions word for word; search it for exact details),
   ROADMAP.md and README.md.
3. Check the toolchain: npm install, then npm run format:check, npm run typecheck, npm test
   (85 tests) and npm run build must all pass. Also check xcodebuild -version, node -v,
   codex --version and codex exec --help. Tell me what's missing. Don't install or sign in to
   anything without asking me.
4. Launch the game in the iOS Simulator so I can play it: npm run ios:sync, then npx cap run ios
   (pick an iPhone). Take a screenshot with xcrun simctl io booted screenshot /tmp/pp.png and look
   at it to confirm the game runs.
5. Give me a short summary: what the game is, where we left off, and what you'll do next.

Ground rules (important):
- Never clone or reskin an existing hit game. Borrow design methodology, not mechanics.
- Kid-safe money only: no gambling themes, no random paid rewards, fixed-price previewable items,
  parental gate, no ads, no pay-to-skip timers, no energy timers.
- Every new string is translated into es, fr, de, pt-BR and ja (the i18n test enforces this).
- Keep CI green on PR george-babyfig/oneshotgame#2. Don't merge it unless I ask.
- You own the branch claude/eager-planck-yfnmzf now; the cloud sessions have stopped. Commit and push
  as you finish each piece of work, and keep the PR description current.
- Work like a game studio (docs/handoff/06-workflow.md, "Running it like a dev team"):
  - You are the engineering manager.
  - Codex is your lead developer: give it self-contained briefs with codex exec, and let it do the
    bulk of the coding to save tokens.
  - Use sub-agents as the test engineer, QA analyst (Playwright plus the Simulator), data analyst
    (npm run sim, economy checks) and translators.
  - Run adversarial reviews before every push (correctness, economy + kid safety, UX + i18n, plus
    Codex as an independent reviewer), and verify each finding before fixing it.
- Talk to me in plain language, keep updates short, and tell me honestly what you couldn't do or
  haven't verified.

Then build docs/product/ROADMAP-v2.md milestone by milestone, starting with M1 (Remix is scheduled
in it, spec in docs/product/REMIX.md). For each milestone:
1. Plan the work packages.
2. Codex implements them while a sub-agent writes the tests.
3. Review the diff and run the checks.
4. Run the sim.
5. QA in the Simulator and with Playwright.
6. Translate all new strings.
7. Adversarial review, then fix.
8. Push and get CI green.
9. Update the PR and the roadmap status.
10. Tell me what to try in the Simulator.
Don't wait for me between milestones unless you're blocked or a decision is genuinely mine. When I
say "keep going", start the next milestone (and once the roadmap is done, the next research round:
research, roadmap, build, test, translate, QA, push).
Before you stop at the end of a session, update docs/handoff/ (all files, including this prompt and
the transcript) so the next session can pick up perfectly.
```

## Tips

- **Codex:** the prompt tells Claude to check Codex first. If `codex --version` works in your Terminal but not for Claude, tell Claude where it's installed (`which codex` in Terminal).
- **Playing without the Simulator:** the web version at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR is at Version 12 (rounds 1–6 plus the round 7 music). A local session may not be able to update that link; the Simulator is the main way to play from now on.
- **Only one session at a time:** don't continue work in the old cloud sessions. They have stopped pushing to the branch.
