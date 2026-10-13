# Match detail task state

## Hero picks correction — 13 October 2026

- User reports missing picked heroes on the match page. This is a local
  correction of the selected Dota match center, within the existing publication
  authorization, not a new visual direction or a sporting-data update.
- Fresh base main a07967d7f8ff8b7631246f734d2e850009aa22a3, including newer
  R3/R4 schedule/result changes. Those files are preserved.
- Selected-map heroId drives portrait/name next to each nickname and in map MVP.
  Official Valve catalogue and local portraits cover 127 heroes. Unknown IDs
  and unavailable images have truthful fallbacks. No-play/pending maps retain
  their existing honest states; estimates retain actual picks and metric dashes.
- Author build passes: 52 teams /150 matches,215 canonical URLs +3 aliases.
  Focused existing per-map/MVP regression tests pass29/29,zero skipped.
- Independent acceptance and actual browser verification are in progress.
  Publication of this correction has not yet happened at this checkpoint.
- Original expanded match-center release below completed on 12October:
  frontend main f140bb9c / runtime main c7a4581f; their live page/API readbacks
  were verified. The older preparation statuses are historical checkpoints.

## Current contract — 12 October 2026

- User selected the complete Dota + CS2 match center, including BO3/BO5 and
  manually authored map moments (clarification «Весь», 15:48 MSK).
- Base main 041c442dcf63a295e931bebbc3c63ac303fe720d; isolated branch
  codex/match-center-2026-10-12. No publication performed for this increment.
- Visual targets: Dota exec-e11db36b-9e9a-4aa3-870c-86589b5d3c3e,
  Dota BO3 exec-e6bb9e55-13ce-42ae-b5e7-86a498a7ff77 and
  CS2 exec-adc82e1d-6ef4-4120-8f40-c1b37489b78a. These contain demonstration
  data only. Actual scores, team crests, identities and statistics are authoritative.
- Shared header/1200px menu unchanged. Dota and CS2 opt in under their matching
  themes; other presentations preserved. Content caps at 1800px on 4K.
- Selected map controls result, rosters, per-map MVP and clips. BO3 2:0 leaves
  map 3 explicitly unplayed. No new series MVP scoring rule.
- Dota uses existing validated MVP snapshot/metrics; estimates have no raw stats.
  Ties, corrections and stale notices survive. No invented GPM/XPM; use available
  hero damage instead. CS2 stats/MVP require an explicit published map dataset.
- Clips are manually entered in the existing organizer page, stored separately
  from schedules/results/private captain state, tied to actual published map IDs.
  No clip URL means no public clip block. Recording timestamps are explicit.
- Canonical optional broadcastLinks rule is unchanged; no status inference.
- Implementation complete: shared React page/CSS, map projections, organizer form,
  storage/auth/public API/client and local Docker dependency closure.
- Independent functional gate: 49/49 focused cases +6/6 SSR; root combined
  current regression run52/52, zero skips. Cloud browser checked desktop,
  320/390 mobile and3840 CSS px; paired visual gate passed with data-contract
  differences recorded. Final build result is in docs/design/match-center/evidence.
- Important release boundary: no push/merge/deployment for this increment.
  The separate Tg-mcp production router/package must include the new media routes
  and modules at release time; real S3/live integration is not verified here.
- Current implementation/provenance: docs/design/match-center/IMPLEMENTATION.md;
  root design-qa.md. Earlier BO1 evidence below is historical only.

## Previous increment

The prior Dota BO1 page was verified at 390/1672/3840 CSS px with MVP revision19.
Historical evidence and its accepted limitations are in IMPLEMENTATION.md and
browser-qa.json. They do not certify the current expanded match center.

## Publication — 12 October, 17:13 MSK

- User explicitly authorized «Публикуй»: frontend main + production and the
  necessary API clips wiring in the existing Tg-mcp runtime.
- Feature input: immutable 1def0ea85872aa51e08b63a064381e2a0e7afada.
- Fresh source main: 041c442dcf63a295e931bebbc3c63ac303fe720d. Fresh runtime
  main: 6de3688a32779503e12bcf33d367c7883278607b.
- Runtime adapter/packaging in progress; retain its newer captain, schedule,
  collector pins and shared sports JSON. No real clip data mutation for QA.
- Only DevOps performs remote/CI operations. Independent verifier accepts the
  exact new runtime candidate and live version; root owns release GO/readback.
- Operation status: NOT_STARTED for external writes at this checkpoint.
- Next: finish adapter/manifest, independent gate, backend publication/readback,
  frontend publication/readback. A merge or HTTP200 alone does not certify live.

- Runtime candidate aded39cb72da5820f83a305dd1c0688916a34c16,
  tree d880b8e21b24939c8949ef1b57a405bccc6889c8, received root RELEASE_GO
  after independent5/5 loopback checks, import closure and32-file preservation.
- Expected active captain package fingerprint8d9a91f4…; collector remains
  2c8645b5…/ff3b2a5. Media provenance1def0ea is additive to existing captain
  source202f26e and scheduleb5fcd80, never an overwrite of newer sports data.
- Git CLI push had no credential and did not update remote; authorized connector
  fallback must verify the identical accepted tree before CI/merge.
- Frontend follow-up includes only release authorization/evidence docs. Its179
  implementation/asset/test hashes independently match accepted1def0ea.
