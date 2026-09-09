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
