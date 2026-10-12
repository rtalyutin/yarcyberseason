# Dota Swiss design QA — 12 October 2026

Source: accepted combined mock `exec-c2553fcf-cc26-455d-bfb2-7da75295c119.png`, 1024×1536. Contract: `docs/design/swiss/TASK_STATE.md` (Swiss 1+4). Implementation: branch `codex/swiss-design-2026-10-12`, base `303682e012f9106c23e7e123bf84b20b5f7b9027`. Prior match-detail report is preserved at `docs/design/match-detail/design-qa-before-swiss.md`.

## Comparison and fixes

Source and actual browser captures were inspected together by author and independent verifier `/root/mockup_check`; full composition and focused portal/table areas were compared at normalized content width. Source is a design reference, not a current sports-data snapshot.

| Surface | Observation / correction |
| --- | --- |
| Layout | Ancient Dota forest/stone, three gates and a compact semantic table retained. Removed inherited 232px blank header area. Shared site header is intentionally preserved. |
| Typography | Ivory condensed display heading; existing readable YCS Sans for body. Fixed narrow mobile names caused by desktop column selectors leaking into row headers. Long team names wrap normally at 320px. |
| Imagery | Three separate transparent raster gates and a raster environment. Increased gates after independent P2 finding so they read as physical portals, not icons. No custom SVG/CSS replacement artwork. |
| Colors | Full-row emerald 3:0, blue 3:1, violet 3:2; burgundy for three losses. Active rows remain neutral. Removed shared hover color that hid the qualifying round. Text duplicates every status. |
| Content / icons | Real existing teams, logos and confirmed-score projection. Three Phosphor circles count wins; no invented chronology. Mock examples are excluded from production. Unknown values remain unknown. |
| Density | All 16 real teams retain a compact table on desktop. Mobile keeps team, score and pips, with a separate status line; no horizontal document overflow. |

## Browser evidence

Cloud Chrome, actual route `/tournaments/dota2-autumn-2026?section=swiss&phase=all`, Dota theme. Responsive checks use the real page in an iframe with explicit CSS viewport sizes; they are not claims of a physically resized browser window. Scrollbars reduce 320/390/1024 content widths by 15px. The image filenames below are relative to `docs/design/swiss/`.

- `reference-width-final.jpg`: 1024×1700 viewport, shown at 0.509 scale; entire table and surrounding page. `swiss-preview.jpg` is a mechanical crop of that browser frame.
- `mobile-320-natural-top.jpg`, `mobile-320-natural-table.jpg`: 320 CSS px at 1:1 scale, client = scroll 305px; practical 44px team link minimum height, readable wrapped labels and statuses.
- 390 CSS px: client = scroll 375px, team cell 203×44px; visually inspected after column fix.
- `desktop-3840.jpg`: 3840×2160 viewport, client = scroll 3840px; centered 1800px composition. This capture predates only the final gate scale increase.
- `nine-states.jpg`: isolated development fixture with the nine requested scores, explicit test-data notice; colored qualification and elimination checked. Fixture is removed from the application tree.
- `desktop-natural-final.jpg`: final normal browser viewport, physical gate scaling and page context.

Interactions executed: Aegis team link opens its real profile; browser Back and Matches/Swiss tabs remain operational; CS2 and corporate themes render zero new Dota Swiss elements, switching back renders one. Team Leto receives visible keyboard focus via Tab. Console sample contains browser-extension metadata errors only, no application-source errors. No animation is introduced.

## Functional and data checks

- Author: 23/23 tests across Swiss presentation, tournament navigation/data, data integrity and static hosting. `npm run data:check` validates 52 teams / 144 matches. Final production build succeeds with 209 canonical routes and 3 aliases.
- Independent: 8/8 SSR/data checks, covering all 15 legal records, 12 invalid inputs, empty state, immutable sorting, all 16 actual source teams, exclusion of scheduled R3, and the existing reader's 2:0→3:0 projection. Evidence: `ssr-results.json`, `ssr-run.log`, `protected-files.json`.
- 31 protected data/reader/header files remain byte-identical to base. Existing R3 opponent correction retained. No broadcasts, MVP, result writer or backend changed.

## Scope limits

Local fallback contains 14 confirmed fixtures; the mock depicts an earlier illustrative 16-result snapshot. The existing dynamic results reader is unchanged. This gate verifies its projection using an isolated in-memory test, not external production network availability. No invented score was copied from the image. Existing missing Nimbus font build warnings predate this change; the Swiss view uses available YCS Sans/Roboto Condensed. Full-page browser capture times out in this environment, so ordinary viewport/explicitly scaled iframe captures are retained. 200% browser zoom and physical device testing were not performed.

Temporary QA entrypoints were removed before the final build. This report records implementation acceptance, not production publication.

Independent final visual gate: PASS, no remaining P0/P1/P2 findings. Repeated 8/8 SSR passed on unchanged source fingerprint `2804867b6d137c0ef6bb07466bf91357b0c7fd47c85435860c734856ed5975a8`.

final result: passed
