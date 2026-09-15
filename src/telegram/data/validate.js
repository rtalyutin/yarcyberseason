import { MINI_APP_CONFIG } from "../config.js";
import { validateMiniAppModel } from "../contracts.js";
import { normalizeResult, validateCommunity } from "../../lib/community.js";
import { transformAction } from "./actions.js";

const rawMatches = (tournament) => (tournament.stages || []).flatMap((stage) =>
  (stage.rounds || [{ matches: stage.matches || [] }]).flatMap((round) => round.matches || []),
);

const record = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function validateTournamentResults(tournament, declared) {
  if (tournament.results == null) return [];
  const errors = [];
  const results = tournament.results;
  if (!record(results)) return [`Invalid results object: ${tournament.id}`];
  if (!nonEmpty(results.finalMatchId)) return [`Results finalMatchId is required: ${tournament.id}`];

  const final = declared.get(results.finalMatchId);
  if (!final || final.published === false || !final.team1 || !final.team2) {
    errors.push(`Results final match is missing or unpublished: ${tournament.id}/${results.finalMatchId}`);
  } else {
    const normalized = normalizeResult(final, tournament.discipline);
    if (!normalized.confirmed || !normalized.score || !normalized.winnerSide) {
      errors.push(`Results final match is not confirmed: ${tournament.id}/${results.finalMatchId}`);
    }
  }

  if (results.placements != null) {
    if (!Array.isArray(results.placements) || results.placements.length === 0) {
      errors.push(`Results placements must be a non-empty array: ${tournament.id}`);
    } else {
      const positions = new Set();
      for (const placement of results.placements) {
        if (!record(placement) || !Number.isInteger(placement.position) || placement.position < 1 || !nonEmpty(placement.team)) {
          errors.push(`Invalid result placement: ${tournament.id}`);
          continue;
        }
        if (positions.has(placement.position)) errors.push(`Duplicate result position: ${tournament.id}/${placement.position}`);
        positions.add(placement.position);
      }
    }
  }
  return errors;
}

function validateClosedRegistrationActions(tournament) {
  if (tournament.registration?.status !== "closed") return [];
  const errors = [];
  const actions = [tournament.primaryAction, tournament.secondaryAction];
  for (const [index, action] of actions.entries()) {
    if (!record(action) || (index > 0 && !/регистрац|подать\s+заявк|зарегистр|участв|стать\s+участник|заполнить\s+форм/iu.test(action.label || ""))) continue;
    const transformed = transformAction(action);
    const isParticipants = transformed?.kind === "internal" &&
      transformed.route.screen === "tournament" && transformed.route.section === "participants";
    if (!isParticipants) errors.push(`Closed registration action must lead to participants: ${tournament.id}`);
  }
  if (!record(tournament.primaryAction)) errors.push(`Closed registration primary action must lead to participants: ${tournament.id}`);
  return errors;
}

export function createRegistryProjection(tournament, registry) {
  const bindings = (registry.bindings || []).filter((binding) => binding.tournamentId === tournament.id);
  const teamIds = new Set([
    ...(tournament.participants || []).map((participant) => participant.teamId),
    ...bindings.map((binding) => binding.teamId),
  ]);
  return {
    schemaVersion: registry.schemaVersion,
    teams: (registry.teams || []).filter((team) => teamIds.has(team.id)),
    bindings,
    aliases: (registry.aliases || []).filter((alias) => teamIds.has(alias.teamId)),
  };
}

export function validateSelectedSource(tournament, registry) {
  const errors = [];
  if (!tournament || tournament.slug !== MINI_APP_CONFIG.tournamentSlug || tournament.id !== MINI_APP_CONFIG.tournamentSlug) {
    return [`Selected tournament must be ${MINI_APP_CONFIG.tournamentSlug}`];
  }
  const projection = createRegistryProjection(tournament, registry);
  errors.push(...validateCommunity([tournament], projection));

  const declared = new Map();
  for (const match of rawMatches(tournament)) {
    if (!match?.id || !/^[a-z0-9-]+$/.test(match.id)) errors.push(`Invalid declared match ID: ${tournament.id}/${match?.id || "missing"}`);
    else if (declared.has(match.id)) errors.push(`Duplicate declared match ID: ${tournament.id}/${match.id}`);
    else declared.set(match.id, match);
  }
  for (const match of declared.values()) for (const field of ["winnerTo", "loserTo"]) {
    const target = match[field];
    if (!target) continue;
    if (!declared.has(target.matchId)) errors.push(`Missing ${field}: ${match.id}`);
    if (target.slot != null && ![1, 2].includes(target.slot)) errors.push(`Invalid ${field} slot: ${match.id}`);
  }
  errors.push(...validateTournamentResults(tournament, declared));
  errors.push(...validateClosedRegistrationActions(tournament));
  return [...new Set(errors)];
}

export function assertMiniAppModel(model) {
  const errors = validateMiniAppModel(model);
  if (errors.length) throw new Error(`Invalid MiniAppModel:\n${errors.join("\n")}`);
  return model;
}
