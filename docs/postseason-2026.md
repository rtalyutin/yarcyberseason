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

CHECKED: 66 targeted postseason/home/routing/results/archive checks passed.
Build passed: 52 team records, 167 matches, 232 canonical pages + 4 aliases.
Full suite before the final fixture-selection correction: 399/453 passed;
one new failure selected the newly archived current event as an unrelated
captain archive and was corrected. The other failures reproduce on the base.
Sites checks: 4/6 passed; both missing prerendered match h1 failures were
reproduced after building the untouched base in a separate checkout.

IN_PROGRESS: source publication and live readback. Browser previews cannot
reach this executor's localhost; no local visual pass is claimed.
UNRESOLVED: final MVP inputs; separate Serverless static publication requires
the existing CLI credential, absent from this environment. No hosting, bot,
access settings or remote modules were changed.
