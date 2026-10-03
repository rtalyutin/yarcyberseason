# Dota tournament MVP

## Authorized behavior and source

The tournament page has a Dota-only **MVP турнира** section, independent of the
selected site theme. The section shows a calculation leader, the top 20 (including
everyone exactly tied at the cutoff), all players, and each player's map details.
It does not assign an official award automatically. Existing published podiums
and team results remain organizer records.

The source is §9.4–9.4.11 of `public/docs/reglament-dota2-autumn-2026.pdf`,
revision dated 14 September 2026. For a played map:

```
M = (K + A - L) / 3 + (D + T) / 1500 + H / 500 + C / 15 + V / 2 + S / 6
R = sum(M) across counted Swiss and playoff maps
```

| Metric | Exact source and filter |
| --- | --- |
| K, A, L | `kills`, `assists`, `deaths` |
| D | All `damage_targets` inflictors, including the `null` inflictor, targeting exactly the five real enemy heroes |
| T | `damage` targeting enemy towers (including T4), melee/range barracks and Ancient; no allied buildings or fillers |
| H | `healing` targeting exactly the other four allied real heroes; no self-healing |
| C | `stuns` seconds, preserving the API's decimal literal |
| V | Confirmed enemy observer ward destruction across all ten players' `obs_left_log`, with owner, exact attacking hero, event identity and map time bounds |
| S | `camps_stacked`; not `creeps_stacked` |

Ward events are deduplicated by entity identity, or confirmed owner/time/position
identity. Expiry, allied denies and unknown attackers do not score. The recorded
map interval includes `[-pre_game_duration, duration]`; a negative event without
a known pregame bound cannot be counted as confirmed. Real historical API data
contains valid enemy ward kills during the pregame interval. Aggregate
`hero_damage`, `tower_damage` and `hero_healing` are not replacements for the
required target collections.

All arithmetic, ranking and tie checks use reduced rational numbers serialized
as `{numerator: string, denominator: string}`. Only display values are rounded
to two decimal places. Negative scores are preserved. There is no per-map
average, minimum-map threshold or invented tiebreaker. An exact maximum tie
requires the regulation's BO1 1v1 mid, first five kills; the UI reports the tie
without choosing a winner.

## Identity and incomplete data

One Dota account has one tournament rating, even when a substitute plays for
several teams. Team association is retained per map. Steam64 is derived exactly
from the account ID with the offset `76561197960265728`.

`src/data/player-identities.json` is a separate confirmed account-to-team registry;
it does not extend the public roster member schema. A roster nickname is used
only when both account ID and the map's team match. Otherwise the API nickname
for that account is used. Conflicting or unresolved roster accounts are retained
as unresolved metadata rather than guessed bindings.

A scored map requires ten unique accounts, ten distinct known heroes, five
players per side and all required parsed collections. Present empty collections
are valid zeros; missing collections are pending data. One missing player's
metric makes the whole map pending. The cache retries pending data; elapsed time
does not prove that a replay is irrecoverable. Only an explicit organizer reason
excludes a map, then all ten players receive no MVP score for it. Team results
remain separate. A technical win without a played map adds no score.

## Collector and publication

`backend/dota-results-import.mjs` uses the existing worker and S3 writer. It
discovers Match IDs through Tournament/League ID `20164`. Matching requires a
unique published fixture, the fixture's date window and either exact normalized
team names or confirmed OpenDota team IDs. It does not infer unpublished pairs.

| Object | Purpose |
| --- | --- |
| `results/dota2-autumn-2026.json` | Existing complete series results |
| `results/dota2-autumn-2026-mvp-cache.json` | Minimal raw required fields, parsed version, hero registry, account nicknames and per-map import status |
| `results/dota2-autumn-2026-mvp.json` | Validated public map records and player totals |

Ready maps are recalculated from cache without redownloading the whole league.
Pending maps are retried independently of whether a series was already
published. Explicit `rescanMatchIds: 'all' | [ids]` supports corrected API data;
an incomplete or failed correction preserves the previous confirmed score and
publishes `correctionPendingMatchIds` so the UI identifies the pending recheck.
`excludedReasons: {matchId: reason}` records an organizer's exclusion; an empty
reason removes it. These are internal importer arguments, not public HTTP
triggers. The public section identifies unresolved source ingestion separately
from confirmed tournament maps.

Writes compare the current S3 state, apply an object precondition, and read back
the exact intended object. Failed or conflicting writes preserve the last valid
client snapshot. MVP updates are independent of the existing early return for
“No new confirmed series”. One writer instance remains required. See
[dota-results-s3.md](dota-results-s3.md) for activation, credentials and hosting.
If publication fails at the end of the active period, the worker retains the
already discovered IDs in memory and retries those known maps and writes after
the period ends. This does not resume broad league discovery. Once the cache
has been persisted, a restarted worker can also repair result publication from
ready cached sources without downloading them again. In-memory retries alone
do not provide durability across a process crash before the first cache write.

## Historical acceptance check

The read-only probe fetched all 102 Match IDs from old OpenDota league `19021`.
This league spans multiple events, so the full league is not a single tournament
award. The provisional historical check selects the 63 maps within the published
spring archive dates, 25 March–26 April 2026 Moscow time, across both divisions.
It is a retrospective calculation under the current autumn regulation.

Of those 63 maps, 61 have complete required data and two remain pending:
`8750950136` has an unparsed replay, and `8773015016` has an unknown hero ID.
No pending map has been converted into a zero or declared irrecoverable.
The bundled archive snapshot is marked retrospective and provisional. Its
leader is **КАМЕНЬ**, account `166320521`, **506.19** over 15 counted maps
(exactly `75928917737 / 150000000`). This is not an official historical award.
The date-based tournament association remains provisional.

An independent Python Decimal/Fraction oracle verified all 1,000 complete player
map calculations in the 102-map capture, and the spring aggregate and top 20,
against the implementation. The initial production-collector fault injection
found the missing-middle-map BO3 bug described above; its regression check is a
release requirement. The actual production collection function was also replayed
against all 63 captured spring API responses through a read-only adapter: all
610 scored player map records and 100 player totals matched the historical
snapshot. A repeated cycle fetched only the two pending maps. The adapter's
fixture projection verifies collector behavior, not official historical fixture
association.

The probe and historical CLI perform no S3 writes and send no parse requests:

```
node scripts/dota-mvp-api-probe.mjs <capture-directory>
node backend/dota-mvp-history.mjs --input <capture-directory> --scope <scope.json> --output <report-directory>
node --test tests/dota-mvp*.test.mjs tests/dota-results*.test.mjs
```

`scope.json` contains `tournamentId`, `leagueId`, explicit `matchIds`,
`provisional` and `sourceNote`. Confirmed `teamBindings`/`mapBindings` can improve
association later. A partial historical CLI run intentionally exits with status
1 and reports `PARTIAL_DATA`; its completed calculations remain inspectable.
Real production S3 writing and account-specific Timeweb backend configuration
require a separate verified runtime check; offline storage tests do not prove
that runtime deployment is active.
