# Match-center design QA

Source visual truth: selected Dota BO1 `exec-e11db36b-9e9a-4aa3-870c-86589b5d3c3e.png`,
Dota BO3 `exec-e6bb9e55-13ce-42ae-b5e7-86a498a7ff77.png`, CS2
`exec-adc82e1d-6ef4-4120-8f40-c1b37489b78a.png` from this conversation. Source pixels:
1092×1440 (Dota BO1), 921×1708 (CS2). The paired JPEGs include source and render.

Implementation: actual cloud Chrome, `terminal.local:4173`, real React components.
Final evidence under `docs/design/match-center/evidence/`. Browser native viewport
1363×936, DPR1; local iframe viewport widths used for responsive verification.
The isolated fixture harness was removed after verification and never enters build.
Dota uses captured, validated public MVP revision19 for visual QA, not a new live
snapshot claim. CS2 uses the actual lower final with three published maps.

## Comparisons and state differences

- Full-view Dota: `dota-compare-v2.jpg` → `dota-compare-final.jpg`.
  Source and rendered pixels were placed together, scaled equally to640px wide.
  Final capture used a1092px iframe with a15px scrollbar (1077px content); this
  small density difference and the preserved shared menu breakpoint are accepted.
- Full-view CS2: `cs2-compare.jpg`, equal480px-wide source/render panels.
  Render is assembled without resizing from two actual921px-wide captures:
  top0–845 and a focused view starting at845, then normalized for comparison.
- Focused CS2: `cs2-focus.jpg`, 1:1 selected map, MVP empty state, rosters and context.
- Mobile: initial1:1 header and MVP/table captures plus `mobile-final.jpg` at actual
 390 CSS px rendered in a0.34-scale evidence canvas. Body scrollWidth390. CS2 also checked at320px, scrollWidth320, no broken images.
- 4K: `dota-4k.jpg`, actual3840 CSS px iframe rendered in a0.3-scale evidence canvas.
  DOM measurement confirms1800px content centered atx1020, scrollWidth3840.

Mock data intentionally differ: actual players/results/crests replace fabricated
ones; the real CS2 grand final has five unpublished map details. There is no
recording or clip on these actual fixtures, so the corresponding action/section
is absent. CS2 metrics/MVP are pending. No false championship or after-match
standing is inferred. Dota uses damage rather than absent GPM. Mock hero avatars
are omitted because the public payload has IDs without a verified portrait asset
mapping. These are expected data-contract differences, not unfinished controls.
The existing1200px shared menu breakpoint remains; the generated source's full
navigation at921/1092px was not copied over the production header.

## Findings and comparison history

1. P2, BO1: redundant one-card navigation left a large blank band. Removed the
   picker for BO1 and implemented overview/statistics anchors; series retains tiles.
2. P2, desktop layout: hero density was too loose and stone detail collided with
   summary text. Tightened hero dimensions/scoreboard and added an opaque text
   area. Paired post-fix Dota capture checked the hierarchy and readable result.
3. P2, mobile: three action buttons cramped and Puck overlapped explanation text.
   Share now takes a second row; character width/padding reserve clear text space.
   A stone horizontal edge crossed the title on mobile; mobile uses the clean
   surface while retaining battlefield/character art. Final rendered capture and
   1:1 MVP inspection verify the correction, with no page overflow.
4. Functional P2 findings (unplayed/cancelled MVP, same-revision catalog clip
   refresh, multiple CS2 MVP copy) were fixed and independently regression-tested.

No remaining actionable P0/P1/P2 in the inspected scope.

## Required fidelity surfaces

- Typography: local YCS Sans / Roboto Condensed; bold score/display hierarchy,
  smaller data labels, readable table numbers and wrapping long actual team names.
  Condensed CS2 headings are a minor P3 brand/type difference from generated art.
- Spacing/layout: panorama, outcome strip, map progression, split summary/award,
  two team sections and context. Mobile stacks columns; 4K caps at1800.
- Colors: Dota dark teal/mint and CS2 navy/blue, with gold only for MVP. Textual
  statuses accompany selection and no-play states; focus outlines are explicit.
- Imagery: actual crests, supplied/generated raster panoramas, map illustrations
  and transparent characters. Images inspected, no broken loaded image observed.
  Decorative label prevents implying Puck/CT is the real selected player/hero.
- Copy/content: confirmed scope and score units; unknowns/estimates/ties remain
  honest; no demo figures, invented duration/GPM or fake video thumbnail.

## Browser interactions and checks

Independent real-route checks: tile→selector synchronization, winner/details/MVP
heading changes, next-match link to real BO5, no-play and pending map isolation.
Organizer component checked with explicit synthetic transport: save/edit/reload,
second-map empty state, conflict preserving draft and fresh retry, delete→hidden.
Actual auth/CAS/storage behavior tested separately through local HTTP/storage doubles.
Root checked copy-link HTTP fallback and actual downloaded PNG result card.
Console inspection: no application exception in controlled rendered states; an
unrelated browser-extension metadata error was excluded. Production media API is
not yet deployed; live external integration is not certified by this local QA.

## Implementation checklist

- [x] Selected design hierarchy and separate game art
- [x] Shared-header and sports-data preservation
- [x] Honest per-map data/MVP and optional clips
- [x] Responsive and keyboard-labelled controls
- [x] Independent functional and focused browser verification
- [x] Actual paired source/render comparison and post-fix evidence
- [ ] Separately authorized production release and live readback

final result: passed
