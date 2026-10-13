# Dota hero picks — verified release

Accepted implementation:270f87a81644eb1e3300da9ee8923487a7510fd0.
Published source main:42266d871ee3354cc18d1309f142d8293ecb43c4.
Accepted tree:2fdb1e84ff5c646bf4db66f2593574438525304b.
Functional fingerprint:bc47884fc4797541ab47ce9e3c09bc5511fece977964a1495f9f2e14e958708d.

- Author regression gate:29 passed, zero failures/skips. Independent SSR:6 distinguishing cases and17 existing regressions passed.
- Integrated build:52 teams,150 matches,215 canonical URLs and3 aliases.
- All127 official hero catalogue entries and local128×72 portraits verified.
- Independent live readback:ten correct player portraits/names plus the selected-map MVP portrait; existing numerical statistics unchanged.
- Real BO3 map1→2 selection switches all ten verified picks. The technical third map has no picks, statistics or award.
- CS2 rendering retains its existing map details and has no Dota hero elements.
- All127 deployed portraits and relevant CSS match accepted bytes exactly. Hosted JavaScript differences are build timestamp, hashed imports and minifier variable aliases.
- Desktop browser1363×936:page width1348, no page-wide horizontal overflow.
- Local browser,320/390 viewports and an actual image-error event were NOT_RUN. Image-error fallback was reviewed statically.

This public checkpoint stores verification verdicts and code provenance only. Raw snapshots, player identifiers, screenshots, per-player metrics, fixtures and DOM records remain outside this publication.
