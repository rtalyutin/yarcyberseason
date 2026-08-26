# Design QA — CS2 matchday / Fight Sheet

## Comparison target

- **Source visual truth:** `/workspace/scratch/61a5a865eaf7/generated_images/exec-9da20981-c75d-497c-ba40-8551bd902bcc.png`
- **Source pixels:** 1536 × 1024 px.
- **Implementation capture:** browser-rendered viewport capture emitted inline by Cloud Browser; the runtime does not persist its screenshot bytes into the workspace.
- **Implementation route:** `/tournaments/cs2-august-2026/matchday`
- **Desktop viewport:** 1363 × 936 CSS px, `devicePixelRatio: 1`.
- **Mobile test frame:** 390 × 844 CSS px; visible DOM and interaction state checked in a same-origin responsive iframe.
- **Primary state:** second-round schedule visible; first-round results collapsed by default.
- **Secondary state:** first-round accordion expanded with four played matches and four technical wins.

## Full-view comparison

- The final source image and final desktop render were inspected in the same QA pass.
- Preserved the selected Option 2 hierarchy: date rail, oversized condensed `FIGHT SHEET`, one featured pairing, three compact remaining pairings, first-round result ribbon, automatic advances, and partner band.
- Preserved the approved palette and restraint: near-black field, white condensed display type, cobalt accents, thin technical rules, no gradients and no decorative card stack.
- The live site shell and available team assets intentionally replace the mock’s fictional header treatment and unavailable official team marks. Default per-tournament team logos remain visible until the organiser swaps the files.

## Focused regions

- **Featured match:** HellWarriors vs SAITENxBAD.RABBIT is the visual anchor; both logos and full team names are visible.
- **Remaining matches:** Hunger to victories, GoonGang, Resistance, PIVNAYA KEGA, bobr1ki and DealDucks render without clipping.
- **Results accordion:** closed on initial load; open state shows four score lines (`13:1`, `13:2`, `13:1`, `13:1`) plus four technical winners.
- **Automatic advances:** Веселый гроб, PSB_Bank, Flouk Team and CipHer remain visible outside the closed results block.
- **Partners:** three partner slots render; the actual `/assets/partners/dodo-pizza.jpg` asset loaded at its native 944 × 355 px dimensions.

## Comparison history

### Iteration 1 — resolved P2

- **[P2] Featured eyebrow collided with the oversized heading.**
  - Fix: separated the eyebrow and heading with an explicit 24 px gap and stable stacking order.
- **[P2] `Hunger to victories` was ellipsized in the rundown.**
  - Fix: enabled controlled multi-line team names in rundown rows.

### Iteration 2 — resolved P2

- **[P2] A React warning was emitted because `defaultOpen` was forwarded to `<details>`.**
  - Fix: removed the unsupported prop; native `<details>` now starts closed and toggles without console warnings.
- **[P2] Long team names could be truncated in the four-column result ribbon.**
  - Fix: enabled two-line wrapping inside result identities.

## Browser verification

- Desktop: 4 scheduled pairings, 4 automatic advances and 3 partners detected.
- Desktop: no horizontal overflow and no broken images.
- Accordion: toggled open and closed successfully; expanded DOM contains 4 completed matches and 4 technical wins.
- Mobile: the 390 × 844 rendered DOM exposes the mobile `Меню`, all four second-round pairings, the collapsed result summary, automatic advances and all three partner entries.
- Mobile accordion: expanded successfully and exposed every score and technical winner.
- Console: no application warnings or errors. One Chrome-extension metadata error is external browser tooling noise and does not originate from the site.
- Build: Vite production build passed.
- Worker contract: all 4 Sites tests passed.

## Findings

- No remaining P0, P1 or P2 issues.
- **[P3] Asset fidelity:** most current team marks are deliberate tournament-scoped defaults. Replace the corresponding SVG files in `public/assets/teams/cs2-august-2026/` when official logos arrive; no component change is required.

## Open questions

- Match times for the second round are still marked `Время уточняется`, matching the supplied data.

final result: passed
