# Tournament navigator — design QA

final result: passed

## Target and evidence

Selected option 3 from the latest universal archived-tournament ideation set. Reference: `docs/tournament-qa/reference.png`. Actual browser captures: `docs/tournament-qa/desktop.jpg` and `docs/tournament-qa/mobile.jpg`.

Reference and implementation were opened together for visual comparison, including the header, sidebar, filters and dense match rows. Desktop was rendered at 1487 × 1059 CSS pixels in an iframe loading the real Vite app. The QA harness scales that viewport uniformly to fit the cloud browser; its toolbar and grey surroundings are not product UI. Mobile captures use a 390 × 844 iframe (375px content width with the desktop browser scrollbar); a 375px iframe was also checked (360px content width). The harness is excluded from git.

## Visual result

The implementation retains the selected flat navy canvas, real YCS mark, compact title/status/date header, left navigation, blue active section/filter, search, central scores, winner emphasis, thin row dividers, five initial matches and progressive reveal. Final density adjustment brings the five-row archive view and footer into the target viewport. On mobile, section navigation wraps above the search; long team names wrap without colliding with the score. Both mobile widths have equal body clientWidth and scrollWidth.

Intentional content differences: the JSON contains 24 February results, so those correctly precede the mock's 21 February examples. An `О турнире` section retains published summaries, rules, timeline, rewards and source notices. Date wording and archive notices preserve the source rather than adding an unsupported online-stage label or champion. These are shared data rules, not tournament-specific layout branches.

P0/P1/P2 findings fixed: incorrect classification of “Матчи до плей-офф”; a missing JavaScript parenthesis; rendering structured `{label,value}` rules as text; excessive desktop row/header height. No remaining blocking visual or interaction findings. P3: minor typography/icon differences from generated imagery remain; existing source fonts and Phosphor icons are reused.

## Functional verification

- February CS2: 33 published results, 20 before playoffs and 13 playoff matches; five rows initially, show eight more; case-insensitive search matches either opponent; Resistance yields three playoff results; empty result and reset work.
- Phase filters, table tabs, section navigation and browser Back restore the expected content. Search/phase/section are represented in the URL; legacy stage hashes are supported.
- Mobile navigation opens/closes; no page-width overflow at either checked mobile width.
- Current CS2: existing double-elimination topology, seeds, corrected PSB 1:2 and results preserved. The two upcoming finals remain unscored and ordered before completed matches. Match details expand.
- Upcoming Dota 2: no fake matches counted from empty bracket slots; registration email, Swiss rules, playoff format, dates, 30,000 ₽ prize distribution, extra awards and referral terms remain accessible. Regulation and Swiss-section controls work.
- Dota Main: partial playoffs remain a list of six confirmed results with the incompleteness notice. Qual: no invented playoff navigation or year.
- Tournament JSON and approved Matchday source files are unchanged.

## Automated gates

`npm run build`, `npm run test:sites` (4), `npm run test:matchday` (5), `npm run test:tournament` (6), and `git diff --check` passed. Build retains the existing warnings about unavailable Nimbus font files; the tournament navigator uses the available YCS Sans fonts.

No new dependencies, data migrations or deployment changes. Preview remains local; production publication is a separate action.
