# Dota homepage — implementation QA, 9 September 2026

final result: passed

## Scope and visual truth
- Source: `docs/design/dota-home/selected-reference.png` (selected updated-map mock, original 819/820 × 1920 raster).
- Implementation: homepage, Dota 2 selected, existing shared tournament data. CS2/corporate and internal-page components retain their previous layouts.
- Whole-view evidence: `docs/design/dota-home/desktop-full.jpg`; paired input: `docs/design/dota-home/comparison.jpg` (source left, implementation right).
- Focused evidence: `docs/design/dota-home/details.jpg` and `details-comparison.jpg` (registration dock, community, results, archive).
- Responsive evidence: `docs/design/dota-home/dota-mobile.jpg`, `dota-4k.jpg`.

## Capture and normalization
Cloud browser rendered the actual Vite application. Native browser viewport approximately 1363×936, density 1. A temporary same-origin iframe exercised real CSS viewports of 1440×3500, 390×844, and 3840×2160. Desktop whole-view screenshot was scaled by 900/3500, then cropped to its approximately 371×900 content area. Source was independently reduced to the same width; differing page heights are retained. The focused comparison reduces the actual desktop viewport to 819 pixels wide beside the corresponding source crop. These are composition comparisons, not pixel-diff claims. The final full-view reaches the legal footer; legal text and links were also inspected through the DOM. Temporary QA HTML was removed before production build.

## Comparison history
1. Blocked: title wrapped into three lines, dock icon became a white rectangle, lower texture was too bright. Fixed two explicit title lines, icon recoloring, and texture multiply treatment.
2. Blocked: exposed straight edge above map. Extended the supplied map beneath the fracture mask.
3. Independent review found undersized desktop dock typography and compressed results rhythm. Increased responsive type sizes and section spacing. Revised full-view and focused screenshots show legible hierarchy.
4. Independent review found legacy selector specificity overriding partner-label color. Added a more specific dark-color rule; browser computed color is rgb(23,32,39). Increased partner edge padding to keep text on the ivory area, enlarged desktop marks. Mobile archive and partners were visually inspected after this fix.
5. Final paired full-view and focused comparisons reviewed by the primary agent and independent `dota_implementation_qa`: no actionable P0/P1/P2 remains.

## Required fidelity surfaces
- Typography: local Cyrillic-capable Roboto Condensed variable fonts, bold italic two-line hero, clear results hierarchy, legible body and registration controls. Raster lettering is approximated by live text rather than baked into an image.
- Layout: fracture/map hero, three-column desktop registration dock, neutral results plus archive, ivory partners and legal footer. Mobile stacks content and retains top theme controls. 390px frame has 375px content plus scrollbar, with scrollWidth equal to clientWidth; 4K content also has no horizontal overflow.
- Colors: ivory display text, red CTA/Dire, blue Radiant, near-black neutral lower background. Partner text contrast corrected and browser checked.
- Images: exact supplied low-angle Yaroslavl map remains a separate unchanged PNG. Generated fracture frame/matte and neutral textures provide decoration only; no soldier or hero in completed-results background. Existing official game/partner logos are retained. Decorative frame and textures encoded as WebP, reducing those three files from ~8.1 MB to ~1.3 MB. Map-only blur computes to 6px at 3840px; frame and live text stay sharp.
- Content: dates, prize, game, champion, score, archive, partner names, legal details, and links continue to derive from existing shared components/data. No fabricated tournament data or form submissions.

## Interaction and technical checks
- Switched CS2 → corporate → Dota, verified aria-pressed and Dota persistence after reload.
- Team registration href is the organizer's Yandex Form ending `6a84359e6d2d7373b491e1e4`; solo-registration href remains intact. No applications sent.
- Conditions button opens upcoming Dota tournament; results button opens completed CS2 results with shared champion data.
- Mobile menu opens and closes with expanded state and navigation exposed.
- Console reviewed: recorded errors were browser-extension metadata messages, not application exceptions.
- Final `npm run build` passed; 42 team records and 120 matches validated. Existing NimbusSansNarrow missing-font warnings remain in the baseline stylesheet; this Dota display uses bundled Roboto Condensed.
- `npm run test:sites`: 4/4 passed. `git diff --check`: passed.

## Accepted differences / limits
Generated stone and brush silhouettes are not pixel-identical to the selected raster mock. Neutral texture and native typography also differ modestly; composition, content, legibility and interaction hierarchy are preserved. Mobile browser verification used a real narrow iframe, not a physical handset. No production deployment or external form submission was performed.

## Implementation checklist
- [x] Shared data/actions preserved
- [x] Updated map and neutral results
- [x] Desktop, mobile, 4K inspected
- [x] Fidelity fixes recaptured and independently reviewed
- [x] Production build and existing packaging checks

## First-load optimization follow-up
- Responsive map derivatives preserve source composition: 768×432 / 1200×675 / 1672×941. Largest map is 271,612 bytes versus PNG 2,464,426 (88.98% less); smaller files 76,172 / 159,742 bytes.
- Five full WOFF2 fonts total 1,004,736 bytes versus TTF 2,609,040 (61.49% less). No glyph subsetting. Independent verifier compared glyph order, cmap, hmtx, hhea, outlines and Roboto variation data: equal.
- Original PNG fracture mask retained to avoid changing browser luminance-mask rendering; this is excluded from savings.
- Map + Dota's two display fonts total 632,864 bytes versus 3,224,166: 80.37% less. Shared fonts bring additional savings only when requested by that page's rendered text.
- Paired browser screenshots of published baseline and local optimized homepage compared at the same viewport. Title, frame, content, spacing and source-map composition preserved; map uses lossy WebP at quality 84. No actionable visual regression after retaining PNG mask.
- Browser selected responsive WebP currentSrc and displayed the actual bundled WOFF2 fonts; build passed. Original source assets remain in the repository but are no longer referenced by the optimized map/font URLs.
- These are file-byte reductions, not a claimed LCP or wall-clock speed multiplier. Actual first-load duration depends on connection and device.

## Wide-screen width correction
Dota home capped at 1280px with matching 1177.6px inner content/footer. Typography and scene height use the capped width. Browser at 2560px: home width1280, left632.5, body width/scrollWidth2545 (15px scrollbar), title147.2px. At 1920px: width1280, left312.5, title147.2px. No horizontal overflow in the actual page. Independent static verifier confirmed CSS scoping, cascade, image sizes and preservation of formulas below1280px. Temporary viewport harness removed. Build passed.


## Dota background payload — September 9

Optimized remaining four background layers; all five background resources now total 691,964 bytes versus 2,097,082 (67.0% reduction). Lossy texture/frame compression and a 768px indexed PNG luminance mask retain the composition. Final local browser screenshot checked after assets loaded; no visible edge/layout regression. Independent file/diff verification passed, content and 1280px cap unchanged. Production build passed. This measures resource bytes, not load-time/LCP improvement.


## Dota width and seams correction

Cap raised to 1800px, inner containers 1656px and responsive map sizes updated. CSS alpha masks blend the hero bottom and partner background edges into the continuous charcoal shell; content is never masked. Browser verified 1800px actual content width inside a 2560px iframe and inspected hero-to-registration and archive-to-partner transitions. Existing image files unchanged. Temporary QA harness removed before build.

## Techies Minesweeper Easter egg — September 9

Implemented only in the Dota homepage hero; game code/styles load on demand. Source: two approved transparent 1254×1254 artwork sheets. Compared source sheets and actual browser capture together: same tiles, characters, controls and title; dynamic counters/results use readable DOM text. Board frame is adapted with border-image rather than stretching the cell grid.

Browser evidence: desktop 1363×936; responsive layout in a 320×780 iframe (not a physical handset). Verified opening, safe first click, ward mode and right-click/keyboard interactions, restart, loss, stopped terminal timer, Escape and focus return. CS2 and corporate themes contain no trigger. Fixed frame occlusion, focus restoration and narrow-layout scrollbar loss; minimum cells measured 32.625px at 320px. No horizontal overflow. No remaining actionable P0/P1/P2 visual findings in the checked views. Browser extension metadata errors were excluded from application errors.

Logic coverage: 1280 first-click cases; exact mine count, independent adjacency oracle, flood boundaries, flagged cells, victory/loss, immutable terminal state, elapsed time and invalid/unavailable local record storage. First scene references approximately 78 KB of optimized artwork; this is file size, not a measured latency promise. All 33 transparent WebP assets total 174,308 bytes. Prior homepage/data/themes retained.

---

# Tournament MVP R3 — final implementation QA, 3 October 2026

This section reviews the tournament MVP redesign only. The earlier homepage reports above are preserved as history and do not constitute this gate.

## Findings

- [P2, resolved] Route-specific header geometry.
  Location: the last MVP-scoped `.ycs-header-row` rule in `src/internal-themes.css`.
  Evidence: the first final captures showed a shortened desktop header, while the shared current website header and `AGENTS.md` require the shared geometry. Root removed the specific 70px override, retaining the current 88px shared header. The regenerated full-view pair and all three wide captures were independently reopened and inspected; navigation order and layout remain correct.
  Impact: the MVP route must preserve the user's current menu, including its shared dimensions.
  Fix completed: removed only the route-specific header size override, recaptured all three wide themes, compared the regenerated source/implementation pair, and rebuilt/rechecked packaging. The final capture retains the six leading Dota rows and readable first calculation.
- No actionable P0/P1/P2 difference remains in the independently inspected final full-view, identity, calculation, corporate, CS2, or narrow-screen images.
- [P3] The Dota riverside crop brings brighter buildings closer to the small score caption than the mock. The caption remains readable. A later art-position refinement could restore a little more quiet background around it; no structural change is needed.

## Scope, object, and independence

- Selected visual truth: `docs/design/mvp/selected-r3.png` inside the separately retained native QA archive documented in `docs/design/mvp/README.md`, the exact third displayed R3 concept selected by Roman. Its original pixels are 1536×1024. SHA-256: `3570175a52722b07b8d388241c29af87e00e485d47426c3d203d8cbb37c1084e`.
- Route/state: spring Dota tournament `dota2-main-2026`, `section=mvp`, playoff phase; first real ranked player and first real map open, top-20 mode. The spring dates remain 25 March–26 April 2026.
- Object at review start: local working copy based on `4f06f08b4c45c5d77e543b6588893cc39ba58c34`, with MVP component/CSS, scoped theme CSS, and the riverside asset modified; documentation and captured evidence are also part of this delivery. This is a working-copy review, not acceptance of the unchanged base commit.
- Final implementation SHA-256 fingerprints: `src/components/DotaMvpSection.jsx` = `c2dd3b50e619ea56f1a7ea71115df300137832015074885c948d442b02805012`; `src/components/DotaMvpSection.css` = `a5693d8110b55fbc5fb1013f80bab341831207da12daec195f01f1cc596bda10`; `src/internal-themes.css` = `ca50372b30a19f1a48ccfdf9c8592cf7e8cef29c683b0969ad8c44388e5620bf`; riverside WebP = `9f20bef03f84852240e077732ca7a8afe3cb88c816a6d014576a321b0ef280c8`.
- Independent reviewer: `/root/final_qa_report`, which made no implementation or visual edits. This reviewer opened the source and all listed image comparisons, inspected the supplied browser evidence and final logs, and checked the relevant source structurally. Browser interactions and captures were executed by the root agent; they were not independently replayed by this reviewer.
- Prior verifier reports of six SSR cases and 38 checks are supplementary history from another executor, not tests executed in this review and not added to the saved-log totals below.
- Scope: selected composition, shared menus, all three themes, responsive structure, visible and expanded calculation content, accessible disclosure behavior evidenced by root, and existing build/functional/packaging gates. API ingestion completeness, collector deployment, and production publication are outside this local visual gate.

## Capture and comparison evidence

- Browser-rendered implementation files: `docs/design/mvp/implemented-dota-wide.jpg`, `implemented-corporate-wide.jpg`, `implemented-cs2-wide.jpg`; each is 1275×850.
- Full-view combined input: `docs/design/mvp/comparison-full.jpg` inside the same native QA archive, 1275×1700; source above, implementation below. The source was reduced from 1536×1024 to 1275×850, and the actual 1536×1024 CSS application viewport was captured through an outer 0.83-scale fixture and cropped to the same 1275×850. Browser chrome is excluded. The application rendered its own live UI; the fixture scaled the presentation only.
- Focused combined inputs: `comparison-identity.jpg` (510×405) and `comparison-calculation.jpg` (1500×310); source left, implementation right. These were inspected together to compare display type, team wrapping, totals, table alignment, formula affordance, and raw/contribution labels. These focused crops predate the header-only correction; the component content in the crops did not change. Final whole-view captures show that unchanged content after its 18px downward shift.
- Narrow captures: `implemented-mobile-390.jpg` (390×936) and `implemented-mobile-calculation-320.jpg` (320×936), actual CSS-width iframe renderings at density 1. The first shows context, wrapping local menu, identity above ranking, and the initial map. The second is a scrolled calculation/ranking crop; its partly clipped map heading is capture position, not a lost control. It also shows the visible keyboard focus outline.
- Browser evidence: `docs/design/mvp/browser-evidence.json`, 31 recorded states from the actual local Vite app in the cloud browser, including three final shared-header states. Native browser viewport was approximately 1363×936, density 1. CSS-width iframe tests covered 320, 390, 1536, 1920, and 2560. These are responsive browser tests, not physical-phone or touch-device certification.
- No mobile R3 mock or separate CS2/corporate R3 mock was supplied. Those captures are evaluated against the selected structure and the existing theme contracts, not against invented alternate visual truth.

## Required fidelity surfaces

| Surface | Independent observation | Status |
| --- | --- | --- |
| Fonts and typography | Dota retains an ivory serif title and leader name, dominant mint total, and readable live sans-serif ranking/calculation text. The focused pair shows preserved hierarchy and no lost score digits. Full API nicknames wrap at narrow width, including `Ryūketsu \| 竜血`, rather than using the mock's abbreviation. CS2/corporate retain their existing bold sans-serif identity. Modest raster/native font and antialiasing differences remain. | PASS |
| Spacing and layout rhythm | Leader identity occupies the left margin; ranking and first calculation align on the right. Six contributions remain grouped, with a 3×2 grid on narrow screens. Thin rules and sparse surfaces preserve the editorial layout. Narrow identity precedes ranking. The final captures retain the existing 88px shared header; this intentionally takes precedence over the mock's shorter header. | PASS |
| Colors and tokens | Dota uses deep teal, ivory and mint; CS2 uses navy/cobalt; corporate uses white/navy/cobalt. Selected row and disclosure surfaces are distinct without obscuring values. Qualitative provisional copy remains visible. | PASS |
| Image quality and asset fidelity | Original YCS logo and supplied Dota map remain real assets. Dota lower decoration is a separate generated riverside raster in the selected art direction, with no rasterized controls or fake portraits. Corporate uses the actual Strelka photograph; CS2 keeps its established chair hero. Riverside crop is intentionally not pixel-identical to the mock and has the minor P3 caption proximity noted above. | PASS, P3 retained |
| Copy and content | Current global/local menus remain intact. The UI shows scores and individual match IDs, never counted-map quantities or pending/excluded summary counters. It explicitly describes a provisional retrospective calculation rather than an official historic MVP award. Team matching and original nicknames remain data-driven. Extra native formula/source disclosures preserve verifiability. | PASS |

## Criteria and behavioral evidence

| Criterion | Scenario and observed result | Evidence / executor |
| --- | --- | --- |
| Current menus | Global order is `Турниры / Matchday / Архив / Трансляции / Партнёры / О проекте`. Local order is `Итоги / Круговой этап / Матчи 29 / Плей-офф / MVP турнира / О турнире`. No invented navigation entries. Final header dimensions are restored as described above. | Three regenerated wide captures and final shared-header states, independently inspected |
| Default selected composition | Leader `КАМЕНЬ`, tournament total `506,19`; first player's row and map 8747660400 are open by default. | Default browser state and wide/narrow captures; root executed, independently inspected |
| Genuine ranking and calculation | Next displayed totals are `363,96 / 348,03 / 339,90 / 338,88 / 336,24`. First map is `7,40`, with contributions `2,00 / 4,95 / 0,00 / 0,11 / 0,00 / 0,33` and metrics K3, A3, L0, D5304, T2120, H0, C1,7, V0, S2. Exact formula is preserved; rounded visible contributions need not add to the separately rounded exact total. | Focused calculation pair and final expanded text; independently inspected |
| Top/all modes | Root's actual browser evidence changes from the default 20 rows to 100 rows; leader total remains `506,19`. | `all-players` and default/final states in browser evidence |
| Disclosure access | Root reported Enter-key activation of player and map controls. Recorded states show rival expansion and first map collapse; `otherSourcesVisible` remains true after collapse. Source inspection confirms other sources are outside the first map's open calculation branch. | Root browser evidence plus independent static check; keyboard trigger not replayed here |
| No prohibited counters | Fully expanded formula, maps, player sources and provenance contain no counted-map quantities or pending/excluded counters. Individual pending map IDs and qualitative reasons remain. The `maps: 15` value in the QA JSON is measurement metadata, not rendered UI. | `final-disclosures-expanded` text, independently inspected |
| All themes and responsive widths | At 320/390/1920/2560 CSS widths in every theme, `scrollWidth` equals `clientWidth`; viewport scrollbar accounts for the 15px difference. Leader total remains unchanged. Narrow rows wrap names and preserve scores; no page-wide horizontal scrolling is recorded. | 12 width/theme states plus final repeats; root browser capture/measurements, independent image/evidence inspection |
| Empty state | Final empty state reads `Пока нет лидера` and `Рейтинг ещё не рассчитан`, with `scoreCount: 0`. No fabricated zero score or leader. | `final-empty` browser state |
| Console | All recorded errors have a `chrome-extension://` metadata-message source. No application exception is present in this captured console evidence. | `browser-errors` logs; independently inspected |
| Build and regression | Saved fresh build log after the header correction finishes validation/prerender/packaging successfully; unchanged functional code has 56/56 checks, and refreshed Sites packaging has 6/6, zero skips. Root's final `git diff --check` also passes. | `r3-build-recheck.log`, `r3-functional-tests.log`, `r3-sites-tests.log`; root executed, independently inspected; diff check also executed here |

## Comparison and correction history

1. Earlier `iteration-1.jpg` shows an oversized hero, smaller identity/calculation text, and ancillary sidebar facts competing with the MVP composition. Subsequent implementation compacted the MVP context, increased display/row/metric legibility, and removed ancillary MVP-route facts. The initial and revised combined images were independently inspected in this review.
2. A prior independent verifier reproduced old counted-map/pending/excluded text leaking through raw `snapshot.sourceNote`. Root replaced it with controlled retrospective copy while retaining structured qualitative statuses. This reviewer statically confirmed the raw source note is no longer rendered and checked the expanded browser text for the prohibited summaries. The prior verifier's reported post-fix SSR run is supplementary, not independently rerun here.
3. Other-map access was previously coupled to the first map's open calculation. Root moved the native source disclosure outside that branch. The final recorded collapsed state retains source access; this reviewer confirmed the corresponding source structure.
4. Root corrected a inherited 320px body minimum-width overflow for the MVP route. Final browser measurements for all three themes show 305px client/scroll widths at a 320px viewport, and 375px at 390px. Narrow screenshots were independently inspected.
5. Final consistency review identified the MVP-only shortened shared header. Root removed the 70px override so the existing 88px shared geometry is restored. This reviewer reopened the regenerated full-view source/implementation pair and all three wide-theme captures, and inspected refreshed build/packaging logs. All three final DOM states show an 88px header, 1521px client/scroll widths at the 1536px CSS viewport, and no horizontal overflow. No dependent structural or legibility regression was found.
6. An earlier build-artifact packaging check failed in two cases, then a fresh full build and all six packaging checks passed. The original trigger has not been established. A standalone-prerender trap was investigated as a hypothesis, not asserted as the cause. No unrelated build-script fix belongs to this UI change.

## Open questions, limitations, and next action

- No open blocking question remains for this local UI gate. Main-branch publication and the existing site's runtime readback are the next separate delivery step.
- Captured browser interactions are root evidence; my independent contribution is source/implementation visual comparison, evidence/log inspection, and targeted structural checks. This is not a claim of an independently replayed end-to-end browser run.
- No physical handset, touch input, screen-reader session, or production deployment is certified by this report. CSS-width tests and native keyboard affordances cover the stated local gate.
- Roman's final aesthetic response is subjective and remains his own acceptance; technical/design QA does not claim a user satisfaction score.

## Implementation checklist

- [x] Selected exact R3 source opened and paired with actual implementation
- [x] Full view and focused identity/calculation comparisons inspected
- [x] Three themes and narrow captures inspected
- [x] Real data, provisional copy and prohibited-counter removal checked
- [x] Existing functional/browser evidence and saved logs inspected
- [x] Shared header correction recaptured and reviewed
- [x] Refreshed build and packaging gates inspected

handoff_schema: FEATURE_HANDOFF/1
handoff_digest: 880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4
evidence_status: VERIFIED for the named local UI gate and final implementation fingerprints above
gate_verdict: PASS
next_action: root hands the verified revision to the authorized repository/publication owner and verifies the existing runtime separately
return_to: /root
final result: passed

### Delivery packaging follow-up

The large selected-source PNG and full-view comparison retain their exact bytes
in the separately delivered native QA archive identified in
`docs/design/mvp/README.md`. GitHub binary transport stalled on the comparison;
only evidence packaging and these references changed after the local UI gate.
Every checked runtime component, stylesheet and asset retains its accepted
fingerprint. This does not alter the visual verdict or claim production runtime
verification. Archive extraction restores the original two review paths.
