import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import demo from "../../tests/fixtures/telegram/rich-card-demo.json" with { type: "json" };
import { buildMiniAppModel } from "../../src/telegram/data/model.js";
import { loadMiniAppModel } from "../../src/telegram/data/load.js";
import { projectContent } from "../../src/data/project-content.js";
import { buildRichCard } from "../../src/telegram/rich-card/model.js";

export async function richCardCases() {
  const model = buildMiniAppModel(demo.tournament, demo.registry, projectContent);
  const demoMatch = model.matches[0];
  const planned = buildRichCard(model, demoMatch.key, demo.provenance);
  const variants = Object.fromEntries(Object.entries(demo.variants).map(([name, variant]) => {
    const tournament = structuredClone(demo.tournament);
    Object.assign(tournament.stages[0].rounds[0].matches[0], variant);
    const variantModel = buildMiniAppModel(tournament, demo.registry, projectContent);
    // Optional Rich Card evidence is explicit in the fixture, never inferred from scores.
    if (variant.currentMap) variantModel.matches[0].currentMap = structuredClone(variant.currentMap);
    return [name, buildRichCard(variantModel, demoMatch.key, demo.provenance)];
  }));
  const archived = loadMiniAppModel("cs2-august-2026");
  const bytes = await readFile(new URL("../../src/data/tournaments/current-cs2-2026.json", import.meta.url));
  const published = buildRichCard(archived, `${archived.tournament.id}/${archived.results.finalMatchId}`, {
    kind: "published", revision: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, source: "src/data/tournaments/current-cs2-2026.json",
  });
  return { current: loadMiniAppModel(), cases: { planned, live: variants.live, zero: variants.zero, published } };
}
