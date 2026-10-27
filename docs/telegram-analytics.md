# Telegram audience snapshot — 27 October 2026

The partners page imports `src/data/telegram-analytics.json`. This is a dated organizer-supplied export for `https://t.me/dota2yar`, not a live counter. Twitch and optional external audience sources keep their existing behavior.

Source: `ЯрКиберСезон. CS2&DotA2. версия 2_2026-10-27.xlsx`.
SHA-256: `c12139d3d77ad7890cbd760158f8a3bcd51fbf65e2a34640017fd25959a3de74`.

## Published values and definitions

| Metric | Value | Source |
| --- | ---: | --- |
| Channel followers | 268 | Overview B2, also the final Growth row |
| Views per post | 100 | Overview B3 |
| Shares per post | 1 | Overview B4 |
| Reactions per post | 5 | Overview B5 |
| Publication views | 28,463 | Sum of Interactions B2:B94 |
| Publication shares | 559 | Sum of Interactions C2:C94 |
| Joined | 81 | Sum of Followers B2:B94 |
| Left | 48 | Sum of Followers C2:C94 |

The Overview sheet does not specify its reporting period. Its per-post values are copied as supplied, not labeled as medians or recalculated as averages across the full daily series. The Previous column is not used. Dates in the hourly sheet describe that sheet alone.

Both daily series cover 93 dates from 27 July through 27 October 2026 inclusive. The final day is partial at export. Counts of views and actions do not measure unique people. Followers are a stock at the export date and are never summed across dates or with Twitch followers.

Reactions and stories have different date coverage and are not mixed into the published daily totals. Daily growth and joins/leaves use different opening boundaries: the first Growth value is 234, and the first Followers day already includes one departure. Consequently the first-to-last Growth difference is not presented as the net of all 93 daily rows.

## Verification

The extraction used openpyxl in read-only mode. A separate standard-library ZIP/XML parser independently checked all eight published values, source hash, daily date coverage, and the final Growth follower count. For every daily row, Interactions views also reconcile with the sum of the seven columns in Views by source.

The production build and rendered partners HTML must show the dated Telegram snapshot beside the existing Twitch snapshot. The frontend's optional audience fetch must not replace this export with an unavailable placeholder.
