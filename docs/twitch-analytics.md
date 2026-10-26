# Twitch analytics — 26 October 2026

## ACTIVE_CONTRACT

Update the existing `/partners/#audience` audience section from Roman's two
attached Twitch exports and publish on the existing main website. Preserve
the page's existing visual system, Telegram feed, other Twitch channels,
tournament data and hosting.

The main channel is YarCyberSeason. Publish audience aggregates only; the
uploaded daily export also contains income columns which are not published.
Source fingerprints and exact unrounded totals live in
`src/data/twitch-analytics.json`. Original CSVs remain outside the repository.

## Data contract / revision 1

- 299 daily rows, 1 January through 26 October 2026 inclusive; 26 October is
  partial at export time. There are 62 days with positive broadcast minutes.
- Add daily live views, minutes streamed/watched and new followers. Divide
  minutes by 60 for hours. Weighted average concurrent viewers = total watched
  minutes / total broadcast minutes. Peak = maximum daily peak.
- Daily unique viewers and chat participants must not be added into period-wide
  unique people. The final's unique-viewer value is for 25 October only.
- The daily 25 October row supplies final totals and is already in the period.
  It reports 224 minutes and 2,749 live views. The minute export contains 223
  rows and 2,742 views, so do not replace the daily totals with incomplete
  minute sums. Both agree on 4 new followers, 244 chat messages and peak 113.
- 177 followers means new followers over the period, not current channel size.
  Keep current followers separate when the existing external feed supplies it.
- Render the dated historical CSV snapshot even if the dynamic feed fails.
  Never relabel a historical import as live API data. Do not replace Telegram
  or another Twitch channel with this main-channel snapshot.
- Display uses the existing one-decimal Russian number formatter. The source
  final average remains 73.45, displayed as 73.5.

API/sequence checkpoint: existing remote audience GET, validation, refresh and
failure behavior are unchanged. New HTTP API/async protocol: N/A; the imported
read-only JSON is bundled and prerendered with the existing page. The same
primary-channel card remains visible before and after the remote request.

## TASK_STATE

PREPARED / source-qualified against main `87fb9dc96a30fea22b4f38fbfd14142cbd8a1284`:
independent Node recalculation matches all 18 metrics written by the Python
import; source SHA256 and 299 distinct dates match. Both exports agree on the
three cross-checks above. Production build and prerendered partners-page
number/label checks pass. No raw CSV or income values enter the public bundle.

Existing `test:content`: 26/30 pass, four old failures concerning current
Matchday fixtures and partner registry assumptions; the unchanged base has the
same four failures. `test:sites`: 4/6 pass; the unchanged base reproduces both
failures concerning route inventory and the CS2 final heading. They are outside
this audience change. Do not interpret the build as a green full test suite.

The cloud browser cannot reach this workspace's local preview. Inspect the
actual existing site after the authorized main update before claiming LIVE
verification; no replacement host is needed. Keep the public URL
`https://xn--90aiaibl0ahlel5n.xn--p1ai/partners/#audience` as the readback target.

Rollback: revert only this revision's three files on top of current main;
there are no migrations, private-state writes or hosting changes.
