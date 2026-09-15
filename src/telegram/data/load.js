import tournament from "../../data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import registry from "../../data/teams.json" with { type: "json" };
import { projectContent } from "../../data/project-content.js";
import { MINI_APP_CONFIG } from "../config.js";
import { buildMiniAppModel } from "./model.js";

export function loadMiniAppModel() {
  if (tournament.slug !== MINI_APP_CONFIG.tournamentSlug) throw new Error("Selected miniapp tournament does not match configuration");
  return buildMiniAppModel(tournament, registry, projectContent);
}
