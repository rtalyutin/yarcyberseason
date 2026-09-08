# Home themes — image provenance

The CS2 skin preserves the pre-existing `home-team-stage.webp` and all original
styles. Dota 2 and Corporate use the same unchanged-content React home page.
The selected theme is stored as `ycs-theme`; missing/invalid/unavailable storage
falls back to CS2. The internal tournament and Matchday layouts remain intact.

## Real Yaroslavl photograph

- File: `public/assets/themes/yaroslavl-strelka.webp` (2000 × 1325).
- Subject: Strelka park and the Assumption Cathedral, Yaroslavl.
- Author: Alex “Florstein” Fedorov (Алексей Фёдоров).
- Date: 5 October 2015. This is a historical photo, not a claim about today's view.
- Source: https://commons.wikimedia.org/wiki/File:Strelka_of_Yaroslavl_03.jpg
- Original: https://upload.wikimedia.org/wikipedia/commons/1/12/Strelka_of_Yaroslavl_03.jpg
- License: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
- Modification: proportional downsampling and WebP encoding only. The photo
  has not been passed through an image generator or geometrically retouched.
  The WebP derivative retains CC BY-SA 4.0; its creator attribution is shown
  in the common footer. CSS color treatments and the separate YCS logo
  are disclosed there. No rights in the underlying photo are claimed.

## September 8 user revision

- Dota hero: `yaroslavl-dota-map.webp`, encoded from the exact user attachment
  `c9fb5470-69d9-4e98-bec1-73c214b2838a.png` (1672 × 941), WebP quality 94.
  No regeneration, additions or geometric editing. This is supplied fantasy
  artwork, not a claim of independently verified geographic accuracy.
- Desktop presents it as a background; mobile shows the complete map above
  registration content so that both bases survive responsive framing.
- Corporate: original `public/assets/ycs-logo.jpg`, with screen blending and
  CSS framing to remove unused black margins. No invented replacement mark.
- The rejected silver sculpture and old Dota ring are no longer rendered.
  Historical files remain available for reference; neither is loaded by the UI.

## Font

`DejaVuSerif.ttf` provides the Dota headline's Cyrillic serif face; the license
is included at `public/assets/fonts/LICENSE-DejaVu.txt`. Existing CS2 fonts
and fallback behavior have not been changed.
