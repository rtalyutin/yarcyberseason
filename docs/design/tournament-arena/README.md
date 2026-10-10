# Tournament arena implementation

Implements `YCS-Tournament-Design-Spec-2026-10-09.md` v1.2, D-01–D-18 and
MATCH-BROADCAST-01 revision 1, with the approved «Первый матч с Twitch и VK»
image. The source document and image are in the organizer's YCS files.
Current sporting data supersedes the older data shown in that image.

`TournamentNavigator` selects the new presentation when `theme === 'dota2'`.
The same tournament model and JSON still serve all three themes. The compact
map cover, single passport and horizontal sticky menu replace the Dota sidebar;
CS2/corporate compositions and the shared SiteHeader remain unchanged.
Section IDs, deep links and browser history keep their existing contracts.
The current header is not sticky, so the section menu sticks at `top: 0`.

`TournamentMatchCard` uses normalized confirmed results, actual team logos
(initials if unavailable), MSK times and independently expandable details.
Adjacent date groups preserve the model's unfinished-first and finished-newest
order; grouping does not reorder fixtures. A yearless date cannot establish a
weekday. Missing time is explicit. Scheduled fixtures keep VS even after their
start time passes. Long labels and additional actions grow their panels.
The search counter reflects the filtered result; clearing Dota search preserves
the phase, and progressive reveal preserves the existing matches and search.
The Dota presentation opts into a reachable empty Matches section, showing
«Расписание ещё не опубликовано» when the organizer has not published any pairs.
Other presentations retain their existing empty-tournament routing.

`MatchBroadcastLinks` renders only the canonical optional `broadcastLinks`
attribute through `getMatchBroadcastLinks`. Twitch and VK are independent
labelled actions; empty or invalid values create no broadcast area. The autumn
opening match's existing URLs were moved without changing its confirmed 1:0,
casters, maps or start. Public projections share this reader. The captain
service only adapts its first URL into the existing single-URL DTO, preserving
the MiniApp contract; private organizer overrides stay private.
See [the data contract](../../community/README.md).

Responsive CSS uses 1100px/768px card breakpoints, 40px/24px/16px outer gutters,
a 1280px content maximum, 44px action targets and the existing local YCS Sans
fallback. The existing map is reused. Only the Dota tournament body relaxes the
legacy 320px minimum to avoid overflow with a classic vertical scrollbar.

Validation and exact revision evidence are recorded in this directory. Browser
QA uses the supported Sites supervisor and cloud browser; temporary iframe
entries provide exact nested viewport sizes and synthetic source cases without
changing production fixtures. Those entries are removed before the final build.
Screenshots show observed rendered pages, not generated design illustrations.

The implementation owner ran the final production build successfully after the
empty-schedule fix: 192 canonical public URLs and three aliases were prerendered.
The integration command below passed 119 tests; `npm run test:sites` passed six
built-output tests, `npm run data:check` validated 52 teams and 128 matches, and
`git diff --check` passed. Independent browser limits remain in [QA.md](QA.md).

```sh
node --test tests/broadcast-links.test.mjs tests/tournament.test.mjs tests/organizer.test.mjs tests/webmcp.test.mjs tests/data-integrity.test.mjs tests/data-version.test.mjs tests/community*.test.mjs tests/telegram-step6-matches.test.mjs tests/captain-service.test.mjs tests/captain-results-reader.test.mjs tests/home-board.test.mjs tests/matchday.test.mjs
npm run build
npm run test:sites
npm run data:check
git diff --check
```
