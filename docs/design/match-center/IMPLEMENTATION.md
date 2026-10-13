# Expanded match center

Implemented locally on `codex/match-center-2026-10-12`, from main
`041c442dcf63a295e931bebbc3c63ac303fe720d`. User selected the entire Dota/CS2
match design, BO3 behavior and manual map moments. No publication is claimed.

## Rendering and data

`MatchCenterPage.jsx` shares the structure; `DotaMatchPage.jsx` supplies the
existing validated MVP client. Matching Dota/CS2 themes opt in; the corporate
and other legacy presentations are unchanged, as is SiteHeader geometry.

- Central confirmed series score and actual team crests; discipline-specific art.
- BO1 overview links; BO3/BO5 map navigation with synchronized selector, map
  result, rosters, award and clips. A confirmed 2:0 BO3 has an unplayed third slot.
- No map winner inferred from Dota kills. Unknown results stay unknown. Explicit
  live/scheduled/cancelled map state takes precedence over retained snapshots.
- Main Dota award sums existing exact per-map scores for this fixture's actually
  played maps, grouped by accountId. It is independent of map selection; the
  selected-map award is secondary. BO1 is equivalent to its single played map.
  Exact ties, estimates, correction and stale information remain explicit;
  incomplete/unfinished/estimated/stale/correction data gives a provisional leader.
- Dota table uses K/D/A, hero damage and MVP. GPM/XPM are absent from the
  public contract and are not fabricated. Each selected-map player's validated
  `heroId` supplies their hero portrait/name, including the map's MVP and ties.
  Main MVP shows the player and a map-ordered strip of actual picks and point
  contributions. The persistent decorative Puck is no longer rendered. Existing
  lightweight local hero portraits and one shared crown emblem are reused.
- CS2 supports optional confirmed `map.playerStats` with ten unique players,
  five per actual team. Fields: accountId, nickname, teamId, kills, deaths,
  assists, adr, headshotPercent. Missing optional metrics remain null.
  `map.mvpAccountIds` must explicitly refer to those players; no guessed rating
  or MVP formula is introduced. Current CS2 sources have no such player metrics;
  this is shown honestly. Registered tournament rosters are labelled separately.
- Optional canonical match.broadcastLinks behavior remains unchanged. No global
  channel/legacy fallback and no LIVE inference from links or elapsed dates.
- A missing clip hides the video section. A real recording/clip URL is an
  external link; no fake poster, automatic highlight detection or video cutting.
- Copy-link fallback and PNG result download are retained and browser-tested.

Map projection: `src/lib/match-center.js`; selected-map MVP:
`src/lib/dota-match-mvp.js` (getDotaSeriesMvp and getDotaMapMvp). Technical maps,
including retained raw links at explicit technicalMapNumbers, are excluded.
Missing maps are never zero; replacement players retain separate account IDs.
Public media/storage/admin contract and exact future
runtime requirements are in `docs/organizer-table.md`.

## Artwork

New text-free generated raster assets live in `public/assets/match-detail`:
Nuke panorama; Dust II, Mirage, Inferno, Anubis, Ancient thumbnails; CT operator;
Puck; Dota battlefield. Source generation was guided by the selected mockups.
Images depict game atmosphere, not exact game geometry or match footage.
Transparent character PNGs were inspected and encoded as WebP. Existing Volga
panorama and stone raster are reused. Real team logos remain authoritative.
No complete UI screenshot was embedded, and no substitute CSS/SVG artwork used.

## Verification and release boundary

See project-root `design-qa.md` and `evidence/` for rendered comparisons and
`evidence/independent-README.md` for independent functional checks.

No sports JSON, fixture schedule, private captain state, formula or collector
was edited. Frontend build and canonical backend packaging were checked locally.
The Dockerfile includes all four new media/model modules. Production uses a
separate Tg-mcp adapter: publishing this feature must mount the same authenticated
organizer/public media routes and package those files there, alongside frontend
publication. The existing credentials/bucket are reused; real S3 writes, runtime
activation and production readback have not been performed.

Final local build passed: Vite compilation, data validation (52 teams/144 matches),
209 canonical prerendered URLs plus3 aliases, Sites server bundle. Root combined
regression suite52/52, zero failed/skipped. Existing Docker dependency closure test
passed1/1 and observed /healthz200 from the staged package. No QA harness remains.

## Hero picks correction — 13 October 2026

`DotaHero.jsx` resolves only the validated selected-map `heroId` against
`src/data/dota-heroes.json`. No pick is inferred from a nickname, a roster or
another map. Unknown IDs show «Герой не указан»; a failed image preserves its
verified name. Estimated MVP rows retain actual confirmed picks and unknown
individual metrics. Technical/unplayed maps have no player picks or award.

The 127-entry catalogue was retrieved from Valve's official
https://www.dota2.com/datafeed/herolist?language=english on 13 October 2026.
Names use `name_english_loc`; portrait filenames use the returned canonical
`npc_dota_hero_` name. Every source image returned HTTP200 from
https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/.
Local 128×72 WebP derivatives total 332,562 bytes in
`public/assets/dota-heroes/`. There is no additional external image/API request
at render time. These are factual Valve portraits, not generated artwork.

Only Dota player identities and the Dota map MVP badge change. CS2 statistics,
scoring, schedules/results, collector packages, header and optional media
contracts remain unchanged. The earlier no-publication paragraphs describe
the original local preparation; current release status is in TASK_STATE.md.
