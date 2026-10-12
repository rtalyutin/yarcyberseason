# Independent local runtime gate

**PASS for the local integration only.** Verifier `/root/release_verifier`,
independent of the adapter and packaging authors. Executed 12 October 2026,
14:25–14:27 UTC, Node v24.19.0. Runtime object
`aded39cb72da5820f83a305dd1c0688916a34c16`, tree
`d880b8e21b24939c8949ef1b57a405bccc6889c8`, clean before and after.

Executable/imported-package fingerprint before and after:
`cacf28ff49dbfdbc1a73b155b8d1be856593922d21c3b4c8252d0b57a9d5c8d4`.
The four new packaged modules equal canonical frontend/source commit
`1def0ea85872aa51e08b63a064381e2a0e7afada`. Independent baseline comparison
of all 32 existing YCS package files changes only the approved organizer handler
and captain manifest. Existing sporting JSON, collector code/pins, captain
service/storage/auth, roster import and schedules are unchanged.

| Criterion | Observed result | Evidence |
| --- | --- | --- |
| Shared existing organizer session | One local login accesses matches, captains and media; logout and eight-hour expiry revoke all organizer routes; unauthorized media does not read storage | `runtime-local-tests.log`, cases 1 and 3 |
| Public data and frontend compatibility | Stored synthetic clip is read without a session; exact public DTO validates in the real frontend client and a fresh client receives it; catalog hash and exact timestamp link present; receipts/private fields absent | `runtime-local-tests.log`, case 1 |
| Invalid inputs and boundaries | Wrong origin, duplicate/extra query, wrong method, foreign map and non-HTTPS URL rejected with no persisted mutation or captain call | `runtime-local-tests.log`, case 2 |
| Adapter lifecycle | Disabled/stopped media returns 503; unrelated MCP and similarly named paths remain unowned; stop waits for a pending public read and refuses later reads | `runtime-local-tests.log`, cases 4 and 5 |
| Package/import freshness | All manifest hashes verify; real factories import; collector, captain and media validation markers observed | `runtime-package-imports.log`, `runtime-preservation.json` |
| Version stability | Clean candidate and executable bytes identical across execution | `runtime-identity-before.json`, `runtime-identity-after.json` |

Independent script discovered and executed **5 tests, 5 PASS, zero failures,
skips, cancellations or todos**. Reproduce:

```sh
YCS_QA_RUNTIME_ROOT=/workspace/scratch/2f1b5443e4d0/tg-mcp-match-release node --test docs/design/match-center/release-qa/runtime-acceptance.mjs
```

The fixture uses actual packaged organizer/media handlers and the actual runtime
adapter, with injected synthetic captain/worker and in-memory media storage.
The default production loader is verified statically and by hash/import closure;
this test does not execute production credentials, background S3 cleanup or
external storage. No real organizer login or storage write was performed.

Handoff schema `FEATURE_HANDOFF/1`, digest
`880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`.
Evidence status **VERIFIED**; local gate verdict **PASS**; return to `/root`.
Production acceptance remains **BLOCKED** until exact frontend/runtime rollout
identity and public behavior are observed. This local gate does not certify
publication or Roman's subjective reaction to the design.
