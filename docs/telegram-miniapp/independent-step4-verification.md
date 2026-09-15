# Independent step 4 verification · 2026-09-14

Verifier: `/root/verify_step4`, read-only, separate executor. Scope: Node/SSR behaviour and source inspection, not actual Telegram or cloud browser. Baseline: `3bec94b` + step-4 implementation; repeated after merging main `6da86af` at `0b91fcb8c2b2949f45cfd6e22c08a1ae589df9fe`.

## Executed probes

| Probe | Actual observation |
| --- | --- |
| Browser history mock | Home→tournament push; sections replace; native back restores home |
| Direct entry | Explicit back uses replace `/tg`, never external history |
| Allowlist | Known launch used; unknown launch keeps allowed URL; `/tg/teams/x` becomes home |
| Actual JSX SSR and source model | Dota selected; 16 participants; closed registration; 0 matches; no extra links, no CS2 statistics |
| Cross-discipline identities | PIVNAYA KEGA, psb_bank, РГАТУ correctly resolved despite CS2-prefixed IDs |
| Empty participants | Explicit explanation, no fabricated participant rows |
| Preferences | Only rift/ru; unknown/corrupted/denied storage safely normalizes |
| SDK bootstrap mock | Success/error/timeout and concurrent-load deduplication pass; failed script removed |
| Runtime mock | Three setup/back/cleanup cycles; one active back handler; zero listeners after disposal |
| Action safety | Eight prohibited/malicious destinations rejected; participants/format stay internal |
| Merge compatibility | All 12/12 actual participant logo files exist; roster/statistics do not leak into DTO or SSR |

## Reproduced defect and repair

Initial observed defect: `SDK.start_param=participants` reopened participants after returning home then remounting. WeakSet repair fixed remount but did not survive fresh module evaluation simulating reload. Added non-sensitive `history.state.ycsLaunchConsumed` boolean; raw launch data never stored.

Independent repeat output:

```text
PASS fixed Telegram remount: consumed launch not replayed, 0 residual popstate listeners
PASS fixed fresh-module reload simulation: route=home;
history={"ycsMiniApp":true,"ycsLaunchConsumed":true}

node --test tests/telegram*.test.mjs
tests 32 / pass 32 / fail 0

PASS updated main model+JSX: explicit Dota; 16 participants; closed;
0 matches; all actual logo paths rendered;
no roster/statistics fields leaked; no out-of-scope links
PASS 12/12 participant logo files exist
```

## Identity

```text
router.js       589e669b57665d3cb255b7d57844404aecc435a5af5ebdf3fb53774ff792afad
preferences.js  fbe98a6a7221fbd208b1eded7bf0fecb8bb2d491ba824e0c16e3306c7bd93b67
load-bridge.js  e46aaa47aa268fbccf07206104c7598b654971a006eab1f88bfb7751248e25ed
MiniApp.jsx     022f1cf0ac0141ea0ab53662f87250d5c1d7ad4b355d235ac369cd5af08319c8
entry.jsx       468455990b468d52466ed7f51af854598c08ff94e6c5c50cf5eb51cb2b61bdf4
main.jsx        b7d68f74afce86e962ef4eb7d09709a7b6dfcebf3778e62a0868b424c9570cc4
community.js    b5420d72cd6e5160a5278a6062a7fd42abca4208ec97bad447123c25b79125bf
teams.json      5bc98e06fc5db7f1876a392284d83474a4deabb6e0e7046998629f56418fd2c0
Dota JSON       c252a126bc56cb0985230cda67bd14c72ab4d4ac83874fcda4e40880961c1150
```

Verdict: **PASS for tested Node/SSR boundary**. React StrictMode mount/unmount, interactive model retry, full network graph, visuals, production and real Telegram are not proven by these probes. Root browser observations and remaining gates are separately recorded in STATE.md. Agreement with architecture is not counted as evidence.
