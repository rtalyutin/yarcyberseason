# Dota match detail — selected option 1

User selection: 11 October 2026, «1», from the revised Dota designs. Source target:
`exec-caff50b9-0b57-46a7-a9f7-0bfecfcf2d9b.png` (1672 × 941 preview).
The selected composition is a Dota/Volga panorama, central score and team crests,
MVP on the left of a stone band, map details on the right, and broadcast/actions below.
The earlier generic sports designs were rejected and are not references.

## Scope and behavior

- Existing `MatchPage` opts into `DotaMatchPage` for Dota 2 discipline + Dota theme.
  Its lazy chunk contains the presentation and existing MVP client. Other themes
  and disciplines retain their existing page. No tournament data was modified.
- Shared SiteHeader, navigation, theme persistence and 1200px menu breakpoint
  remain unchanged. The working composition is capped at 1800px on wide screens.
  On phones MVP and maps stack below the scoreboard; controls wrap at 320px.
- Team names/crests, dates, series score, status, maps, duration, outcome, sources,
  consequences and next-round links all come from the current community model.
- Only `getMatchBroadcastLinks(match)` supplies public streams. An empty or invalid
  attribute produces no broadcast section. Neither clock nor links imply LIVE.
  Recording/highlight links remain separate. Clipboard failure exposes a copyable
  canonical URL. Existing PNG download is retained with its confirmed-result gate.

## Match MVP contract

`getDotaMatchMvp` projects the already validated `useDotaMvp` snapshot onto the
fixture's actual linked OpenDota map. It uses published exact scores and the
existing tie-ranking helper. It never substitutes the tournament leader or
recalculates estimates. Negative and zero real scores remain valid; missing
statistics are pending. Ten actual players and both teams must be accounted for.

For a confirmed BO1, show all exact leaders, match-local score and team. Estimated
records are labelled and never presented as measured statistics. Stale, correction
and ingestion states retain their notices. A technical result without play has no
MVP. BO3/BO5 currently expose an explicit pending series summary: no unapproved
series aggregation or tie-break rule is invented.

Observed public snapshot revision 19, updated `2026-10-11T16:00:57.079Z`, passed the
existing validator. For fixture `dota-autumn-swiss-r1-04` / map 9036860954 the leader
is **jxdzxq**, ARB Esports, account 1428248096, exact score 298304281/5000000
(display 59,66). MVP is not restricted to the winning team. This observation is a
verification oracle, not hardcoded UI data; the runtime continues to refresh.

## Assets

`public/assets/match-detail/dota-volga-panorama.webp` and `dota-mvp-stone.webp`
are separately generated, text-free fantasy scenery derived from the selected
composition. Their 2172 × 724 source images were converted to WebP quality 88
(~332 KiB combined). Scores, labels, crests and actions are live semantic HTML.
Existing team/YCS/Dota identity assets, Phosphor icons and bundled licensed
Roboto Condensed are used. The scenery is not literal cartography or a photograph.

## Verification / delivery

- `npm run build`: successful, 201 canonical pages + 3 aliases prerendered.
- `npm run test:sites`: 6/6 passed.
- `npm run data:check`: 52 teams, 136 matches validated.
- Focused MVP projection, existing MVP client and broadcast tests: 25/25 passed.
- Actual browser comparison and interaction evidence: project-root `design-qa.md`.

The base is main `78ad541f1d13face70b5d0b5233d4b6e2c720b54` on isolated branch
`codex/dota-match-detail-2026-10-11`. This is a prepared implementation, not a
production release. Existing unrelated missing Nimbus font warnings are not fixed
by this scoped change; the new match layout uses the present Roboto font.

`desktop-1672.jpg` is an actual browser capture of the app at 1672 × 941 CSS
pixels, displayed at 0.75 scale within the fixed cloud-browser viewport. The
browser's external MVP request was unavailable there; this capture injects the
unaltered, validated public revision 19 into the existing client's request in a
temporary QA wrapper. It is evidence of the actual rendering with real data,
not a claim of end-to-end production network verification. The normal app keeps
its shared live client and an explicit retry/error state. QA wrappers and the
copied snapshot must not be committed or shipped.
