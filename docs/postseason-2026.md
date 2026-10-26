# Autumn Dota 2 postseason — 25 October 2026

## ACTIVE_CONTRACT

Roman accepted the postseason proposal with «реализуй». Preserve the existing
three themes, artwork, routes, shared tournament template, sporting rules and
single results/MVP collector. Publish through the existing repository/host.

The website and Mini App share a completed-season projection: champion and final
when confirmed, podium, results/MVP navigation, latest completed archive first,
and acknowledgements separated into tournament/final/official scopes. No next
tournament or registration promise is invented. Prizes are not marked delivered.

Scores and awards require confirmed inputs. The results snapshot at intake is
revision 36 (24 October); final-1 is absent. Direct OpenDota HTTP returned 403,
but the public API pages loaded in the browser. All three grand-final maps
confirm league 20164, series 1159619, Team Leto (9845511) against Easy Gaming
(8638867), with Leto winning all three. Published final: Team Leto 3:0 Easy
Gaming; third place Mi Ne Pushim! follows the confirmed lower-6 result.

| OpenDota match | Leto side | Winner | Kills, Leto:Easy | Seconds |
| --- | --- | --- | --- | --- |
| 9061493228 | Dire | Leto | 39:26 | 2871 |
| 9061646304 | Radiant | Leto | 31:7 | 1125 |
| 9061715579 | Radiant | Leto | 34:49 | 3747 |

Public primary inputs: `https://api.opendota.com/api/matches/{matchId}`.
Upper-7 is imported from validated public results revision 36, series 1158423.
MVP revision 158 is incomplete and awaits five maps. Preserve provisional MVP
copy until the existing validated calculation is complete. No MVP score,
formula, award or S3 writer was changed.

## Interaction contract / revision 1

Published tournament JSON + validated results overlay → shared tournament state
→ homepage / tournament / archive / Mini App. Completion controls presentation;
it never invents a match score. Confirmed placements come from tournament data.
Read failures retain the last confirmed data. Stable direct URLs still work.

HTTP API: N/A — no endpoints or request/response schemas change. Existing S3 GET
contracts and collector/writer behavior remain unchanged. The presentation flow
changes from upcoming broadcast to results navigation for completed tournaments.

## Acceptance

- Completed tournament has no next-broadcast/registration call to action.
- Champion/final/podium agree across home, results, bracket and match pages.
- Missing final or MVP data stays explicitly pending; no fabricated award.
- Completed archive membership and ordering update with shared state.
- Prior tournaments, technical results, themes, assets, header and URLs survive.
- Real desktop/mobile rendering, navigation, build and relevant regression tests.
- Published source revision and public content are verified separately.

## TASK_STATE

Base: 37b71bd5e11927d9bc42d2d5e0af3afe43a7eb20.
IMPLEMENTED: shared completed home, confirmed 3:0 final and podium, dynamic
archive selection, explicit overview route, scoped partner acknowledgements.
The captain's existing verified access remains available for its tournament.

CHECKED: 78 targeted postseason/home/routing/results/archive/captain checks passed.
Build passed: 52 team records, 167 matches, 232 canonical pages + 4 aliases.
Full suite before the final fixture-selection correction: 399/453 passed;
one new failure selected the newly archived current event as an unrelated
captain archive and was corrected. The other failures reproduce on the base.
Sites checks: 4/6 passed; both missing prerendered match h1 failures were
reproduced after building the untouched base in a separate checkout.

PUBLISHED_SOURCE: main e14cb1cc5f0cfd8d447337e9ab8db47c137b9f8f,
tree 2cbb01b89e8ea0a09b64505b3b1a0d9c5185fa7b. Expected-head update and
remote ref readback passed; local tracked source exactly matches that commit.
PUBLIC_SITE: after the initial stale response, the existing Timeweb pipeline
served the completed-season homepage and Team Leto title. Browser navigation
verified the 3:0 podium/results page. Live theme checks found legacy CSS
specificity affecting the Dota heading and corporate kicker; isolated completed
hero selectors now outrank it. Archived tournament headers and participant
labels no longer retain the registration messaging. FINAL_LIVE_CHECK: main af302735dc7e1d897c5d3a54eb656dbf39728aae reached
production. Public postseason-pCg1Gbr4.css exactly matches build SHA-256
38ad0f18d40d3d7ccf013510055d525e6839bee7f2b2328a4efc740cedb722d3.
Desktop: all three themes inspected; the Dota heading is inside its card with
position:static, corporate kicker is rgb(23,89,222), no horizontal overflow at
1348px. Home → results → grand-final navigation shows the confirmed 3:0 and
all three map results. Website /tg displays the new champion, podium and
results; explicit overview survives reload. Screenshot: evidence/postseason-home.jpg.
Localhost, actual mobile viewport and genuine Telegram checks remain unavailable.
UNRESOLVED: final MVP inputs; separate Serverless static publication requires
the existing CLI credential, absent from this environment. No hosting, bot,
access settings or remote modules were changed.

## Grand-final MVP ingestion — 26 October 2026

User request: ingest the grand-final map results so MVP can be calculated.
Public MVP revision158 still has five ingestion-pending IDs. Live collector
fingerprint f2e5881701e4c33e616f11c46ef53a15711703750e2c0d91e6008185dbf119e0
matches Tg-mcp f19fd8c9, older than its main4b8da4ac. Cache revision4340
contains fully parsed version22 sources for all five maps; each is unmatched.
Browser OpenDota readback independently confirms all five parsed ten-player
maps (three grand-final and two lower-final).

There are two causes: the active collector still has unresolved finalist data,
and final-1 has no individual appointment so the importer assumes18:00MSK.
Map9061493228 actually started25October17:45:54MSK. An explicit matching
window for the published calendar day (25October00:00–26October00:00MSK)
now admits all three maps without inventing an appointment. Only windowStart
and windowEnd change in the website data. Transfer the exact completed data to
the existing single Tg-mcp writer and update both shared-data manifests.
No scoring, estimates, access configuration, new writer or unrelated services.

Verification: replay the existing collector against saved cache4340. All five
maps become ready with50 player-map records and ingestionPendingMatchIds=[];
previous real contributions survive byte-for-byte. Before the window correction
the first grand-final map has no fixture; foreign team IDs still have no fixture.
An independent Python Fraction calculation from raw targets/healing/ward logs
matches all50 exact scores. Grand-final projection is complete: uma turman,
account1428538045,117.58 across3maps. This is a LOCAL verification until S3 readback.
Three older pending cache entries remain; existing estimated/provisional rules
are preserved. The tournament's projected leader is Perec_amigo694.31.

Website build PASS. Targeted source tests59/66 (all seven failures reproduced
on untouched parent7987c8c, not a clean-suite claim). Tg-mcp typecheck, build
and both manifest checks PASS; targeted runtime/captain/MVP86/93, with all
seven failures reproduced on untouched parent4b8da4ac. No scoring/runtime code
changes. Production activation and published MVP readback are separate gates.
The Timeweb control-panel page is currently unavailable in the cloud browser;
no restart or settings mutation has been issued.
