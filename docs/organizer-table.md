# Organizer table

Contract (Roman, 7 October 2026): `/orgs` contains one read-only table of matches,
broadcasts, casters and partners across all tournaments, with tournament filtering.
The login/password are server deployment environment variables. No editing API.

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

All responses use `Cache-Control: no-store`. Missing credentials give 503;
invalid login or session gives 401; disallowed origin gives 403; failed login
attempts are limited to 5 per minute per backend-observed address and process.
JSON login body is limited to 4 KiB. Wrong methods give 405. There is no write
endpoint for matches, results or assignments.

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
support. Caster names and channel selection remain unconfirmed; the UI retains
«Не назначены»/«Ссылка не назначена». No credentials or contact details from
the register are copied to the table.

Published empty bracket slots remain visible with unknown participants/status.
Undated matches and archive dates without a year remain unknown. Exact
`scheduledAt` values render in `Europe/Moscow`; an unzoned published time is
explicitly marked instead of assuming a timezone. Scores appear only when the
existing result normalizer confirms them. Technical results remain distinct.

Local checks: `node --test tests/organizer.test.mjs`, the existing backend runtime
checks and `npm run build` / `npm run test:sites`. Browser acceptance covers login,
filters, refresh/logout, desktop/mobile table scrolling and navigation links.
