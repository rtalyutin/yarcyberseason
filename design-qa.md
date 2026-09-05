# Design QA — home page conversion layout

## Compared

- **Source:** selected Product Design option 3, `generated_images/exec-39e64ce2-c3ee-4972-b22a-14a816124542.png`.
- **Implementation:** `/` in the local preview, inspected in the cloud browser at desktop and in a 390px embedded viewport on 2026-09-05.
- The source and desktop implementation were opened together in one visual comparison input. The mobile check used the same route in a 390px viewport.

## Iteration

1. **P1 — hero heading wrapped into four desktop lines and the hero had a hard image edge.**
   - Fixed by using the generated full-width stage image, expanding the copy lane, and setting a desktop headline scale that preserves the intended two lines.
2. **P1 — game marks were too dark against the dark background.**
   - Fixed with a high-contrast rendering treatment for the supplied game marks.
3. **P2 — the live CS2 block did not reflect the newly published final.**
   - Fixed through tournament JSON: PIVNAYA KEGA — SAITEN x BAD.RABBIT 2:1; grand final bobr1ki — PIVNAYA KEGA at 15:00, 6 September.

## Required fidelity surfaces

- **Fonts and typography:** display hierarchy follows the reference: large white/blue campaign statement, restrained uppercase navigation and metadata, and clear tournament names. Desktop heading keeps the intentional two-line construction; 390px adapts without clipping.
- **Spacing and layout rhythm:** slim header, full-bleed hero, then two balanced lower columns match the source composition. Mobile becomes a single column with adequate tap space and no horizontal overflow.
- **Colors and visual tokens:** near-black ground, cobalt CTA and editorial accents, muted blue-gray metadata, and fine cool-blue dividers track the selected mock.
- **Image quality and asset fidelity:** the hero uses the generated five-chair stage image at native scale; game marks and existing team logos are real assets, with no HTML/CSS illustration substitutes.
- **Copy and content:** Dota registration and archive rows come from tournament JSON. The CS2 module dynamically selects the unresolved playoff match, which now renders the scheduled grand final and its confirmed participants/time.

## Interaction and responsive checks

- Registration remains a working email CTA supplied by the Dota tournament JSON.
- “Условия участия”, Matchday, archive rows, primary navigation and mobile menu retain working routes.
- Desktop navigation and Matchday CTA were found once each in browser DOM; the 390px check showed the menu control and registration CTA without clipping.
- Browser console had no application errors. The only logged error came from the cloud browser extension’s metadata channel, not the app.

## Follow-up polish

- P3: if the missing condensed font files are added later, the navigation and small metadata can match the image’s lettering even more closely.

final result: passed
