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
2. Keep the current **frontend** application as React with `npm run build` and
   build directory `/dist/client`. Its domain and both Mini App routes stay on
   that application. It reads the public result object directly from S3;
   no backend URL or writer credentials are needed in the frontend.
3. Deploy a separate small **results backend** from the same repository and
   `main` branch in Timeweb App Platform, selecting **Dockerfile**. Leave
   "Path to project directory" empty: the root Dockerfile needs the shared
   `src/lib` and tournament JSON as its build context. It installs only the
   dependencies from `backend/package-lock.json`, copies importer code and
   shared data, listens on `8080`, and does not build or serve the React site.
   Set health check path `/healthz`; it checks HTTP process health only, not
   successful results import. The backend needs no custom domain. Server
   configuration has its own charge; choose it before starting a deployment.
   For a local backend run use `npm ci --prefix backend`, then
   `npm run start --prefix backend` (Node.js 22.12+). In a root development
   checkout `npm ci` and `npm start` also launch only the results backend.
4. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the **Timeweb backend
   application's server environment**, using the S3 writer's keys. They are not
   GitHub secrets and must not be prefixed `VITE_`, stored in source, the client
   bundle, Dockerfile or issue/chat text. Inspect the keys' bucket scope.
5. The backend starts its own serialized background loop; it does not depend on
   an open browser, website visits or GitHub Actions. It polls every five minutes
   only October 9 from 20:30–01:00 Moscow and October 10 from 20:00–01:00 Moscow.
   Both the loop and importer check these windows before API or S3 requests.
   A slow run finishes before the next run is scheduled. An error is logged and
   retried on the next scheduled check without stopping the HTTP server.
   `node scripts/dota-results-import.mjs --probe-old-league` reads one old-league
   map (`19021`) without S3 access or publication; no live probe is required
   before kickoff. Shutdown signals stop the loop and abort its network calls.
6. Enable the importer on exactly **one backend** application instance. If a
   second backend instance is needed, set `YCS_DOTA_RESULTS_IMPORT_ENABLED=false`
   there. The frontend does not start an importer. Do not run concurrent writer
   instances or overlap writer deployments:
   serialized runs protect one process, not distributed S3 writes. Stop the old
   writer before starting a replacement. The existing object survives restart;
   the next check rereads it before deciding whether to write. The importer has
   no public HTTP trigger. Runtime keys must be set before kickoff.
7. Later rounds need their published fixture dates and a new polling window
   before enabling their automatic checks; no unpublished start time is inferred.

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
