# M8 phase B report

Integrated ladder/Buddy/Gentle/Dry Spell, Trouble-aware sims, checkpoint/resume, practice gifts and Daily Weather Report. 29 salts; smoothstep(1–30): f1=.40+.24e, f2=.68+.13e, f3=.88+.05e. Regenerated `campaign-PP`, `constants`, `greedy-PP`, `modes`, `levels.default` fixtures.

Baseline→current fail%/3★; C=casual,D=decent,S=sharp; A=current attempts median/p90. Baseline 1–10 includes practice.

```text
Planets       C              D              S              A(C,D,S)
1–10 N        9/40→8/19      1/71→1/55      1/93→0/86      1/2,1/1,1/1
11–20 N       21/21→8/20     11/50→1/54     5/88→1/83      1/2,1/1,1/1
21–30 N       32/19→27/16    13/29→11/38    1/77→2/80      1/3,1/3,1/1
31–45 N       45/7→25/9      22/26→3/46     2/80→1/77      2/3,1/2,1/2*
46–60 N       32/11→15/11    12/28→2/58     6/80→0/88      2/3,1/2,1/2*
First Hard    16/25→44/6     0/69→25/34     0/100→9/53     1/6,1/2,1/2
Hard 25+      52/3→54/9      41/13→27/34    12/58→6/71     4/6,2/3,1/2
Super         60/18→58/8     45/26→38/35    5/72→19/61     3/7,2/7,1/5
61–120 Watch  —→39/9         —→14/36        —→3/69         —
```

*31–60 attempts pooled. Practice fail=0; C/D/S 3★=27/60/92%. Lint order WALL/CLIFF/GOAL-TRAP/STACK/BONK-HEAVY/EASY/TRIVIAL/EASY-EARLY/FLAT/SLACK: 1–60=5/9/16/0/0/5/0/9/2/39; 61–120 Watch=17/17/15/2/0/8/1/0/0/32 (8-run sample).

Obstacle gates pass: teaching C/D bonks ≤1/.75, surprise=0, flight median=82.5s. All-layer 21–60 median=81.6s. Trouble gain cost blind=−7.6%, aware=−2.1%, max=+0.6% (required ≥5%, ≤8%, ≥3%). `sim:quick`=84.2s; nightly: 10/30 shadows, 61–120 watches, 90-day/12-week preflight. Preflight: 90 Daily+84 Voyage passed. `RULES_VERSION=1` covers Combos/sky/Troubles/flight in saves, fingerprints and codes.

**Red:** Combo thresholds, 28 lint flags, 8 quick/10 shadow bands, Trouble cost; unit 563 pass/six translation failures. Unshippable. Eight keys await five locales.

**New/changed English strings (74):**

"A Dry Spell dried the land."; "A cool breeze"; "A crystal cools land. Magma melts it!"; "A gift from your Buddy"; "A little tip"; "A vent warms green land. Ice Comet cools it!"; "A vine reached this land"; "A vine reaches green land. Magma helps it settle!"; "Buddy helps"; "Calm"; "Choose a Homeworld friend. Its trait helps once each planet."; "Choose a friend living on your Homeworld. Your Buddy cheers you on and can help with Troubles."; "Cools nearby land."; "Covers the next green land."; "Dries nearby green land."; "Ember Vent"; "Fire and Dry Spell cannot dry its home."; "Fireproof"; "Friends protect their home lands in different ways."; "Frost Creep"; "Frost Creep stops at its home."; "Frostproof"; "Here, try these!"; "I love my Homeworld home. Pick me in Styles and I can help with Troubles on your planets."; "Ice Comet or Rain Cloud cools it."; "Its home counts as water and stops fire and weeds."; "Magma clears the vine."; "Magma or Sunburst melts it."; "Make an Ocean beside a Mountain for three stars."; "One throw flew past the planet."; "One throw met {obstacle}."; "Safe behind a firebreak!"; "Sky bumps give the throw back, and Troubles and Clashes rest. Stars count as normal."; "Swimmer"; "Tanglevine"; "Tap the next throw to swap it. Try Rock before Ice Comet!"; "The first Trouble waits one more throw."; "The {land} goal needs more sectors."; "Three places will glow on your next try."; "Traits"; "Try a new place for your next throw."; "Try {object} on the {land}."; "Vent cooled!"; "Warm breeze from the vent"; "Watch the landing card for a friend moving in."; "Weather Report: {name}"; "Weedproof"; "Weeds cannot tangle its home."; "What happened"; "Your Buddy brings 2 extra throws for this attempt."; "Your Buddy {name} helps Troubles wait a little."; "Your Buddy {name} keeps fire and weeds off its home."; "Your Buddy {name} keeps fire off its home."; "Your Buddy {name} keeps frost off its home."; "Your Buddy {name} keeps weeds off its home."; "Your Buddy {name}. Tap to choose a friend."; "in {n} throws"; "settled next"; "the marked land"; "the mist"; "the moon"; "{creature} needs a home here."; "{creature} wandered off."; "{name} reaches this land"; "{name} settled!"; "{n} friends wander off"; "{n} throws flew past the planet."; "{n} throws met {obstacle}."; "{trouble} cooled one sector · {counter}"; "{trouble} cooled {n} sectors · {counter}"; "{trouble} dried one sector · {counter}"; "{trouble} dried {n} sectors · {counter}"; "{trouble} reached one sector · {counter}"; "{trouble} reached {n} sectors · {counter}".
