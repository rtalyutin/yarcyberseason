# Independent match-center functional QA

Verifier: `/root/mockup_check`, independent of the application authors. Date: 12 October 2026.
Handoff: `FEATURE_HANDOFF/1`, digest `880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`.
Object: `/workspace/scratch/2f1b5443e4d0/ycs-match-center`, base `041c442dcf63a295e931bebbc3c63ac303fe720d`, dirty candidate.

**Functional gate: PASS.** Final run at 2026-10-12T13:24:41Z, Node v24.19.0. Source/assets/test fingerprint before and after: `5f0d82db2d9876bea01205fc45ea635ba6a6d9ce7b9743d77acad9a5e09b679e`; functional-only fingerprint: `3944c3726bcdf833f18f3b4254d938a65cc71b5a108d0a9714bc17b952c3d603`. No file changed during this run.

Scope is the selected Dota/CS2 match center: map selection and per-map data/MVP, honest missing/unplayed/technical states, canonical broadcasts, manual media projection and preservation of sports/private state. Root owns visual acceptance and final build. This report does not certify deployment or subjective design approval.

## Observed behavior

- Own cloud Chrome tab 6, actual CS2 lower-final route: map tile 3 selects Anubis, 13:5 / 18 rounds; the statistics selector then selects Ancient, 10:13 / 23 rounds and the correct opposing winner. Both actions update selected tile, detail, MVP heading and statistics heading together.
- The real lower-final advancement link opens the actual BO5 grand final. It shows the confirmed series result and five honestly unpublished map records; no mock map scores/player metrics/MVP are inserted.
- Root's isolated Dota BO3 harness: selecting the unused third map removes individual tables and shows “Не игралась / MVP не начисляется”; selecting map 2 without a snapshot displays pending MVP and the correctly labelled registered rosters instead of carrying map 1's MVP.
- That temporary BO3 harness has contradictory synthetic sports inputs (copied kill fields/URL and a map winner inconsistent with 2:0). Its evidence is used only for selection and no-play/pending isolation, never for factual sports-data acceptance. Production JSON was not changed.

## Executed checks and fixes

- Final focused suite: **49/49 PASS**, zero failed/skipped/cancelled: 28 map/MVP scenarios and 21 media store/service/API/client scenarios. Command: `node --test tests/match-center.test.mjs tests/dota-match-mvp.test.mjs tests/match-media.test.mjs`. Raw log: `focused-tests.log`.
- Independent SSR: **6/6 PASS**, `ssr-results.json`, `ssr-run.log`, reproducible source `ssr-cases.jsx`. Actual validated MVP snapshot revision 19 is used. Cases cover this-map ten-player data, no-URL clips hidden, empty canonical streams without legacy fallback, estimated raw metrics as dashes, technical no-play, real CS2 unknown BO5 maps and neutral multiple-CS2-MVP wording.
- Independent model recheck: retained ready snapshots do not award MVP to raw cancelled/live/scheduled/postponed maps or a third mapped decider after a completed BO3 2:0. Slot lifecycle and null result are consistent. Original no-play and lifecycle defects are fixed.
- Independent CS2 model checks: five selected BO5 maps use their own ten players/explicit MVP; 11 malformed data sets and five missing/invalid MVP declarations do not invent awards or mutate source inputs.
- Independent media service/client regression: **PASS**, `media-projection.mjs`, `media-projection-results.json`. With unchanged media revision, a catalog refresh reveals the existing persisted clip, changed/removed map identity clears it, restoration restores only its clip, and a cold client reads it independently. Conflicting bodies at the same media and catalog versions still retain confirmed state. This fixes the observed stale-empty-clips defect.
- Current protected-file comparison: 47 sports-data, readers, header, captain/backend and hosting files match base byte for byte (`protected-files.json`).

## Evidence notes

`identity-before.json` and `identity-after.json` identify the exact source, assets and focused test version around the latest suite. `digest` includes CSS and match-detail assets; `functionalDigest` excludes only CSS/raster assets. Source hashes and any changed files must be checked before reusing this evidence.

The first SSR attempt had an oracle typo expecting React hydration comments from `renderToStaticMarkup`; `ssr-initial-failure.log` preserves it. The oracle was corrected, with no app change. The first final focused suite hit three outdated media test fixtures/assertions after the new `catalogVersion` contract; `initial-schema-mismatch-*` preserves that run. The test author updated the fixtures and added the catalog-refresh regression; the frozen final run passed all 49 discovered scenarios.

Run all recorded executable checks with `node /workspace/scratch/2f1b5443e4d0/qa-match-center-independent/run.mjs`. The public revision-19 MVP fixture is preserved as `mvp-revision19.json`, SHA-256 `fb8c199a0f3677c5e399769b228c3fd84a38dd47d76826a7f3c72996f2fef8d8`; the temporary app harness is not needed for SSR reproduction.

Evidence status: VERIFIED for the named functional gate. Return to `/root` for paired visual acceptance, build and final repository handoff. No unresolved functional defect remains in the tested scope.

No application source, browser-owned root tab, external data, GitHub or deployment was mutated by this verifier. Media writes in the author suite use local doubles/local HTTP only. Real production storage, credentials and publication are not certified here. The organizer browser workflow is owned by the media author; this verifier's independent coverage is model, API/client and public-page behavior.
