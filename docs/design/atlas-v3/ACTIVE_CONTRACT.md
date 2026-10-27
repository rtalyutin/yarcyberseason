# Atlas v3 implementation — 27 October 2026

Source baseline: 542261c65a83eadcd5e1488baa8d02f77899cae7.
User: «А теперь реализуй изменения на сайте», following acceptance of the full
atlas asset package and the rebuilt Matchday. This authorizes implementation on
the existing main website and its existing host; no replacement hosting.

Design source: YCS-UI-Atlas.pdf, 61 pages, SHA256
5e8ab05a472d06fb16a04b825ac6f7138053c9cb2fba7cae327cdfe8b3b08f35.
Assets: YCS-HTML-Assets.zip, SHA256
5f906b92dbcdaacb1f67cfcdfc0ff208096bd6c29b81e2a0074610850af062cf.

## Scope and invariants

- Shared page structure across CS2, Dota 2 and corporate. Complete CSS surfaces,
  typography, control states and theme-specific motion, including dense content.
- Entire agreed atlas: home, archive/catalogue, broadcasts, partners, about,
  tournament/sections, Matchday, team, match, intake, not-found, WebMCP,
  organizer aliases and format simulator. Preserve the newer /tournaments route.
- New visual selection supersedes older fixed-theme restrictions, including
  About and intake. Actual League branding, fields and privacy contract remain.
- Mock scores, teams, dates, streams, organizer cards and extra intake fields
  are illustrative: never add them to the actual data or business contract.
- Sports data, API, backend, Telegram /tg, hosting configuration and dependency
  versions are outside this frontend design change.
- Preserve canonical match broadcast links, unknown values, confirmed result
  rules, stats/MVP/clips parity, route/history/filter behavior and existing auth.
- Keep original ClickHighlight scene/anchor, Dota Techies and applicable footer
  OrganizerRoom. Fix empty wrong-ward artwork using original ward + vector cross.

## Interaction checkpoint

HTTP schemas and server sequences unchanged. Frontend delta:
choose theme → remember explicit choice → repaint existing content;
choose tournament section → same URL/state update → theme-specific transition;
focus date with arrows/Home/End → no selection → Enter/Space commits date →
?date and history update → chronological program from existing day model.
Back/Forward restores date; unknown times remain unknown. Reduced motion removes
movement, never functionality/focus. Errors retain the last accepted results.
A public channel URL is labelled as a channel, never used to infer LIVE.

## Acceptance

Real browser rendering: three themes, upper and dense lower content, desktop and
narrow viewport; direct tournament access; dates/history/keyboard; menu/focus;
all applicable eggs. Existing focused suites and independent acceptance checks.
Verify current live revision after promotion, not merely commit or HTTP 200.
Any uncovered authentication/upload/production path must be stated explicitly.
