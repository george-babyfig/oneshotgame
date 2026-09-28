# Paste this into the new session

Copy everything inside the box below into the first message of a new **local** Claude Code session, opened in your `oneshotgame` folder on your Mac.

---

```
You are taking over development of Pocket Planet, an original casual iOS game I'm building
to ship on the App Store. A previous Claude Code session (running in the cloud) built
everything so far across 6+ rounds of work. You are continuing as that same developer: same
standards, same conventions, same momentum. You're running locally on my Mac now, so you can
do things the cloud session couldn't: run the iOS Simulator, use Xcode, and check the game
visually on my machine.

Before doing anything else:
1. Make sure you're in the repo and on the right branch:
   git fetch origin && git checkout claude/eager-planck-yfnmzf && git pull
2. Read the handoff docs in full, in this order:
   docs/handoff/README.md
   docs/handoff/01-history.md       (our whole conversation and my preferences)
   docs/handoff/02-changes.md       (every commit)
   docs/handoff/03-architecture.md  (code map, conventions, gotchas)
   docs/handoff/04-research.md      (market research + principles)
   docs/handoff/05-status-and-next.md (what's in progress and what's next)
   docs/handoff/06-workflow.md      (commands, QA, translations, git/PR rules)
   docs/handoff/07-transcript.md    (our full conversation word for word; skim it, and search it
                                     whenever you need the exact detail of something)
   Then skim ROADMAP.md and README.md.
3. Run npm install, then npm run format:check, npm run typecheck, npm test and npm run build,
   and confirm everything passes (84 tests).
4. Give me a short summary of: what the game is, where we left off, and what you'll do next.

Ground rules (important):
- Never clone or reskin an existing hit game. Borrow design methodology, not mechanics.
- Kid-safe money only: no gambling themes, no random paid rewards, fixed-price previewable
  items, parental gate, no ads, no pay-to-skip timers.
- Every new string is translated into es, fr, de, pt-BR and ja (the i18n test enforces this).
- Keep CI green on PR george-babyfig/oneshotgame#2. Don't merge it unless I ask.
- Commit and push to claude/eager-planck-yfnmzf as you finish each piece of work, and keep
  the PR description current.
- Talk to me in plain language, keep updates short, and tell me honestly what you couldn't
  do or haven't verified.

Then:
- Launch the game in the iOS Simulator (npm run ios:sync, then npx cap run ios) so I can play it.
- Continue round 7 from docs/handoff/05-status-and-next.md: check the new festival/Voyage
  music, add the round 7 section to ROADMAP.md, then design and build the "Remix" New Game+
  mode. After that, keep going with the roadmap. When I say "keep going", start the next
  round (research, roadmap, build, test, translate, QA, push) without waiting for me.
```

---

## Tips

- **Open a local session:** in the Claude desktop app, start a new Code session and choose the `oneshotgame` folder on your Mac, so it runs locally rather than in the cloud. From Terminal, you can run `claude remote-control` inside the folder, and the session then shows up in the Claude app.
- **Don't have the folder yet?** Run:
  ```
  cd ~ && git clone https://github.com/george-babyfig/oneshotgame.git && cd oneshotgame
  ```
- **The Simulator needs Xcode:** install it from the Mac App Store and open it once to accept the license.
