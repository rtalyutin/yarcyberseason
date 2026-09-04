# Matchday design QA

final result: passed

## Visual target and evidence

Approved direction: desktop option 2 + mobile option 3, combined into one date-driven responsive page.

Source visuals from the approved design turn:
- Desktop: `generated_images/exec-9f072a0b-6dca-41dc-b4c9-bb64aa3f5eb3.png` — 1487 × 1058 pixels.
- Mobile: `generated_images/exec-ff6984e6-45e6-483b-933a-2f860cc255ed.png` — 852 × 1848 pixels (approximately 426 × 924 CSS pixels at 2×).
- Combined board: `generated_images/exec-4f0c0668-823e-4921-babf-0c3d70b8b0f2.png`.

Browser-rendered implementation evidence:
- [Desktop results](docs/matchday-qa/desktop-final.jpg)
- [Mobile upcoming match](docs/matchday-qa/mobile-final.jpg)
- [Mobile results and partners after scrolling](docs/matchday-qa/mobile-footer.jpg)

Route: `/tournaments/cs2-august-2026/matchday`.
Desktop comparison state: `?date=2026-09-04`, two completed matches.
Mobile comparison state: `?date=2026-09-05`, one scheduled match and the latest results.

The browser API does not expose viewport resizing. A temporary, same-origin iframe harness exercised actual CSS layout at 1440 × 1024, 800 × 1024, 430 × 932, and 375 × 812. It was removed before the production build. Browser DPR was 1. The 1440 viewport was displayed at 0.875×; its saved capture is 1260 × 896 pixels. The 430 viewport was displayed at approximately 0.961×; its captures are 413 × 896 pixels. The browser's desktop scrollbar consumes 15 CSS pixels on mobile. Comparisons accounted for these density differences and the harness controls at the top; this is responsive web QA, not hardware phone testing or a claim of pixel-identical rendering.

Source and implementation images were opened together in the same comparison input for desktop and mobile, including post-fix captures. Full-view checks covered hierarchy, results, scheduled match, navigation, and partner band. Readable result/map labels and the separate mobile footer capture covered the focused content regions. No generated replacement assets were used.

## Comparison history and findings

1. **P2 — desktop result rows too tall.** The first implementation placed advancement text below the maps, increasing row height and moving the next-match area downward. Fixed by aligning advancement text with the map row on desktop, preserving normal document flow on mobile. Post-fix desktop evidence shows both results, next match, and the partner band in the intended order and proportions.
2. **P2 — excessive mobile spacing.** The first mobile render accumulated excessive spacing in the return link, date tabs, upcoming-match area, and compact results. Reduced those margins/paddings and aligned the two team names. Post-fix mobile evidence shows the main matchup, both result rows, and a short remaining scroll to the partners. The actual consequence sentence wraps naturally; it is not compressed to reproduce generated-image text metrics.
3. **P2 — selected date lost blue text on hover.** Restricted hover styling to unselected date tabs. The selected tab retains its cobalt text and underline.
4. **P2 — tablet menu icon inherited a small text size.** Defined a 28-pixel icon and at least a 44-pixel button beyond the phone breakpoint. Verified a 54 × 49 CSS-pixel target at width 800.

No actionable P0/P1/P2 findings remain at the tested widths.

## Required fidelity surfaces

- **Fonts/typography:** existing local YCS Sans/DejaVu Sans regular and bold; clear display/metadata hierarchy, tabular series scores, readable Russian labels. Real font metrics cause minor wrapping differences from the generated reference. Team names remain complete; no ellipsis hides participants.
- **Spacing/layout:** flat full-width desktop result rows, central series scores, compact next-match strip; mobile uses stacked team/score rows, full-width primary action, and a two-team upcoming panel. No horizontal overflow: measured 415/415 and 360/360 CSS pixels for content/scroll width in the mobile frames; 800/800 on tablet.
- **Colors/tokens:** near-black/navy `#03070e`, cobalt `#2f83ff`, white `#f5f6fa`, muted `#aab1c1`, thin gray dividers. No gradients. Wins also use a check and score, not color alone.
- **Images/icons:** real supplied YCS, team, and Dodo assets retained. Icons use the installed Phosphor library. No CSS or generated logo substitutes. Partner text remains text where the source data supplies no logo.
- **Copy/content:** canonical tournament names, BO formats, calendar dates, confirmed series and map scores. No fabricated start time, stream URL, map result, or grand-final opponent. Technical results remain 1:0. Data is derived from tournament JSON.

## Interaction and runtime checks

- Date tabs select 4/5/6 September and update the query string.
- Keyboard End and arrow navigation select/focus date tabs.
- Browser Back restores the selected date, including after leaving the Matchday route.
- Resizing from desktop to mobile and between phone sizes preserves the selected date.
- Mobile menu opens and closes, exposing the expected destinations.
- “Открыть сетку” reaches the actual playoff section; measured section top approximately 0 pixels after navigation.
- “Трансляции” opens the existing broadcasts page. No livestream was invented.
- 6 September shows bobr1ki versus the winner of Н6 without an invented result.
- Completed-tournament and empty-data behavior covered by model tests.
- Browser console checked during the QA session: no new application errors. Older browser-extension and unrelated preview messages were excluded.
- `npm run build`: passed. Existing global CSS still references two absent Nimbus font files; Matchday uses the available YCS Sans fonts and does not depend on those declarations.
- `npm run test:sites`: 4/4 passed.
- `npm run test:matchday`: 5/5 passed.
- `git diff --check`: passed.

## Follow-up polish and test limits

P3: generated-image font rasterization and real browser metrics are not identical. Browser-emulated sizes were tested; native iOS/Android hardware and screen-reader software were not available. These do not block the implemented web layout.

## Implementation checklist

- [x] Shared date-driven desktop/mobile Matchday.
- [x] Exact series/map orientation and technical-win handling.
- [x] Functional bracket, broadcast, date, history, and menu controls.
- [x] Rechecked desktop and mobile after visual fixes.
- [x] Production build and focused regression checks.
- [x] Temporary QA harness excluded from production.
