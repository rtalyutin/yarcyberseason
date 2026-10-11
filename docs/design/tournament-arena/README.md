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
casters, maps or start. Canonical validation now uses main's shared
`broadcasts.js` reader; the arena adapter keeps compact Twitch/VK labels.
The captain service exposes canonical `broadcastLinks` alongside the compatible
first-link `broadcastUrl` field; private organizer overrides stay private.
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

On 2026-10-11, local merge commit `42aa5ef2ac269dfce8d86ecc318277889df9dc7d`
integrated current main `687a4ecd74b9c49e940b9972f17f51ae9eff992b` into the
PR branch. The first round now has eight confirmed matches, and the second
has eight published pairs, one confirmed and seven scheduled. A conflicting
registration test and three stale match-count expectations were updated.
The arena components, CSS and canonical link reader are unchanged. Independent
data comparison and the result overlay check confirmed that the merged
tournament JSON preserves all main data except the agreed opening-match URL
migration. The same integration command passed 119 tests, Sites passed six,
the build produced 200 canonical URLs and three aliases, and data validation
passed with 52 teams and 136 matches. The earlier browser matrix was not rerun;
its executed revisions and remaining limitations remain in QA.md.

The next maintenance merge, `5ab6a1041c5e2d296d66140cdd518e21f3147f4d`
(tree `c31a65f6e6a9a7bbccf86ba1c5286342ee9b6a2a`), incorporates main
`24c87de867ea5040da0bc987eb6230c8e561633b` without losing the approved arena
or theme routing. Tournament JSON is byte-identical to that main, including
all results, dates, MVP and canonical links. Current main's home/Matchday,
partner, archive and captain DTO contracts are preserved. Mechanical overlap
was resolved with one broadcast block per match and one shared URL validator.
An expanded aggregate covering the prior integration suite, content-refresh
and all Telegram tests passed 225/225 with zero skips. Build produced 201
canonical URLs and three aliases, Sites passed 6/6, and data validation passed
with 52 teams and 136 matches. A focused SSR check confirmed one opening-match
broadcast block, one action per platform, and no block when the attribute is
absent. Diff checks passed. The earlier viewport matrix remains historical;
200% zoom and reduced-motion runtime remain unverified.
