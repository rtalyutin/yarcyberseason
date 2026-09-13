import { MINI_APP_CONFIG, SECTION_IDS } from "../config.js";
import { isUiAction, tournamentRoute } from "../contracts.js";

const sectionSet = new Set(SECTION_IDS);
const internalBase = "https://miniapp.invalid";

function internalAction(label, section) {
  return { kind: "internal", label, route: tournamentRoute(section) };
}

export function transformAction(action, { hasResults = false } = {}) {
  if (!action || typeof action.label !== "string" || typeof action.target !== "string") return null;
  const label = action.label.trim();
  const target = action.target.trim();
  if (!label || !target) return null;

  if (/^https:\/\//i.test(target)) {
    const external = { kind: "external", label, url: target };
    return isUiAction(external) ? external : null;
  }
  if (/^(mailto:|tel:)/i.test(target)) return null;

  let section = null;
  if (target.startsWith("#")) {
    const anchor = target.slice(1);
    section = ({ format: "rules", info: "overview", rewards: "overview" })[anchor] || anchor;
  } else {
    let parsed;
    try { parsed = new URL(target, internalBase); } catch { return null; }
    if (parsed.origin !== internalBase) return null;
    if (![`/tournaments/${MINI_APP_CONFIG.tournamentSlug}`, `${MINI_APP_CONFIG.basePath}/tournament`].includes(parsed.pathname)) return null;
    section = parsed.searchParams.get("section") || "overview";
    if (section === "info") section = "overview";
  }

  if (!sectionSet.has(section)) return null;
  if (section === "results" && !hasResults) section = "overview";
  return internalAction(label, section);
}

export function transformActions(tournament, options) {
  return [tournament.primaryAction, tournament.secondaryAction]
    .map((action) => transformAction(action, options))
    .filter(Boolean);
}
