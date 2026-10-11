# Match detail task state

- Goal: implement selected Dota match design option 1, including actual match MVP,
  match-owned streams, mobile layout and a capped wide-screen composition.
- Selected source: `exec-caff50b9-0b57-46a7-a9f7-0bfecfcf2d9b.png`.
- Base: main 78ad541f1d13face70b5d0b5233d4b6e2c720b54; branch
  `codex/dota-match-detail-2026-10-11`; original checkout is untouched.
- Completed: text-free art, WebP assets, semantic React implementation, viewport
  CSS, fixture-only MVP projection, focused regression tests, build/data gates.
- Independent actual-browser gate: PASS at 390, 1672 and 3840 CSS pixels;
  `design-qa.md` and `browser-qa.json` record the evidence and source fingerprints.
- Browser fixes: red tint on the native Dota mark; constrained map-summary width;
  complete mobile panorama and a dark layer beneath dynamic MVP text.
- Data oracle: validated public MVP revision 19; r1-04 jxdzxq/ARB, 59.66. Runtime
  still refreshes the shared endpoint; no snapshot is copied into app data.
- Scope limit: BO1 match award only; BO3/BO5 explicitly await a series MVP rule.
- Publication: not performed for this new design. Remote/release operations
  belong to DevOps; do not describe a local build as deployed.
- Final gates: build, packaging 6/6, focused tests 25/25, data check passed.
  Temporary QA entries were removed. External MVP delivery was unavailable in
  the cloud preview; real validated revision 19 was used in a controlled fetch
  fixture for rendering tests. Normal runtime retains its shared live fetcher.
- Next: user reviews the working page; publication of this new design is pending.
- Delivery artifact exception: only the 2.69 MB combined QA raster
  `source-and-implementation.png` is excluded from the release tree after its
  interrupted upload. It remains in local commit `839535931bc5e9ebe2617cdc3cdbe615cd2f5d08`
  and `/workspace/scratch/2f1b5443e4d0/match-detail-assets/source-and-implementation.png`,
  SHA-256 `904408da13f0beafbce9a078b6e839315236c30fbed9f48bd075822235525f8e`.
  Desktop/mobile captures, both core WebP assets, runtime source and QA verdict
  are unchanged. This exception affects documentation delivery only.
