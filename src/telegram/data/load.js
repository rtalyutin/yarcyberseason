import tournament from "../../data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import cs2 from "../../data/tournaments/current-cs2-2026.json" with { type: "json" };
import dotaMain from "../../data/tournaments/dota2-main-2026.json" with { type: "json" };
import cs2February from "../../data/tournaments/cs2-february-2026.json" with { type: "json" };
import dotaQual from "../../data/tournaments/dota2-qual-2026.json" with { type: "json" };
import registry from "../../data/teams.json" with { type: "json" };
import { projectContent } from "../../data/project-content.js";
import { MINI_APP_CONFIG } from "../config.js";
import { buildMiniAppModel } from "./model.js";

const sources = [tournament, cs2, dotaMain, cs2February, dotaQual];
export function loadMiniAppModel(slug = MINI_APP_CONFIG.tournamentSlug) {
  const source = sources.find((item) => item.slug === slug);
  if (!source) throw new Error("Unknown miniapp tournament");
  return buildMiniAppModel(source, registry, projectContent);
}
export function loadArchivedModels() {
  return sources.filter((item) => ["completed", "archive"].includes(item.status))
    .sort((a, b) => (b.dates?.end || "").localeCompare(a.dates?.end || ""))
    .map((item) => loadMiniAppModel(item.slug));
}
