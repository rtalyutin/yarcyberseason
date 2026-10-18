# Swiss design — active contract and state

## Playoff calendar — 18 October 2026

- Add the organizer's supplied calendar to the current playoff bracket: Н1/Н2
  19 October, В5/В6 20 October, Н3/Н4 21 October, Н5 22 October,
  В7 23 October, Н6 24 October and Ф1 25 October 2026.
- Preserve sporting results, participants and advancement edges. Retain three
  played quarterfinal appointments; apply Roman's later announcement correction
  for Aegis Guardians–strela team: 18 October 21:30 MSK instead of 21:00.
  Sync its existing calendar event revision. Other future times remain unknown.
- Each shared bracket card displays its published date and known time in MSK;
  missing times display «Время уточняется». Keep existing themes and navigation.
- Scope: current website source and its existing publication path. No backend,
  bot settings or separate Telegram Serverless release.
- Build/data validation passed. Independent JSON and actual-component SSR checks
  verified all 10 calendar dates, 14 cards and preserved sporting data/graph.
  Legacy playoff-route tests fail identically on baseline and candidate (8
  historical-fixture failures). Browser could not reach the local server;
  final verification was performed on the published site as recorded below.
- Delta QA also verified the 21:30 MSK correction in the real component SSR and
  the single dependent calendar record (revision 0 to 1).
- Initial publication was BLOCKED: automatic approval review rejected GitHub create_tree
  before mutation, citing full-file participant-data disclosure and missing
  explicit remote-write permission. No tree/commit ID was returned; main was
  not updated by this task. Obtain explicit permission for these five reviewed
  files on rtalyutin/yarcyberseason main and the existing site; recheck branch
  head before resuming. Do not retry via another write route.
- Roman explicitly authorized these five files, main and the website with
  «разрешаю» on 18 October at 16:24 MSK. Publication authorization is restored;
  the branch remains f006caf92beb1ea567360f440f9df9725cf8a920. All four runtime
  file hashes still match the independently checked candidate.
- LIVE_VERIFIED: commit c4a6740f1a029446f84fc50a7e854a84eaa64dbe was
  published to main with an expected-head update; remote readback and a local
  comparison against origin/main confirmed all five reviewed files exactly.
  The existing host propagated the update on 18 October at approximately
  16:30 MSK. Public DOM readback verified all 14 schedule rows, the ten new
  dates, four known MSK appointments and Aegis–strela at 21:30.
  Desktop visual inspection in the Dota theme confirmed readable dates/times
  in the upper/lower bracket and grand final. Mobile was not visually retested.
  No hosting settings or separate Telegram deployment changed.

## First playoff result — 17 October 2026

- Data-only continuation from `6ffc3586f79c0dada59a83ab4b72d04404d99f91`:
  publish the final Swiss seeds as the four actual quarterfinal pairs, retaining
  IDs, seed order and all 20 bracket edges. Swiss fixtures/results are unchanged.
- Team Leto–TEAM SPERMINT is confirmed 2:0 from OpenDota series 1155903,
  maps 9049400157 and 9049488885. Source: public MVP raw cache revision 1935,
  updated 2026-10-17T17:27:17.022Z. `collectDotaResults` and
  `applyDotaSnapshot` normalize Radiant/Dire into fixture order: 47:20 / 27:38
  and 38:29 / 38:23. This is API evidence, not manual organizer confirmation.
- `getPlayoffView` resolves Leto into В5 slot1 and SPERMINT into Н1 slot1.
  Those two known sides are also published for the Mini App's existing raw-slot
  adapter. Their opponents remain «Победитель В2»/«Проигравший В2», without team
  IDs, appointments or results. No later round is a complete scheduled pair.
- Current caster memos `libfile_ff133265888c8191ad2e0eb709f9cab7`
  and `libfile_9914304f36ec8191b7c8c1d005628285` establish
  17 October 18:00 / 23:00 MSK and Twitch YarCyberSeason for В1/В4.
  Roman's explicit schedule establishes WAYPROD.–ARB 18 October 13:00 MSK and
  Aegis–strela 18 October 21:00 MSK; no channels are assigned to those two matches.
  Scheduled quarterfinals retain the collector's existing appointment window
  through 03:00 MSK the next day, without a midnight cutoff for the 23:00 series.
- Partner memos bind ОГНИ to В1 (series-MVP certificate, no published value)
  and Чико to В4 (series-MVP certificate 1,000 ₽, bill of at least 2,000 ₽).
  Only these two partner records change. Both homes select the upcoming В4
  broadcast from canonical match links; dependent calendar records are synced.
- Author checks and deployment state are recorded in the delivery handoff.
  This entry alone does not claim deployment or independent QA acceptance.

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
- Status: LIVE_VERIFIED for the observed desktop feature scope. Accepted
  implementation: `5ad12aecb18988cec04fb8f2e460f447e0aaf7ff`.
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
- Main update SUCCEEDED and read back independently through the GitHub API
  and git fetch: `c670214eee155aa14b08c28451d7c4c983327ffd`, exact accepted
  delivery tree `7eee9d7f737c55586c2f84245257fc45d113114d`.
  GitHub Git Data API used an expected-head, non-force update; direct git push
  had no write credential and made no change. Auto-review initially rejected
  the tournament/test blobs because they contain existing player data. Direct
  comparisons with immutable published baseline files proved that no player
  identifiers, names, rosters or sporting results were added/changed; the same
  blob operations then succeeded. No alternate route bypassed the rejection.
- Public desktop browser readback on 14 October: the actual host serves eight
  seed rows, 14 match cards and 20 SVG connectors. Four qualifiers remain;
  current Buchholz values reflect 29 confirmed series rather than the earlier
  acceptance snapshot's 28. The lower-bracket jump focuses Н1. Document and
  viewport widths both equal 1348px; no page-wide overflow. These are live
  browser observations, not the isolated author browser fixtures above.
- Verified public route:
  `https://xn--90aiaibl0ahlel5n.xn--p1ai/tournaments/dota2-autumn-2026/?section=playoffs&phase=all`.
  Existing host/configuration and sporting data writers are unchanged. Runtime
  mobile/4K checks remain the earlier isolated checks, not production claims.
- Independent release readback: PASS, observed 13 October 22:02–22:05 UTC.
  Public App CSS is byte-identical to the accepted build (SHA256
  `c6b3ac07ee19677baa5ead385a463968c83ba128691bde733cdc0165c26cb2ac`).
  Public App JS matches after normalizing only hashed asset names and the
  build timestamp. A fresh independent calculation from results revision 24
  (29 confirmed series, four qualifiers) matches all eight rows observed in
  the production browser. This verifies the delivered assets and current data;
  it does not claim an additional independent browser run or full CI PASS.
- Authorized release is complete. Subsequent visual feedback does not change
  the verified delivery record or tournament rules. No background monitoring
  or new external operation is scheduled.

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
