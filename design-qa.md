# Dota MatchPage design QA — 11 October 2026

**Findings**

No actionable P0/P1/P2 findings remain after the fixes below. Independent executor: `/root/verify_match_links`; implementation authored by `/root`, MVP adapter by `/root/broadcast_data`.

- Source visual truth: `/workspace/scratch/2f1b5443e4d0/generated_images/exec-caff50b9-0b57-46a7-a9f7-0bfecfcf2d9b.png` (selected option 1, 1672 × 941 pixels).
- Rendered implementation: `docs/design/match-detail/desktop-1672.jpg` (1254 × 706 pixels) and `mobile-390.jpg` (390 × 844 pixels).
- Combined source/render comparison: separately retained `source-and-implementation.png` QA raster (original local commit `839535931bc5e9ebe2617cdc3cdbe615cd2f5d08`, SHA-256 `904408da13f0beafbce9a078b6e839315236c30fbed9f48bd075822235525f8e`). Its 2.69 MB documentation-only copy is excluded from the delivery tree; the desktop/mobile browser captures remain in the repository. Source normalized to 1254 × 706; actual App layout is 1672 × 941 CSS pixels, DPR 1, displayed at scale 0.75. This is an explicitly scaled raster, not a claim of physical browser resize. Mobile is a 1:1 crop of the browser frame; raw screenshots remain in Scratch.
- State: Dota theme, Team Borisogleb–ARB Esports, confirmed 1:0, 9 October 20:30 MSK; actual validated MVP revision 19: jxdzxq / ARB Esports / 59,66. The source's illustrative player text is replaced with those verified facts.
- Object: working tree based on `78ad541f1d13face70b5d0b5233d4b6e2c720b54`; final source manifest digest `bab8b11f009af270fe28a0f20748ad693a16fef35ac658902f10a9fd499c351a`. Full fingerprints and timestamped observations are in `docs/design/match-detail/browser-qa.json`.

## Fidelity

| Surface | Actual comparison |
| --- | --- |
| Fonts/typography | Condensed display hierarchy, ivory score/team names, mint headings and readable body copy preserve the source. Bundled Roboto Condensed provides `YCS Match`; inherited site typography remains shared. |
| Spacing/layout | Yaroslavl/Dota panorama, centered pair, MVP on the left and maps on the right, then stream/actions dock are preserved. Primary action bottom is 939 within the 941 CSS-pixel target. Shared header placement is an approved existing-site constraint. |
| Colors/tokens | Deep teal, ivory/mint, red Dota marks, blue Radiant and warm Dire treatment agree. Mobile dynamic MVP copy has a dark rgba(5,25,30,0.96) layer for readability. |
| Image quality | Actual published team logos and generated panorama/stone assets remain images. Desktop crop preserves both Dota sides; mobile now shows the entire panorama instead of a city/forest-only crop. |
| Copy/content | Actual score, map 55:40/67:30 and real match MVP are preserved. Missing recording/pending MVP are stated honestly. No illustrative player, fabricated award or clock-derived LIVE appears. |

Full-view and focused scoreboard, MVP/maps and dock regions were inspected together in the combined comparison. Core details are readable at normalized 1254 px width, so an additional focused crop was unnecessary. Mobile has no separate selected mock; its adaptation was judged against the explicit responsive and art-preservation criteria.

## Executed core checks

| Criterion | Observation |
| --- | --- |
| Canonical streams | Exact `https://www.twitch.tv/yarcyberseason` and `https://vk.com/yarcyberseason`, inside the match dock, with `_blank` and `noopener noreferrer`. External sites were not opened. |
| Conditional streams/pending | Real r2-01 fixture with revision 19: 0 leaders, honest awaiting-statistics copy,0 broadcast blocks, completed status and no LIVE. |
| Team/primary navigation | Team Borisogleb link opened its real `/teams/dota2-main-2026-team-borisogleb` page; “К матчам турнира” opened `/tournaments/dota2-autumn-2026#matches`. Both team hrefs were observed. |
| Share | Clipboard was unavailable; the visible fallback exposed the exact canonical public match URL for copying. |
| Mobile 390 | Actual 390×844/DPR 1; client 375 equals scroll 375; stream targets 162.5×48. Shared menu opens/closes and exposes all 6 navigation links. Final panorama and MVP copy were visually inspected after fixes. |
| 4K cap | Actual 3840×2160/DPR 1; composition 1800 px centered at x 1020, document client = scroll 3840, score font 110 px. |
| Shared header/themes | Header component and CSS byte-identical to base; existing 1200 px breakpoint preserved. Desktop navigation and mobile menu observed. CS2 and corporate toggles retain the existing match template with no Dota detail element. |
| Console | Captured sample contains extension metadata errors only; no application-source error in that sample. This does not establish successful external network delivery. |

## Comparison history

1. Initial desktop 1363 capture: black Dota marks and map metrics over the Dire fire were P2. Root applied red asset tint and a 285 px map content cap. The final target capture confirms both fixes.
2. Initial 390 capture: cover crop lost the Dota sides; a stone rail crossed dynamic MVP text. Root changed mobile panorama to 100% auto / min-height 375, shifted the band artwork and added the dark MVP text layer. Final 390 capture confirms the scene and unobstructed nickname/team/score/footnote.
3. Final combined desktop comparison and corrected mobile inspection: no remaining P0/P1/P2 finding.

## Open questions and scope limits

Ready/pending MVP rendering was exercised through a temporary fetch fixture containing the **real validated** snapshot, not hardcoded application data. Direct external MVP delivery was unavailable in this cloud preview; production network delivery is outside this local gate. The actual normal route remains open with truthful retrieval-error UI. Screenshot clip/fullPage attempts timed out; ordinary capture of a scaled iframe supplied valid evidence. 200% zoom/reduced-motion runtime were not added to this narrowed scope.

## Implementation checklist

- [x] Fix recorded visual issues and inspect revised captures.
- [x] Verify primary interactions, conditional streams and pending MVP.
- [x] Preserve source order/data, shared header and other themes.
- [x] Remove all temporary qa-match HTML/JSX/JSON entries before final build.
- [x] Preserve previous MVP R3 report at `docs/design/mvp/design-qa-before-match-detail.md`.

**Follow-up Polish**

No additional polish is required for this accepted scope. This QA is implementation evidence; subjective user approval and release remain separate.

final result: passed
