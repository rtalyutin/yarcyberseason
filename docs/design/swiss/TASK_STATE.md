# Swiss design — active contract and state

- Contract revision: SWISS-1+4/r1, 12 October 2026. User selected table from displayed option 1 and Dota portals from option 4, then accepted the combined image and asked to finish/fix shortcomings.
- Selected visual: `generated_images/exec-c2553fcf-cc26-455d-bfb2-7da75295c119.png` in the conversation. The demonstration rows explain future states; they are not tournament data.
- Scope: implement the existing Dota Swiss section with real current standings. Preserve existing shared header, all routes/other themes, actual R3 pairs, matches, MVP and broadcasts. No new hosting/backend/sports-data writer.
- Base: `303682e012f9106c23e7e123bf84b20b5f7b9027` (main, 12 Oct), local branch `codex/swiss-design-2026-10-12`.
- Authorial intent r1: an ancient Dota arena with three physical magical gates, a compact stone-framed standings table, ivory condensed headings, teal readable surfaces. Color of an entire qualified row identifies its exit round.
- Criteria: 3:0 emerald/round 3; 3:1 blue/round 4; 3:2 violet/round 5. Three losses marks elimination. 2:1, 1:2 and 2:2 remain active. Win pips count total wins, not game chronology. Keep data live via the existing confirmed-results projection; no mock teams or fabricated scores. Text status duplicates color meaning.
- Runtime: existing React/Vite and semantic HTML/CSS/raster assets; cloud Chrome preview. Check 320/390px mobile, reference-width desktop, and 3840px 4K; cap composition at 1800px. No animation/FPS promise.
- Status: implementation complete; 23 author tests and 8 independent SSR checks passed. Responsive/browser checks and independent final visual gate passed. No publication performed in this task.
- Next: save the reviewed branch; release is separate. Working preview is open in cloud Chrome; final evidence is in project-root `design-qa.md`.

## Assets

- Emerald: `/workspace/scratch/2f1b5443e4d0/swisses-assets/emerald-portal.png`.
- Blue: `/workspace/scratch/2f1b5443e4d0/swiss-assets/blue-portal.png`.
- Violet: `/workspace/scratch/2f1b5443e4d0/generated_images/exec-ed4cfac1-5124-4eb9-a3ce-1c14915ae82a.png`.
- Environment: `/workspace/scratch/2f1b5443e4d0/swisses-assets/swiss-stone-forest.png`.
- All four generated with built-in imagegen from the selected visual, individually inspected. Deployed derivatives retain the content and transparency, encoded as WebP. Real team logos come from the existing registry.
