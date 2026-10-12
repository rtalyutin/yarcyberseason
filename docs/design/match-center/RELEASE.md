# Match center release — 12 October 2026

Owner authorization: Roman said «Публикуй» at 17:13:48 Moscow time.
Status: PREPARED; no remote branch, merge or live activation is claimed by this receipt.

## Immutable candidates and previous targets

| Target | Candidate | Previous main / rollback reference |
| --- | --- | --- |
| Frontend canonical application | `1def0ea85872aa51e08b63a064381e2a0e7afada` | `041c442dcf63a295e931bebbc3c63ac303fe720d` |
| Existing Tg-mcp runtime | `aded39cb72da5820f83a305dd1c0688916a34c16` / tree `d880b8e21b24939c8949ef1b57a405bccc6889c8` | `6de3688a32779503e12bcf33d367c7883278607b` |

The runtime remains on the existing host `https://rtalyutin-tg-mcp-4776.twc1.net`.
The frontend remains on `https://xn--90aiaibl0ahlel5n.xn--p1ai`.
No new service, credentials, deployment environment, database or public S3 ACL is introduced.

## Packaging and provenance

The runtime mounts the public media handler in its existing YCS API router and
shares one media service with the existing authenticated organizer handler. It
uses the existing selected server environment and lifecycle drain. Media state
has a dedicated private S3 object; results, captain state and MVP are untouched.

Captain source remains `202f26e3260f13f0c125bfdc0c65124187956bd6` and schedule
source remains `b5fcd80d733dcedcf207785ee8a8af534a152bf5`. The additive
`mediaSourceRevision` is `1def0ea85872aa51e08b63a064381e2a0e7afada`.
The recomputed captain package fingerprint is
`8d9a91f4e506618869b7bb765b6441e42183fcb607e192a5bad857ed6b42bed8`.

Collector source `ff3b2a5949bd7d553508c86be4d2063a07756489` and fingerprint
`2c8645b585f68ba09a40fb0e46cd04717000b0326999609e411ebccd35484f42`
remain byte-identical. Of 32 existing packaged YCS files only the organizer
media route and captain manifest changed. All current sports JSON and unrelated
captain/collector/common modules are byte-identical to the fresh runtime base.
See `evidence/release-packaging-preservation.json`.

## Gates and delivery order

The local runtime candidate passed TypeScript, workspace TypeScript and full
production build, including all three asset validators. Its author captain and
media adapter tests passed 14/14. Independent acceptance is a separate gate.

After independent acceptance, publish the runtime branch and PR, require the
existing Outreach PostgreSQL CI on the exact PR head, and merge with an expected
head SHA. Verify the existing backend's new captain fingerprint, unchanged
collector fingerprint and safe media GET/HEAD/CORS response before promoting the
frontend. Then publish and merge the frontend and verify actual match-center
markup, real ten-player statistics, both discipline layouts and asset responses
on the official domain. Main membership and HTTP 200 alone are insufficient.

Both repositories have no active rulesets and their main branches are unprotected
at this inspection. This does not waive the release gates above. The frontend has
no GitHub Actions runs. Runtime CI is testing, not deployment.

Existing Timeweb Git integration is the intended delivery mechanism. Official
Timeweb docs describe push-triggered builds when auto deployment is enabled:
https://timeweb.cloud/docs/apps/how-it-works
The account's current setting is not exposed by the available tools; live
readback must establish activation. If it does not activate, the exact existing
application rebuild action is a hosting handoff, not a claim of publication.

## Runtime observation and recovery

Before release, `/healthz/ycs-captain` serves old fingerprint `766e77e7…`,
`/healthz/ycs-dota` serves the unchanged collector fingerprint, and the unmounted
media route returns generic 503. The official match page still serves its old
composition. These observations are recorded in `evidence/release-live-before.json`.

Do not create a demonstration clip in production. Public reads should return the
existing real media or an empty list, and anonymous organizer access must remain
401. Do not trigger collector imports, parser requests or captain writes as a
release probe. A restart can invalidate the existing RAM organizer sessions; a
fresh login remains the established behavior.

If recovery is necessary, use an inverse feature-only commit or the existing
platform's previous validated deployment. Do not reset main or revert unrelated
sports updates. Retain the private media object so optional UI rollback loses no
organizer content. Recovery is verified by the previous composition and runtime
fingerprints/readiness, and recorded separately from a successful forward release.
