# Dota 2 autumn 2026: published results

The agreed source is OpenDota league `20164`. The single public result object is
`results/dota2-autumn-2026.json` in Timeweb bucket
`e9dc5ea4-6dc9267d-85ca-4ae9-a41f-2895e9542a04`. The website and Mini App
read it independently of site releases. This is the implementation contract for
the separately agreed S3 results specification dated 2026-09-30, version 0.2.

## Activation

1. In Timeweb, verify that this is the intended **public** bucket, enable object
   versioning, and set CORS for `GET` from the actual website and Mini App
   origins. The screenshot confirms the public bucket type, but does not confirm
   versioning, CORS rules or write credentials. Do not change access to unrelated
   objects. Check an anonymous browser GET to the exact object URL after the
   first write.
2. Run the **same application** as a persistent Node.js process on Timeweb:
   `npm ci`, `npm run build`, then `npm start` (Node.js 22.12+). The root
   `Dockerfile` packages the site and importer together, listens on `8080`, and
   serves the existing site/Mini App routes using the unchanged site worker.
   Select Dockerfile in App Platform if the current service only serves static
   frontend files; a static hosting build cannot run this importer. Keep the
   existing domain attached to the serving application. `/healthz` checks HTTP
   process health only, not successful results import.
3. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the **Timeweb
   application's server environment**, using the S3 writer's keys. They are not
   GitHub secrets and must not be prefixed `VITE_`, stored in source, the client
   bundle, Dockerfile or issue/chat text. Inspect the keys' bucket scope.
4. The server starts its own serialized background loop; it does not depend on
   an open browser, website visits or GitHub Actions. It polls every five minutes
   only October 9 from 20:30–01:00 Moscow and October 10 from 20:00–01:00 Moscow.
   Both the loop and importer check these windows before API or S3 requests.
   A slow run finishes before the next run is scheduled. An error is logged and
   retried on the next scheduled check without stopping the HTTP server.
   `node scripts/dota-results-import.mjs --probe-old-league` reads one old-league
   map (`19021`) without S3 access or publication; no live probe is required
   before kickoff. Shutdown signals stop the loop and abort its network calls.
5. Enable the importer on exactly **one** application instance. If another
   deployment serves the same site, set `YCS_DOTA_RESULTS_IMPORT_ENABLED=false`
   there. Do not run concurrent writer instances or overlap writer deployments:
   serialized runs protect one process, not distributed S3 writes. Stop the old
   writer before starting a replacement. The existing object survives restart;
   the next check rereads it before deciding whether to write. The importer has
   no public HTTP trigger. Runtime keys must be set before kickoff.
6. Later rounds need their published fixture dates and a new polling window
   before enabling their automatic checks; no unpublished start time is inferred.

## Data contract

The object has `schemaVersion: 1`, `tournamentId`, `leagueId`, increasing
`revision`, `updatedAt`, and a `matches` map keyed by published fixture ID. A
match entry includes `team1Id`, `team2Id`, completed series score and winner,
`seriesId` for BO3/BO5, plus ordered maps with OpenDota Match ID, winner,
kills in published team order, duration in seconds and exact OpenDota URL.
Only complete series are stored. `matches: {}` is valid but the importer avoids
an empty write. Both clients validate the object before applying it, keep the
last valid revision on read failure, and show a delay notice when necessary.

OpenDota team names must match the published fixture names exactly after case
and whitespace normalization. A fixture can instead declare verified
`opendotaTeamIds.team1` and `.team2`. Missing names, duplicate plausible
fixtures, uncertain BO3/BO5 series and conflicting previously published data
are logged without automatic publication. A map's winner comes from
`radiant_win`; kills never decide the winner. Swiss wins/losses derive only from
completed series. Tournament pairings and playoff seeds remain organizer data.

The server-side importer has no GitHub or push operation. It reads the previous
S3 object, writes only when a new confirmed
series is found, and reads it back to verify the revision. A failed write
retains the last readable object; investigate an unknown write outcome by
reading S3 before rerunning. Object versioning provides manual recovery.

## Verification

Run `node --test tests/dota-results.test.mjs tests/dota-results-runtime.test.mjs`, `npm run test:telegram`,
`npm run test:sites`, and `npm run build`. The schedule change also requires
`npm run calendar:sync` and committing `src/data/calendar-publications.json`.
After credentials and CORS are set, verify a test object or the first actual
match through OpenDota → S3 readback → site and Mini App. The old league probe
tests connectivity and response shape, not publication of the autumn result.
