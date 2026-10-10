# Dota 2 autumn 2026: published results

The agreed source is OpenDota league `20164`. The public series-result object is
`results/dota2-autumn-2026.json` in Timeweb bucket
`e9dc5ea4-6dc9267d-85ca-4ae9-a41f-2895e9542a04`. The website and Mini App
read it independently of site releases. This is the implementation contract for
the separately agreed S3 results specification dated 2026-09-30, version 0.2.
The MVP extension is specified in [dota-mvp.md](dota-mvp.md).

## Activation

1. In Timeweb, verify that this is the intended **public** bucket, enable object
   versioning, and set CORS for `GET` from the actual website and Mini App
   origins. The screenshot confirms the public bucket type, but does not confirm
   versioning, CORS rules or write credentials. Do not change access to unrelated
   objects. Check an anonymous browser GET to the exact object URL after the
   first write.
2. Keep the current **frontend** application as React with `npm run build` and
   build directory `/dist/client`. Its domain and both Mini App routes stay on
   that application. It reads the public result object directly from S3;
   no backend URL or writer credentials are needed in the frontend.
3. The collector was relocated to the **existing Tg-mcp backend** by Roman's
   instruction on 2026-10-09. Do not create a separate results application or
   replace the React frontend. The active runtime and activation instructions
   are in [Tg-mcp/YCS-DOTA-COLLECTOR.md](https://github.com/rtalyutin/Tg-mcp/blob/main/YCS-DOTA-COLLECTOR.md).
   It preserves the OpenDota results/MVP modules and the existing S3 objects;
   native Node.js 24 runs it alongside the other backend functions.
4. Set `YCS_DOTA_RESULTS_IMPORT_ENABLED=true`, `AWS_ACCESS_KEY_ID` and
   `AWS_SECRET_ACCESS_KEY` only in the **existing Tg-mcp application's server
   environment**. Reuse the existing S3 writer keys with access to the listed
   objects. Keep them out of Git, frontend variables, startup commands and chat.
   Preserve unrelated backend variables. The Tg-mcp collector stays disabled
   if the flag or keys are absent.
5. The serialized loop polls every five minutes throughout the published
   tournament period, from the earliest explicitly scheduled fixture through
   the end of October 25 Moscow time. It runs independently of browsers,
   website visits and the outreach database. After the period it restores the
   cache and retries only unresolved maps. Slow calls never overlap in one
   process. Shutdown stops the timer and aborts collector network calls.
6. Keep exactly **one enabled writer process**, without cluster or overlapping
   enabled deployments. Stop any previous runtime before enabling Tg-mcp.
   The legacy worker in this repository is now disabled unless explicitly
   enabled; this code guard does not stop an already running instance. Do not
   enable it alongside Tg-mcp. Existing objects survive restarts. Health means
   process liveness, not a successful match import; read the separate collector
   status and verify OpenDota → S3 readback → site/Mini App after activation.
7. Later rounds need published fixtures with dates and verified team names or
   OpenDota team IDs. The polling period follows the tournament JSON; no
   unpublished pairings are inferred.

`npm run start:frontend` is an optional local Node preview of the existing
site build. It only serves static site/Mini App routes and does not start an
importer. Timeweb's existing React deployment continues to serve `/dist/client`.

## Data contract

The object has `schemaVersion: 1`, `tournamentId`, `leagueId`, increasing
`revision`, `updatedAt`, and a `matches` map keyed by published fixture ID. A
match entry includes `team1Id`, `team2Id`, completed series score and winner,
`seriesId` for BO3/BO5, plus ordered maps with OpenDota Match ID, winner,
kills in published team order, duration in seconds and exact OpenDota URL.
Only complete series are stored. `matches: {}` is valid but the importer avoids
an empty write. Both clients validate the object before applying it, keep the
last valid revision on read failure. Before the first valid snapshot, a missing
or unreadable object does not display an availability banner on the website or
Mini App: the published schedule remains visible. After a valid snapshot has
loaded, a later read failure shows the delay notice and retains confirmed results.

OpenDota team names must match the published fixture names exactly after case
and whitespace normalization. A fixture can instead declare verified
`opendotaTeamIds.team1` and `.team2`. Missing names, duplicate plausible
fixtures, uncertain BO3/BO5 series and conflicting previously published data
are logged without automatic publication. A map's winner comes from
`radiant_win`; kills never decide the winner. Swiss wins/losses derive only from
completed series. Tournament pairings and playoff seeds remain organizer data.

The server-side importer has no GitHub or push operation. It reads the previous
S3 objects, updates MVP independently of completed series, writes series only
when a new complete result is confirmed, and reads each write back to verify it.
A missing API response must not turn a three-map series into a two-map series.
A failed write
retains the last readable object; investigate an unknown write outcome by
reading S3 before rerunning. Object versioning provides manual recovery.

## Verification

Run `node --test tests/dota-results.test.mjs tests/dota-results-runtime.test.mjs tests/dota-mvp*.test.mjs`, `npm run test:telegram`,
`npm run test:sites`, and `npm run build`. The schedule change also requires
`npm run calendar:sync` and committing `src/data/calendar-publications.json`.
After credentials and CORS are set, verify a test object or the first actual
match through OpenDota → S3 readback → site and Mini App. The old league probe
tests connectivity and response shape, not publication of the autumn result.

## Organizer confirmations (10 October 2026)

Confirmed sports outcomes are published before OpenDota work, using the existing
single writer and conditional S3 write/readback. API availability is not a
prerequisite for standings. Snapshot schema 1 additionally accepts records with
`source: "organizer"`, nonempty `confirmationSource`, and valid `confirmedAt`.
Played series may have fewer recovered map details than the series score;
unknown map IDs and player metrics are never invented. A technical win uses
`status: "walkover"`, `scoreKind: "technical"`, and an empty `maps` array.
Existing API records without `source` retain full-series/map validation.

The approved results are Borisogleb–ARB 1:0, Aegis–Tech Titans 1:0 (map
9037645797, kills34:32,3331 seconds, lobby without league selection), and
liqa sto–strela0:1 technical. Swiss standings count each confirmed fixture
once, including static confirmations and later API snapshots. Stale API data
cannot override an organizer outcome or discard richer known map details.
API data may enrich the same outcome; a contradictory outcome is flagged.

If league discovery fails, known/explicitly confirmed map IDs continue to be
retried, with discovery incompleteness preserved in MVP metadata. Automatic
API series publication waits for complete discovery; organizer outcomes do not.
