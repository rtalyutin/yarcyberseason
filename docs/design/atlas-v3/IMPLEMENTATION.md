# Atlas v3 frontend implementation

The accepted atlas is implemented on the existing YCS frontend. The three
themes share content structure and features; their typography, materials,
controls, decoration and motion differ throughout the page.

## Page coverage

| Surface | Implementation |
| --- | --- |
| Home | `AtlasHome.jsx`: tournaments, real final and podium, calendar, partners |
| Tournament catalogue and archive | Shared directory, theme-specific cards and filters |
| Tournament and all sections | One navigator, dense match cards, Swiss tables, brackets, MVP, participants and rules |
| Matchday | Rebuilt chronological program, date navigation, channel and direct tournament links |
| Match detail | Shared series, maps, statistics, rosters, result and tournament navigation |
| Team | Same statistics and discipline history in all themes |
| Broadcasts and partners | Full content styling, source-backed links and status labels |
| About | Selected theme with existing company identity and requisites |
| League intake | Selected theme; original fields, brand, consent and API unchanged |
| Organizer `/org`, `/orgs` | Persistent theme shell without remounting page state |
| WebMCP and format simulator | Theme shell and controls, original functions retained |
| Not found | Shared themed shell and navigation |

## Presentation layers

`atlas.css` loads tokens, foundation, content, home and utility styles last.
The `data-ycs-theme` boundary scopes the new system. CS2 uses steel/navy,
condensed headings and stepped transitions; Dota uses dark stone, bronze and
serif headings with a short scale transition; corporate uses light surfaces,
cobalt, sans-serif headings and a short vertical reveal. The motion hook only
animates presentation after an explicit interaction. It respects reduced
motion and cancels work on cleanup; it does not move focus or alter routing.

The new Matchday keeps query-string dates and Back/Forward. Arrow keys move
date focus, Enter/Space activate. Resizing keeps the selected date visible.
Known times are ordered chronologically; unknown times and results remain
explicitly unknown. A project channel is not interpreted as a live match.

## Assets and Easter eggs

`public/assets/atlas/web-exports.json` records dimensions, source and output
hashes. Five WebP images were encoded for delivery at quality 86 without
cropping or changing dimensions: 9,638,726 source bytes become 1,557,582 bytes.
The transparent Dota frame remains byte-for-byte identical to its source.
The icon sprite, dividers and provenance accompany the implementation.

The original CS2 ClickHighlight scene/anchor, Dota Techies game and footer
OrganizerRoom remain. The previously empty wrong-ward image is replaced by
the existing ward and a vector cross. No demo tournament data was imported
from the illustrative layouts.

## Delivery boundary

Baseline: `542261c65a83eadcd5e1488baa8d02f77899cae7`.
This change does not modify sports data, API/backend, Telegram Mini App,
hosting configuration, dependencies or the lockfile. The existing Timeweb
Git integration builds `main` with `npm run build` and serves `dist/client`.
Publication must promote the verified tree with an expected-head check and
verify the new HTML/assets on the existing production domain.

Validation and the explicitly uncovered paths are recorded in
`VALIDATION.md`; browser images are in `evidence/`.

## Browser observations before publication

The implementation team inspected all three home themes on desktop, Dota and
corporate home at 390 px including lower partner/support/footer content, and
Matchday in all themes on desktop and at 390 px. Matchday also passed at 320 px:
date keyboard activation, history restoration, direct tournament navigation and
selected-date visibility on resize. The iframe used classic scrollbars; measured
content widths were 305/375 px for the 320/390 px viewport settings, with no body
horizontal overflow.

Swiss was inspected in all themes on desktop and in Dota/corporate at 320 px.
Team detail passed all themes at 320/390 px. Dota catalogue, corporate broadcasts
including its lower history, Dota 404 and actual final-match content in CS2 and
corporate were inspected. Selecting map 2 updated its score, duration, statistics
selector and source link together. About, League intake, organizer, WebMCP and
the format simulator were inspected in all themes, including narrow and lower
content. These are representative visual checks, not exhaustive screenshots of
every route at every viewport size.

All three Easter eggs were exercised: CS2 exact scene/trigger alignment,
automatic return/replay/focus; Techies safe first reveal and Escape/focus; footer
three-click entry, pet reaction and Escape. The last CSS fix restores light
OrganizerRoom headings on its original dark dialog in corporate: observed
`rgb(237,243,255)` on `rgb(13,21,36)` after the fix.

Preview could not load the external MVP snapshot and correctly showed its
unavailable/pending state. No production organizer write, authentication test or
photo submission was made. Production deployment/readback is a separate release
step; passing this preview does not itself establish that publication occurred.
