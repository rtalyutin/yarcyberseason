# Independent step 5 integration verification

Executed: 2026-09-15T09:12:42.537Z

Working tree based on 3faba2a6f0bef72534ced38e0adcd043447192ca, integrating origin/main 58c9754f7035d04a24ad8dcc511988705d015537; bot configuration YarCyberSeason_bot. Uncommitted work was reviewed.

Result: PASS for SSR and preservation of main changes. HTTP: BLOCKED by local connection refusal. Browser/Telegram: NOT VERIFIED. This is not joint acceptance.

## Executed observations

- Actual HomeScreen and TournamentScreen JSX bundled with existing esbuild and rendered via React renderToStaticMarkup using the real loadMiniAppModel. Home, overview and participants rendered successfully.
- Independent source oracle: raw dota2-autumn-2026.json. All 16 participant IDs matched in source order; every source displayName appeared. Home contains the source dates, closed registration, 16 / 16 and Open tournament action.
- No navigable a/area href links, external registration URL or invented 0:0 score in these screen renders. React's 3 image-preload link hrefs on the home screen are resource references, not navigation; the initial broad href condition was corrected after inspecting the actual tags. Buttons were rendered; click handlers were not executed.
- 14 files changed in main matched origin/main byte for byte through executable Buffer comparisons. Prototype.jsx differs only in the previously introduced shared partner rendering; SiteHeader/AboutPage/theme-aware TeamPage changes remain. AGENTS.md contains additional miniapp decisions.
- Attempted local GET /tg using Node fetch to http://127.0.0.1:4173: ECONNREFUSED. No HTTP PASS is claimed; the direct tournament request could not proceed. The root executor separately reported a running preview inaccessible from another exec context. Cause not proven.

Build files hashed: 206

Build SHA-256 (sorted dist/client path + NUL + bytes + NUL): 84f283d7ec14fdf548c6a3f6d7e7e669f18c7a32ed1200b8ec56c14d766a2dc5

## Limits and release conditions

- Cloud Browser blocks the local preview with ERR_BLOCKED_BY_CLIENT, reported by primary executor. This verifier did not bypass it or perform browser observation.
- SSR does not prove client JS initialization, mobile layout, Worker serving, public HTTPS reachability or Telegram WebView behavior.
- No real Telegram client was opened. BackButton, start_param, safe areas and viewport behavior remain unverified for this integrated build.
- No publication, bot mutation or main merge was performed by this verifier. Public HTTPS /tg and /tg/tournament plus deployed build identity need observation after authorized publication.
- Joint acceptance requires Roman's real Telegram observations and explicit confirmation; step 6 stays blocked until then.

## Main files compared

- public/docs/reglament-dota2-autumn-2026.pdf
- src/about.css
- src/components/AboutPage.jsx
- src/components/CommunityPages.jsx
- src/components/MatchMapLinks.jsx
- src/components/SiteHeader.jsx
- src/components/ThemeSwitcher.jsx
- src/components/TournamentNavigator.jsx
- src/data/organizers.json
- src/data/regulations.js
- src/data/tournaments/dota2-main-2026.json
- src/match-map-links.css
- src/site-header.css
- src/team-profile.css
