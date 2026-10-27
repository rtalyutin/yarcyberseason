# Atlas v3 validation

Status: final acceptance checks PASS; broad regression has six reproduced baseline failures.
This is local functional/source/build verification, not a production deployment receipt.
Base: `542261c65a83eadcd5e1488baa8d02f77899cae7`.

## Independent verification scope

The verifier did not author application code. It inspected the accepted atlas,
current source contracts and implementation diff, wrote `atlas-acceptance.test.mjs`,
and updated two obsolete class-name assertions in `sites-worker.test.mjs` to test
semantic homepage navigation inside `<main>`. All other worker checks remain.

Acceptance covers chronological mixed-status Matchday; confirmed/unknown/technical
results; canonical broadcasts; manual date activation and browser history;
resize/focus/listener cleanup; three distinct motion profiles and reduced motion;
state-preserving utility theme changes; League intake identity/privacy; organizer
login/noindex; actual homepage results/partners and existing Easter-egg triggers.
Existing suites additionally cover tournament filters and sections, complete match
features across themes, per-map/series MVP, intake retries and stale completions,
organizer columns, simulator rules, ClickHighlight and minesweeper behavior.

Browser rendering is separately performed by the implementation team. Node/SSR
checks do not establish layout quality, desktop/mobile acceptance, authenticated
production organizer access, or successful production photo uploads.

## Known baseline failures

The broad suite retains these failures. All six were reproduced in a clean,
unchanged worktree of the base commit; sports data was not changed to satisfy them.

| Test | Baseline cause |
| --- | --- |
| `matchday-content-refresh`: current Dota projection | Expects the old 30-match/October 13 schedule; source now has 47 matches and completed playoffs. |
| `webmcp`: confirmed final/Swiss rounds | Expects 30 current Dota matches instead of 47. |
| `partner-content-refresh`: registry count | Expects 18 partners instead of the current 19. |
| `partner-content-refresh`: final assignment | Expects no assigned final partners before participants were published; the actual final is now known. |
| `partner-content-refresh`: original logo set | Expected set predates the published Ogni logo. |
| `community-render`: all templates | Old synchronous `renderToStaticMarkup` path does not await lazy MatchPage content; fails the copy-action check on the unchanged base. |

## Asset and boundary verification

- Independently decoded five production WebP exports: three 1672 × 941 panoramas
  and two 1254 × 1254 textures, all RGB, unchanged dimensions.
- Source/export hashes and byte sizes match `public/assets/atlas/web-exports.json`.
  Re-encoding each original with Sharp WebP quality 86 / effort 6 reproduced the
  exact exported SHA256. They are lossy web derivatives, not pixel-identical masters.
- Five files total 1,557,582 bytes, down from 9,638,726 source WebP bytes. The accepted
  source package is unchanged.
- Decorative frame equals its source bytes: 1254 × 1254 RGBA, alpha range 0–255.
  Seven bundled SVG documents parse successfully.
- Changed literal asset references resolve to nonempty files. Built copies of all
  15 atlas asset/provenance files are compared byte-for-byte with public sources.
- Data, backend, worker, Telegram, hosting, dependency versions, result/normalization,
  intake client and minesweeper rules are compared against the base commit.

## Final snapshot and results

The frozen runtime input contains 495 files under `src/` and `public/`.
Its path/content SHA256 snapshot was unchanged before and after the final build
and tests:
`8825e5d9fb582cdcfe2c326dc9a3617d3fa6fc7d43958c371a0422c5a5cadc90`.
The snapshot includes new/staged files. Protected comparisons use `git diff HEAD`
against the base, so staging cannot conceal changes. No protected path changed.

| Final check | Observed result |
| --- | --- |
| `npm run build` | PASS; 52 teams, 167 matches, 233 canonical URLs + 4 aliases |
| Independent atlas acceptance | 10/10 PASS, including final resize/focus/listener changes |
| Sites worker / built route, metadata, sitemap checks | 6/6 PASS |
| Utility theme storage/state test | 1/1 PASS |
| Broad regression before the final heading-color override | 153 tests: 147 PASS, 6 baseline failures listed above, 0 skipped |
| Focused regression after that final CSS override and rebuild | 23/23 PASS: atlas 10, worker 6, utility 1, navigation/static 6; 0 skipped |
| All built match pages | 167/167: real h1, actual result or unknown score, correct parent tournament, no lazy loading fallback |
| Literal asset references in changed JSX/JS/CSS | 57 checked; no missing/empty file |
| Atlas source → build copies | 15/15 byte-identical |
| Protected data/API/backend/Telegram/hosting/dependencies | Unchanged from base |
| Working and staged whitespace checks | PASS |

The broad regression used snapshot
`c417dda25ddc484dd811c12630e4b1ad388a99668fc200cf463fb5bf7c058e78`.
After it, one CSS-only rule restored the organizer-room heading's inherited light
color on its dark scene. No JS, data or API changed. The final build and 23 focused
checks were repeated on the final snapshot above. Browser QA independently read
back `rgb(237, 243, 255)` text on `rgb(13, 21, 36)` after the correction.

The 167-match check ran **after the final build**, against every community match,
not a sample. A separate filesystem count and parent/h1/fallback check also found
exactly 167 built match HTML files. The complete static route/metadata test checks
the sitemap destinations through the existing worker, including aliases and 404s.

Final focused command after `npm run build`:

```sh
node --test tests/atlas-acceptance.test.mjs tests/sites-worker.test.mjs tests/utility-theme-state.test.mjs tests/site-navigation-qa.test.mjs
```

Broad regression reproduction command:

```sh
node --test tests/site-navigation-qa.test.mjs tests/tournament-navigation.test.mjs tests/match-theme-parity.test.mjs tests/matchday.test.mjs tests/matchday-content-refresh.test.mjs tests/broadcast-links.test.mjs tests/partner-content-refresh.test.mjs tests/shared-content-refresh.test.mjs tests/home-board.test.mjs tests/player-profile-ui.test.mjs tests/player-profile-intake-verifier-ui.test.mjs tests/player-profile-intake-verifier-client.test.mjs tests/organizer-columns.test.mjs tests/organizer-captains-ui.test.mjs tests/webmcp.test.mjs tests/click-highlight.test.mjs tests/minesweeper.test.mjs tests/swiss-simulator.test.mjs tests/community-render.test.mjs tests/dota-series-mvp.test.mjs tests/match-center.test.mjs tests/swiss-presentation.test.mjs tests/utility-theme-state.test.mjs tests/atlas-acceptance.test.mjs tests/sites-worker.test.mjs
```

This broad command exits 1 because the six unchanged baseline failures remain;
it must not be reported as an all-green suite. `validation-evidence.json` records
compact counts, final input digest, build bundle hashes and raw log hashes.
Production publication/readback and the implementation team's browser observations
are recorded separately in `IMPLEMENTATION.md`; no real photo upload or privileged
organizer write was performed by this independent verifier.
