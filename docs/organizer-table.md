# Organizer table

Contract (Roman, 7 October 2026): `/orgs` contains one read-only table of matches,
broadcasts, casters and partners across all tournaments, with tournament filtering.
The login/password are server deployment environment variables. Sports results
and schedules remain read-only. Later captain controls use their existing
contract; the authorized 12 October match-center scope adds manual map media below.

## Column controls

Roman requested hiding and dragging columns on 8 October 2026. The «Столбцы»
button opens an inline list of all seven columns. Checkboxes hide/show columns;
at least one stays visible. Drag a table header to the left/right edge of another
header to place it before/after that column. Labelled arrow buttons in the list
provide the same ordering control for keyboard and touch, including hidden
columns. «Сбросить» restores the original order and shows all columns.

Headers, cells and widths follow column identity; hiding columns reduces the
table's minimum width and the empty-state cell spans only visible columns.
These are page-memory view settings, retained through filtering and data refresh
until the page reloads. They do not write assignments/results, save credentials
or call an additional API.

## Deployment

Use the existing static React frontend and existing Docker results backend.
Keep the current domains, S3 importer and health check `/healthz` unchanged.
No additional service or database is required.

Set on the **backend** deployment:

- `YCS_ORGS_LOGIN`: the chosen organizer login.
- `YCS_ORGS_PASSWORD`: the chosen password. No default credentials.

Set on the **frontend** deployment before building:

- `VITE_YCS_ORGS_API_URL`: the HTTPS origin of that existing backend, without a
  trailing API path. This origin is public configuration; it contains no credentials.

The production origin allowed by backend CORS defaults to
`https://xn--90aiaibl0ahlel5n.xn--p1ai`. Only when serving this frontend from
another origin, set optional `YCS_ORGS_ALLOWED_ORIGIN` on the backend to that
exact origin. Never prefix the login or password with `VITE_`.

Both applications need their updated revision. The static frontend renders the
login shell only; deployment variables in a static build do not provide server
access control. Server credentials and assignment JSON are excluded from the
frontend bundle. `/orgs` has `noindex` and is excluded from the sitemap and public
navigation; these discovery settings are separate from server authorization.

## API

| Route | Method | Access | Result |
| --- | --- | --- | --- |
| `/api/orgs/login` | POST JSON `{login,password}` | Public, origin-scoped | Random session token, `expiresAt` |
| `/api/orgs/matches` | GET | `Authorization: Bearer <token>` | Table snapshot, source availability |
| `/api/orgs/logout` | POST | Same token | 204, session revoked |
| `/api/orgs/media` | GET / POST JSON | Same organizer token | Map catalog / manual media save or delete |
| `/api/match-media?tournamentId=…&matchId=…` | GET / HEAD | Public, origin-scoped | Safe links for this one match only |

All responses use `Cache-Control: no-store`. Missing credentials give 503;
invalid login or session gives 401; disallowed origin gives 403; failed login
attempts are limited to 5 per minute per backend-observed address and process.
JSON login body is limited to 4 KiB. Wrong methods give 405. There is no write
endpoint for sports results or schedules. The separate media endpoint writes
only the dedicated document described below.

Session lifetime is eight hours. Tokens are held only in the mounted page's
memory, never in local/session storage or URLs. The backend stores token hashes
in process memory. Logout invalidates the token; a backend restart invalidates
all sessions. This design fits the existing single backend instance. A proxy can
make several visitors share the backend-observed address; forwarded headers are
not trusted automatically. Multi-instance sessions are outside this release.

## Data

The backend reads all five published tournament JSON files. It applies the
existing validated S3 result snapshot for autumn Dota, retaining the latest
confirmed revision on a failed update. Only authenticated reads start this
read-only S3 fetch; they never trigger the importer or publish results. Refresh
is limited to once per minute. The frontend updates every minute and on focus;
network failures retain the last displayed snapshot with an explicit notice.

`backend/organizer-assignments.json` stores source-backed operational assignments
keyed by `tournamentId/matchId`; it is server-side only. A tournament-wide partner
is displayed separately from a partner of the particular match. Assignments were
synchronized with `YCS-Partners-2026-10-03-1.xlsx`, version 3 updated 9 October
2026: tournament-wide support is ФКС ЯО, Минспорта ЯО, Додо Пицца, Торрефакто
and Redragon (top-three awards; devices and quantities remain unconfirmed).
Small Choice and «Искусство Ритма» belong to the opening broadcast fixture
`dota-autumn-swiss-r1-04`. Картинг-клуб Форсаж, Музей Гарри Поттера в Ярославле
and Пряничный домик belong to the final fixture `final-1`.

Eight other agreed partners have no exact match assignment in the register;
they are not attached to arbitrary matches or presented as tournament-wide
support. Roman confirmed @queleez and Twitch/VK YarCyberSeason for the opening
fixture on 9 October 2026 at 20:30 Moscow time. The tournament JSON supplies
these assignments; other matches keep «Не назначены»/«Ссылка не назначена»
unless separately confirmed. No credentials or contact details from the
partner register are copied to the table.

Published empty bracket slots remain visible with unknown participants/status.
Undated matches and archive dates without a year remain unknown. Exact
`scheduledAt` values render in `Europe/Moscow`; an unzoned published time is
explicitly marked instead of assuming a timezone. Scores appear only when the
existing result normalizer confirms them. Technical results remain distinct.

Local checks: `node --test tests/organizer.test.mjs`, the existing backend runtime
checks and `npm run build` / `npm run test:sites`. Browser acceptance covers login,
filters, refresh/logout, desktop/mobile table scrolling and navigation links.

## Manual clips and recording timestamps — 12 October 2026

The organizer selects «Клипы и записи», a match and an actual published map.
They can save a ready clip URL or a recording URL with a start timestamp and
optional end timestamp/title, edit it, or delete it. All URLs must be HTTPS
without embedded credentials. Start/end are integer seconds; the form accepts
`MM:SS` or `H:MM:SS`. End must follow start. Empty BO3/BO5 slots, future named
maps and technical maps are not clip targets. No clipping API, file download,
video processing, automatic timestamps or result/schedule mutation is added.

`src/lib/match-center.js` owns the map order and identity. The media catalog uses
its actual map `id:<sourceMapId>` key, or `number:<published map number>` only
when that published map has no ID. Each saved item also retains the number and
source ID. Public projection excludes entries whose current map identity no
longer matches. Clips for another match/map are never inherited. A map with no
valid clips renders no public media block.

`backend/match-media-store.mjs` stores schema 1 in the existing Timeweb S3 bucket,
under **`media/match-highlights-v1.json`**, separately from captain/results/MVP
objects. It reuses server `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, region
`ru-1`, endpoint `https://s3.twcstorage.ru`, and existing optional
`YCS_CAPTAIN_BUCKET` (otherwise the existing bucket). No new bucket, host,
credential, encryption requirement or database is introduced. The document is
public-safe whitelisted media metadata and request fingerprints, but its S3
ACL remains `private`; anonymous visitors receive only the backend projection.
The object has `Cache-Control: no-store`, bounded reads, conditional creation
(`If-None-Match: *`) and conditional updates with the read ETag. The established
quoted-to-bare ETag fallback retains the same expected token. A missing object
starts empty; denial, corruption, missing ETag and incompatible schemas fail
closed. A cold process reads S3, not an in-memory authoritative copy.

POST `/api/orgs/media` receives:

```json
{
  "action": "upsert",
  "requestId": "32 lowercase hexadecimal characters",
  "expectedRevision": 0,
  "tournamentId": "published tournament ID",
  "matchId": "published fixture ID",
  "mapKey": "id:actual-source-map-id",
  "kind": "recording",
  "url": "https://example.com/published-recording",
  "title": "",
  "startSeconds": 83,
  "endSeconds": 105
}
```

For a ready `clip`, times are null. `clipId` edits an existing item in that exact
scope. Delete accepts only `action: "delete"`, the same revision/request/scope
fields and required `clipId`. Server authorization uses the existing organizer
session before any media read/write. Unknown fields, URL, timing or scope give
400/404. Revision/CAS conflicts give 409 and require reading the current list;
there is no silent overwrite or automatic merge. Exact request retries return
the retained receipt without a duplicate; reusing that ID for another body gives
409. A lost PUT response is accepted only after a read proves its fingerprint;
otherwise the outcome remains unknown, with a safe same-request retry in UI.

Public GET returns `{schemaVersion, revision, catalogVersion, updatedAt, tournamentId, matchId,
clips}`. Each clip has `{id, mapKey, mapNumber, mapId, kind, url, title,
startSeconds, endSeconds, href}`. Requests, session tokens, usernames, assignments,
chat and result claims never enter this DTO.
`catalogVersion` fingerprints the selected fixture's current map identities;
catalog changes may safely hide/unhide links without changing the media revision.
The client accepts that changed projection, rejects differing data with the same
media revision/catalog fingerprint, and never carries a previous fixture's clips
into the next route. The public handler is read-only and
uses the same exact allowed website origin as the organizer API. The frontend
reuses `VITE_YCS_ORGS_API_URL` and the known existing backend origin; it contains
no credentials. YouTube watch/short-link and Twitch VOD links receive their
start parameter; other recording URLs remain intact with visible time metadata.
The external player owns playback; end time does not promise automatic stopping.

Canonical code is prepared in this repository, including `backend/server.mjs`
integration. The active Tg-mcp runtime must package these same modules and mount
the public handler in its existing router during a separately authorized release.
Its explicit source manifest must include `backend/match-media-service.mjs`,
`backend/match-media-store.mjs`, `src/lib/match-media.js` and `src/lib/match-center.js`
alongside the existing backend/common models and all five tournament JSONs.
`createOrganizerHandler` receives that same `mediaService` instance for the
authenticated route; `createMatchMediaPublicHandler({service, env})` mounts
`/api/match-media` in the existing router. The canonical `createResultsServer`
already supplies both routes. This is a packaging/router handoff, not a new host.
No deployment or runtime integration in another repository is claimed here.
Author tests: `node --test tests/match-media.test.mjs`. Real S3/provider behavior,
hosting CORS and production UI require their own release readback.
