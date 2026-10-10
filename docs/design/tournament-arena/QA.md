# Independent browser QA

Targeted behavior and responsive checks: **PASS** on the frozen local source served by the supported Sites supervisor. Complete A01–A10 acceptance: **BLOCKED**, with specific unverified checks below; this is not an observed product failure.

Exact revision, results and limitations: [qa-final-report.json](qa-final-report.json), [frontend source manifest](qa-source-manifest.json). The baseline is `acb25fc`; the manifest identifies the changed working tree that was executed. A production build or public deployment was not independently exercised.

The actual page was rendered in exact 1440×900, 1024×768, 768×1024, 390×844 and 320×740 CSS viewports through temporary same-origin iframes. Their outer display may be uniformly scaled in screenshots. No product page-wide horizontal scroll remains. Two full cards fit at 1440 and the first full card fits at 390. All measured visible tournament controls are at least 44×44px. The shared header keeps its existing 1200px breakpoint. [Viewport receipts](qa-viewports.json).

Canonical absent/null/empty/blank and unsafe links render no broadcast area. Twitch-only, VK-only and both preserve exact URL identity; legacy URL/caster values do not supply links. Past scheduled time remains scheduled, with no LIVE class. One and two link cards were additionally executed at 320px after the body fix. [Broadcast cases](qa-broadcast-cases.json), [320px cases](qa-links-320.json).

Search, filter, clear without filter loss, progressive reveal, source order, independent details and the match destination passed on the actual page. CS2 and corporate themes retain their original compositions and fixtures at desktop and 390px. Actual MVP selection/history and sticky section positioning passed. Unconfirmed false/missing results show «Итог не подтверждён» and VS; scheduledAt-only details show the correct MSK date/time. [Behavior](qa-behaviors.json), [regression](qa-regression.json), [result/date edges](qa-result-date-cases.json).

Computed sampled text contrast exceeds 4.5:1; the search boundary and visible focus exceed 3:1. A keyboard Tab path reached a visible focus indicator. [Accessibility receipt](qa-accessibility.json).

The supplementary full Navigator checks passed: unknown dates form «Дата уточняется»; missing-logo URLs become TS/PK initials in reserved 44×44 boxes; a fixture-only missing-map URL keeps the 232px cover readable. An empty search shows 0 matches and «Команда не найдена». The full-empty-schedule check first found that the model removed the matches section and landed on info. The Dota opt-in correction was retested: matches remains selected, there are zero cards/date groups and «Расписание ещё не опубликовано». [Supplementary receipts](qa-navigator-gaps.json).

**Not verified:** actual 200% browser zoom and reduced-motion runtime. The supported ctrl+plus probe performed by the root agent left actual DPR 1 and inner 1363×936 unchanged, so it did not reach 200%. Narrow iframe width is not treated as browser zoom; no physical mobile device was used. Static source audit found no new arena animation/transition and fixed logo wrapper dimensions; this is not a runtime reduced-motion or layout-shift measurement.

Four observed defects were fixed and retested: full empty schedule routing, narrow MVP target, 390 first card below fold, 320 horizontal overflow. Their old JSON remains as history; stale/failed images and all temporary QA entries were removed before the release owner's final build.

The source manifest records both executed revisions: the main matrix digest and the final empty-schedule correction digest. Only the empty schedule was rerun after that two-file scoped change. All temporary Navigator entries have also been removed.

The release owner reports the final production build PASS, 119/119 author/integration tests, Sites 6/6, data validation of 52 teams/128 matches and diff check PASS. Those commands were not rerun by this independent browser verifier.
