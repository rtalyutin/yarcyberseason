# Swiss design — active contract and state

## Current contract: playoff seeding, 14 October 2026

- ACTIVE_CONTRACT: PLAYOFF-BH/r1, Roman's request to display the complete Double
  Elimination bracket and current Buchholz/seeding table. Source: published
  autumn regulation (14 September 2026), sections 3.3.3 and 3.4.3.
- Baseline: a8954107012560dc2cb69ffe38f538f24edea72c. Branch:
  `codex/dota-playoff-seeding`. On 14 October Roman explicitly authorized
  «выкладывай в main»: accepted frontend to existing main and existing host.
  No new backend writer, hosting configuration or Telegram setup is included.
- Current ordering: W descending, L ascending, Buchholz descending, R1 draw
  ascending. Final qualified buckets are 3:0, 3:1, 3:2. Buchholz sums the current
  W−L of opponents in confirmed Swiss series, including technical results.
  Neither map count nor head-to-head breaks ties. Recalculate after an overlay.
- Display the current top eight non-eliminated teams, qualified vs forecast in
  text; all seed numbers remain provisional until all Swiss teams finish and
  eight have qualified. Missing complete draw data leaves slots unknown.
- Data flow: `swiss-seeding.js` derives view data from accepted fixtures; no
  projection writes team IDs, schedule, results or outcomes into those fixtures.
  Both Swiss themes and playoff table consume this calculation. Published pairs
  take precedence; only actual confirmed playoff pairs can supply later W/L slots.
- Topology: В1=1–8, В2=4–5, В3=2–7, В4=3–6; В5=W1/W2,
  В6=W3/W4, В7=W5/W6. Н1=L1/L2, Н2=L3/L4; Н3=WН1/LВ6,
  Н4=WН2/LВ5; Н5=WН3/WН4; Н6=WН5/LВ7; Ф1=WВ7/WН6.
  14 series, 13 BO3 + GF BO5 from 0:0 without reset. LН6 is third.
- Authorial intent: preserve the selected Swiss table/portals and shared header;
  extend the existing theme tokens with a precise seed table and an upper/lower
  bracket. No generated art or replacement visual language. Inspected reference:
  `docs/design/swiss/desktop-natural-final.jpg`. Current data never comes from it.
- Runtime target: existing React/Vite HTML/CSS/SVG; desktop and 320/390px phone
  browser, all three themes, up to 3840px. Local table/bracket horizontal scroll
  is allowed; page-wide overflow is not. Keyboard transitions focus target cards.
- Acceptance: current BH verified against independent revision23 oracle; correct
  ties/technical/unconfirmed results, fixed 14-match graph, no forecast leaks,
  SSR/browser resize/links and build/data tests. No FPS or Telegram-client claim.
- Status: VERIFIED for this feature on implementation commit
  `5ad12aecb18988cec04fb8f2e460f447e0aaf7ff`; no publication performed.
- Data used for acceptance: public results revision 23, updated
  `2026-10-13T19:53:52.024Z`: 28 confirmed series, including five technical
  series. Current four qualifiers: Team Leto (3:0, +4), Aegis Guardians
  (3:0, −1), Easy Gaming (3:1, +2), ARB Esports (3:1, −1).
- Author checks: 56/56 relevant Node tests passed (`swiss-seeding`,
  `swiss-playoffs-render`, `swiss-presentation`, `data-integrity`, `tournament`,
  `telegram-step3`, `telegram-step6-brackets`); `npm run data:check` and
  `npm run build` passed. Build retains 150 actual match pages; forecast
  participants do not create match pages or enter schedules/history.
- Independent acceptance: PASS on the same commit, 21/21 behavior/SSR checks,
  all 16 teams independently recalculated, and all 16,384 outcome combinations
  of the actual JSON graph verified. Handoff digest:
  `880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`.
- Actual built UI: 16 author-run headless Chromium 153.0.8010.0 scenarios
  passed. Coverage: three themes at 320/390/1440/3840px, Swiss at three sizes,
  keyboard focus, 20 connectors, in-memory confirmed-result refresh and failed
  refresh retention. No JavaScript errors or page-wide overflow. Tests served
  built files and the captured revision 23 through isolated request fixtures;
  this does not verify production transport/CORS or Telegram clients.
  Independent reviewer inspected Dota desktop/mobile and corporate screenshots.
- Actual Dota renders: [desktop](playoff-preview/desktop.jpg) and
  [mobile](playoff-preview/mobile.jpg). At narrow widths only the bracket scrolls;
  all seeding-table metrics remain visible in each team's row.
- Wider checks retain four pre-existing failures, reproduced on clean base
  `a895410`: obsolete CS2 action assertion in `community-render`, R4 date
  expectation in `dota-results`, and two archived CS2 grand-final prerender/route
  assertions in `sites-worker`. `npm run test:sites` therefore still fails its
  same two assertions. No full CI PASS or release-readiness claim.
- Release preparation (14 October): origin/main remains the same baseline;
  working tree is clean, accepted application code is unchanged. GitHub reports
  main unprotected, no required checks and no rulesets. Known four baseline
  failures were disclosed before the user's publication instruction. Release
  decision: proceed with the accepted feature, without claiming full CI PASS.
  Operation: non-force update of main, then remote-head and public-asset readback.
  Recovery reference: baseline above; preserve later independent changes if a
  corrective revert is needed. No sporting-result or backend data writes.
- Next: execute the authorized main update and confirm the existing host.

## Previous Swiss visual contract (retained)

- Contract revision: SWISS-1+4/r1, 12 October 2026. User selected table from displayed option 1 and Dota portals from option 4, then accepted the combined image and asked to finish/fix shortcomings.
- Selected visual: `generated_images/exec-c2553fcf-cc26-455d-bfb2-7da75295c119.png` in the conversation. The demonstration rows explain future states; they are not tournament data.
- Scope: implement the existing Dota Swiss section with real current standings. Preserve existing shared header, all routes/other themes, actual R3 pairs, matches, MVP and broadcasts. No new hosting/backend/sports-data writer.
- Base: `303682e012f9106c23e7e123bf84b20b5f7b9027` (main, 12 Oct), local branch `codex/swiss-design-2026-10-12`.
- Authorial intent r1: an ancient Dota arena with three physical magical gates, a compact stone-framed standings table, ivory condensed headings, teal readable surfaces. Color of an entire qualified row identifies its exit round.
- Criteria: 3:0 emerald/round 3; 3:1 blue/round 4; 3:2 violet/round 5. Three losses marks elimination. 2:1, 1:2 and 2:2 remain active. Win pips count total wins, not game chronology. Keep data live via the existing confirmed-results projection; no mock teams or fabricated scores. Text status duplicates color meaning.
- Runtime: existing React/Vite and semantic HTML/CSS/raster assets; cloud Chrome preview. Check 320/390px mobile, reference-width desktop, and 3840px 4K; cap composition at 1800px. No animation/FPS promise.
- Status: implementation complete; 23 author tests and 8 independent SSR checks passed. Responsive/browser checks and independent final visual gate passed. No publication performed in this task.
- Next: save the reviewed branch; release is separate. Working preview is open in cloud Chrome; final evidence is in project-root `design-qa.md`.

## Assets

- Emerald: `/workspace/scratch/2f1b5443e4d0/swisses-assets/emerald-portal.png`.
- Blue: `/workspace/scratch/2f1b5443e4d0/swiss-assets/blue-portal.png`.
- Violet: `/workspace/scratch/2f1b5443e4d0/generated_images/exec-ed4cfac1-5124-4eb9-a3ce-1c14915ae82a.png`.
- Environment: `/workspace/scratch/2f1b5443e4d0/swisses-assets/swiss-stone-forest.png`.
- All four generated with built-in imagegen from the selected visual, individually inspected. Deployed derivatives retain the content and transparency, encoded as WebP. Real team logos come from the existing registry.
