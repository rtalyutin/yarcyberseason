# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## YCS design decisions

- The selected visual direction is an editorial esports interface: near-black/navy canvas, cobalt blue accents, white condensed-feeling type, thin technical dividers, and sparse warm status nodes. Do not use gradients.
- The real YCS logo is `public/assets/ycs-logo.jpg`; preserve it as the primary brand mark.
- The tournament hero is a status and context panel only. Round-robin tables and playoff brackets live in independent lower sections.
- Every tournament uses its own JSON data file. A current/upcoming tournament may show deliberately empty tables or placeholder bracket slots until real match data is published; never invent results.
- Historic Dota 2 Main has saved group tables and confirmed playoff matches, but not a complete bracket. Keep that distinction visible in the UI.
- The season overview must clearly separate the live CS2 tournament, the announced next Dota 2 tournament, and the results archive; do not reuse historic CS2 data on the live CS2 page.
- The archive includes Dota 2 Main, February CS2, and Dota 2 Qual. For Qual, dates on December match cards have no published year and no playoff topology is available.
- Current CS2 first-round schedule is a live operational surface: four technical victories are recorded as wins, while scheduled matches remain explicitly pending until an organiser confirms their result.
- The CS2 matchday route uses the selected "Fight Sheet" direction: one featured matchup on the left, three supporting matchups on the right, first-round results in a closed-by-default accordion, and an official partner band. Dodo Pizza uses the supplied real logo asset; do not replace it with generated or typographic stand-ins.
- Current CS2 standings are ordered by match wins, then head-to-head when the tied teams have played, then rounds won. Teams are seeded within their final Swiss record bucket. Final locked seeds are bobr1ki (1), SAITEN x BAD.RABBIT (2), PIVNAYA KEGA (3), GoonGang (4), DealDucks (5), Resistance (6), PSB_Bank (7), and Hunger to victories (8).
- Current CS2 playoffs use an eight-team double-elimination bracket. The confirmed opening upper-bracket pairs are bobr1ki–Hunger to victories (1–8), SAITEN x BAD.RABBIT–PSB_Bank (2–7), PIVNAYA KEGA–Resistance (3–6), and GoonGang–DealDucks (4–5).

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
