# Match-center publication QA

Verifier `/root/release_verifier`, independent of implementation. Authorization:
Roman's «Публикуй», 12 October 2026 at 17:13 MSK. Root coordinates release;
QA does not grant publication permission or mutate real storage.

## Prepared oracle

Frontend starting object: `1def0ea85872aa51e08b63a064381e2a0e7afada`, tree
`48a37ac3b1352e0eb419062886f68602cbcb0289`. Before release integration,
179 implementation/assets/test files equal the independently accepted local
candidate byte for byte (`frontend-preflight.json`). Existing functional and
visual evidence can be reused for those unchanged files, with its recorded
coverage limits. A merge that changes dependent files invalidates that reuse.

Runtime starting object supplied by DevOps: Tg-mcp
`6de3688a32779503e12bcf33d367c7883278607b`, tree
`add458bc7258414bb52604476650b215f4947c31`. The starting adapter has no public
media route. Fresh captain source/schedule pins and sporting data must survive
integration. Public backend remains `https://rtalyutin-tg-mcp-4776.twc1.net`.

| Gate | Discriminator | Required observation |
| --- | --- | --- |
| Package identity | Hash manifest plus import dependency closure | New media modules/models match selected canonical source; every manifest hash verifies; old collector/captain/schedule bytes remain intact except approved wiring |
| Shared organizer identity | One local login, then existing matches/captains and media requests | Existing Bearer session works across all three; logout/expiry revokes media access; unauthorized media never reads/writes storage |
| Public projection | Local synthetic persisted map clips and cold frontend client | Only requested actual map scope is exposed; public schema includes `catalogVersion`; private state, receipts, credentials and internal fields are absent |
| Boundary behavior | Foreign map, malformed URL, wrong Origin, method/query errors | Rejected safely with exact public error contract; unrelated objects/captain state are unchanged |
| Route lifecycle | Enabled, disabled, stopped and unrelated routes | Public media reaches only intended handler; disabled/stopped is safe; original captain and MCP routing remains intact |
| Post-release identity | Public health, hashed source package and actual website artifact | Target source/package fingerprints are active; actual frontend bundle contains match center, discipline artwork and organizer form; HTTP 200 alone is insufficient |
| Public rendering | Actual Dota and CS2 routes in browser after artifact identity | Selected art and truthful actual scores/data render; series map selection changes map context; absent clips stay hidden |

Local HTTP and storage fixtures are permitted. No real organizer login, clip
creation/deletion, S3 write, sporting-result change or private-state mutation is
part of this QA. The previous 52 author and 49 independent cases are evidence
for the accepted local implementation, not evidence of a production rollout.

Preparation status: **PREPARED**. Publication acceptance remains **BLOCKED**
until the exact runtime candidate and deployed frontend/runtime versions are
observed. No unresolved defect is asserted by this preparation document.
