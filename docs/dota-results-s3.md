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
2. Create GitHub Actions secrets `YCS_S3_ACCESS_KEY_ID` and
   `YCS_S3_SECRET_ACCESS_KEY` in `rtalyutin/yarcyberseason`. Do not put keys in
   source, the client bundle, or issue/chat text. Timeweb S3 keys may have wider
   bucket access; inspect their scope before using them.
3. The scheduled workflow polls only October 9 from 20:30–01:00 Moscow and
   October 10 from 20:00–01:00 Moscow, every five minutes. GitHub may delay
   scheduled runs. The script checks these windows before any network call.
   `workflow_dispatch` with `probe_old_league=true` reads one map from old league
   `19021` and never writes S3. This probe can be run before the first fixture.
4. Later rounds need their published fixture dates and a new polling window
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

The GitHub workflow has `contents: read`, one concurrency group, and no push
operation. It reads the previous S3 object, writes only when a new confirmed
series is found, and reads it back to verify the revision. A failed write
retains the last readable object; investigate an unknown write outcome by
reading S3 before rerunning. Object versioning provides manual recovery.

## Verification

Run `node --test tests/dota-results.test.mjs`, `npm run test:telegram`,
`npm run test:sites`, and `npm run build`. The schedule change also requires
`npm run calendar:sync` and committing `src/data/calendar-publications.json`.
After credentials and CORS are set, verify a test object or the first actual
match through OpenDota → S3 readback → site and Mini App. The old league probe
tests connectivity and response shape, not publication of the autumn result.
