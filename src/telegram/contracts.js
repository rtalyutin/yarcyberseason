import { MINI_APP_CONFIG, SECTION_IDS, STARTAPP_TARGETS } from "./config.js";

/** @typedef {'overview'|'participants'|'rules'|'schedule'|'matches'|'swiss'|'playoffs'|'results'} SectionId */
/** @typedef {{screen: 'home'}|{screen: 'tournament', section: SectionId}} MiniAppRoute */
/** @typedef {{kind: 'internal', label: string, route: MiniAppRoute}|{kind: 'external', label: string, url: string}} UiAction */
/** @typedef {{schemaVersion: 1, buildId: string, sourceCommit: string, tournamentSlug: 'dota2-autumn-2026'}} VersionManifest */
/** @typedef {{id: string, slug: 'dota2-autumn-2026', title: string, discipline: string, season: string, status: string, statusLabel: string, dates: {start: string|null, end: string|null, display: string|null}, summary: string, facts: string[]}} TournamentView */
/** @typedef {{status: string|null, message: string|null, capacity: number|null, count: number}} RegistrationView */
/** @typedef {{teamId: string, displayName: string, logoUrl: string|null, status: string}} ParticipantView */
/** @typedef {{confirmed: boolean, technical: boolean, known: boolean, sourceScore: [number, number]|null, series: [number, number]|null, score: [number, number]|null, maps: object[], winnerSide: 1|2|null, draw: boolean, label: string, canDownload: boolean}} NormalizedResult */
/** @typedef {{key: string, id: string, tournamentId: string, stageId: string, roundId: string|null, roundTitle: string, team1: string|null, team2: string|null, team1Id: string|null, team2Id: string|null, status: string, scheduledAt: string|null, date: string|null, dateDisplay: string|null, bestOf: string|null, note: string|null, result: NormalizedResult, links: UiAction[]}} MatchViewModel */
/** @typedef {{id: SectionId, label: string, availability: 'ready'|'empty', emptyText: string|null}} SectionView */
/** @typedef {{brandName: string, logoUrl: string, partners: {name: string, logoUrl: string}[], contactEmail: string}} ProjectView */
/**
 * @typedef {object} RuntimePort
 * @property {'telegram'|'browser'} kind
 * @property {() => Promise<void>} init
 * @property {() => void} ready
 * @property {() => MiniAppRoute|null} readLaunchTarget
 * @property {(handler: (() => void)|null) => void} setBackHandler
 * @property {(action: Extract<UiAction, {kind: 'external'}>) => void} openExternal
 * @property {(handler: () => void) => (() => void)} onResume
 * @property {() => void} dispose
 */
/** @typedef {{slotKey: string, kind: 'empty'}|{slotKey: string, kind: 'match', matchKey: string}} SlotView */
/** @typedef {{id: string, title: string, columns: {key: string, label: string}[], rows: {teamId: string|null, displayName: string, cells: Record<string, string|number|null>, seed: number|null, placeLocked: boolean}[]}} TableView */
/** @typedef {{id: string, type: 'swiss'|'double_elimination', title: string, notice: string|null, rules: {label: string|null, value: string}[], availability: 'ready'|'empty'|'partial', tables: TableView[], rounds: {id: string, label: string, slots: SlotView[]}[], edges: {fromSlotKey: string, toSlotKey: string, outcome: 'winner'|'loser', targetSide: 1|2|null}[]}} StageViewModel */
/** @typedef {{schemaVersion: 1, tournament: TournamentView, registration: RegistrationView, participants: ParticipantView[], actions: UiAction[], timeline: {label: string, state: string, date: string}[], stages: StageViewModel[], matches: MatchViewModel[], rewards: {prizeDistribution: object|null, additionalAwards: object[], referralContest: object|null}, results: object|null, sections: SectionView[], project: ProjectView}} MiniAppModel */

const sectionSet = new Set(SECTION_IDS);
const startTargetSet = new Set(STARTAPP_TARGETS);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const record = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const ownKeys = (value, keys) => keys.every((key) => Object.hasOwn(value, key));
const nullableString = (value) => value === null || nonEmpty(value);
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const scorePair = (value) => value === null ||
  (Array.isArray(value) && value.length === 2 && value.every(nonNegativeInteger));
const hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));

export const isSectionId = (value) => sectionSet.has(value);

export function isMiniAppPath(pathname) {
  return typeof pathname === "string" &&
    (pathname === MINI_APP_CONFIG.basePath || pathname.startsWith(`${MINI_APP_CONFIG.basePath}/`));
}

export const homeRoute = () => ({ screen: "home" });

export function tournamentRoute(section = "overview") {
  if (!isSectionId(section)) throw new TypeError(`Unknown miniapp section: ${section}`);
  return { screen: "tournament", section };
}

export function isMiniAppRoute(value) {
  return record(value) && (value.screen === "home" ||
    (value.screen === "tournament" && isSectionId(value.section)));
}

export function serializeMiniAppRoute(route) {
  if (!isMiniAppRoute(route)) throw new TypeError("Invalid miniapp route");
  if (route.screen === "home") return MINI_APP_CONFIG.basePath;
  const suffix = route.section === "overview" ? "" : `?section=${encodeURIComponent(route.section)}`;
  return `${MINI_APP_CONFIG.basePath}/tournament${suffix}`;
}

/**
 * Resolve only the miniapp address space. `availableSections` lets L2 remove
 * results until valid tournament results exist without inventing a third route.
 *
 * @param {{pathname: string, search?: string, availableSections?: readonly SectionId[]}} input
 * @returns {{route: MiniAppRoute, canonicalUrl: string, needsReplace: boolean, notice: string|null}|null}
 */
export function resolveMiniAppLocation({ pathname, search = "", availableSections = SECTION_IDS }) {
  if (!isMiniAppPath(pathname)) return null;
  const available = new Set(availableSections.filter(isSectionId));
  available.add("overview");
  if (pathname === MINI_APP_CONFIG.basePath || pathname === `${MINI_APP_CONFIG.basePath}/`) {
    return {
      route: homeRoute(),
      canonicalUrl: MINI_APP_CONFIG.basePath,
      needsReplace: pathname !== MINI_APP_CONFIG.basePath || Boolean(search),
      notice: null,
    };
  }
  if (pathname !== `${MINI_APP_CONFIG.basePath}/tournament`) {
    return {
      route: homeRoute(),
      canonicalUrl: MINI_APP_CONFIG.basePath,
      needsReplace: true,
      notice: "Этот раздел недоступен в мини-приложении",
    };
  }
  const requested = new URLSearchParams(search).get("section") || "overview";
  const section = isSectionId(requested) && available.has(requested) ? requested : "overview";
  const route = tournamentRoute(section);
  const canonicalUrl = serializeMiniAppRoute(route);
  const sourceUrl = `${pathname}${search}`;
  return {
    route,
    canonicalUrl,
    needsReplace: sourceUrl !== canonicalUrl,
    notice: null,
  };
}

/** @returns {MiniAppRoute|null} */
export function routeFromStartTarget(value, availableSections = SECTION_IDS) {
  if (!startTargetSet.has(value)) return null;
  if (value === "home") return homeRoute();
  const section = value === "tournament" ? "overview" : value;
  return availableSections.includes(section) ? tournamentRoute(section) : tournamentRoute("overview");
}

function safeHttps(value) {
  if (!nonEmpty(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isUiAction(value) {
  if (!record(value) || !nonEmpty(value.label)) return false;
  if (value.kind === "internal") return ownKeys(value, ["route"]) && isMiniAppRoute(value.route);
  if (value.kind === "external") return ownKeys(value, ["url"]) && safeHttps(value.url);
  return false;
}

/** @returns {RuntimePort} */
export function assertRuntimePort(port) {
  const methods = ["init", "ready", "readLaunchTarget", "setBackHandler", "openExternal", "onResume", "dispose"];
  if (!record(port) || !["telegram", "browser"].includes(port.kind) || methods.some((name) => typeof port[name] !== "function")) {
    throw new TypeError("RuntimePort does not implement the L0 contract");
  }
  return port;
}

export function validateVersionManifest(value) {
  const errors = [];
  if (!record(value)) return ["Manifest must be an object"];
  if (value.schemaVersion !== 1) errors.push("Manifest schemaVersion must be 1");
  if (!nonEmpty(value.buildId)) errors.push("Manifest buildId is required");
  if (!nonEmpty(value.sourceCommit)) errors.push("Manifest sourceCommit is required");
  if (value.tournamentSlug !== MINI_APP_CONFIG.tournamentSlug) errors.push("Manifest tournamentSlug does not match miniapp configuration");
  return errors;
}

function validateSlot(slot, matchKeys, tournamentId, errors, path) {
  if (!record(slot) || !nonEmpty(slot.slotKey) || !["empty", "match"].includes(slot.kind)) {
    errors.push(`${path} is not a SlotView`);
    return;
  }
  const allowed = slot.kind === "empty" ? ["slotKey", "kind"] : ["slotKey", "kind", "matchKey"];
  if (!hasOnlyKeys(slot, allowed)) errors.push(`${path} contains fields outside SlotView`);
  if (!nonEmpty(tournamentId) || !slot.slotKey.startsWith(`${tournamentId}/`) || slot.slotKey === `${tournamentId}/`) errors.push(`${path}.slotKey must use tournamentId/rawMatchId`);
  if (slot.kind === "match" && (!nonEmpty(slot.matchKey) || !matchKeys.has(slot.matchKey))) {
    errors.push(`${path}.matchKey must reference matches[]`);
  }
  if (slot.kind === "match" && nonEmpty(slot.matchKey) && slot.slotKey !== slot.matchKey) errors.push(`${path}.slotKey must identify the referenced match`);
  if (slot.kind === "empty" && Object.hasOwn(slot, "matchKey")) errors.push(`${path} duplicates a match in an empty slot`);
}

function validateResult(result, errors, path) {
  const required = ["confirmed", "technical", "known", "sourceScore", "series", "score", "maps", "winnerSide", "draw", "label", "canDownload"];
  if (!record(result) || !ownKeys(result, required)) {
    errors.push(`${path} is not a NormalizedResult`);
    return;
  }
  for (const key of ["confirmed", "technical", "known", "draw", "canDownload"]) if (typeof result[key] !== "boolean") errors.push(`${path}.${key} must be boolean`);
  for (const key of ["sourceScore", "series", "score"]) if (!scorePair(result[key])) errors.push(`${path}.${key} must be a score pair or null`);
  if (!Array.isArray(result.maps) || result.maps.some((map) => !record(map))) errors.push(`${path}.maps must be an object array`);
  if (![null, 1, 2].includes(result.winnerSide)) errors.push(`${path}.winnerSide is invalid`);
  if (!nonEmpty(result.label)) errors.push(`${path}.label is required`);
}

function validateTable(table, errors, path) {
  if (!record(table) || !ownKeys(table, ["id", "title", "columns", "rows"]) || !nonEmpty(table.id) || !nonEmpty(table.title)) {
    errors.push(`${path} is not a TableView`);
    return;
  }
  if (!Array.isArray(table.columns) || table.columns.some((column) => !record(column) || !nonEmpty(column.key) || !nonEmpty(column.label))) errors.push(`${path}.columns is invalid`);
  if (!Array.isArray(table.rows)) {
    errors.push(`${path}.rows must be an array`);
    return;
  }
  table.rows.forEach((row, index) => {
    const rowPath = `${path}.rows[${index}]`;
    if (!record(row) || !ownKeys(row, ["teamId", "displayName", "cells", "seed", "placeLocked"]) || !nullableString(row.teamId) || !nonEmpty(row.displayName) || !record(row.cells) || !(row.seed === null || nonNegativeInteger(row.seed)) || typeof row.placeLocked !== "boolean") {
      errors.push(`${rowPath} is invalid`);
    } else if (Object.values(row.cells).some((cell) => !(cell === null || typeof cell === "string" || typeof cell === "number"))) {
      errors.push(`${rowPath}.cells contains an unsupported value`);
    }
  });
}

/**
 * Structural guard for the adapter output. It deliberately validates public
 * contracts, not raw tournament business rules owned by L2.
 */
export function validateMiniAppModel(value) {
  const errors = [];
  if (!record(value)) return ["MiniAppModel must be an object"];
  for (const key of ["tournament", "registration", "rewards", "project"]) if (!record(value[key])) errors.push(`${key} must be an object`);
  for (const key of ["participants", "actions", "timeline", "stages", "matches", "sections"]) if (!Array.isArray(value[key])) errors.push(`${key} must be an array`);
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (record(value.tournament)) {
    const required = ["id", "slug", "title", "discipline", "season", "status", "statusLabel", "dates", "summary", "facts"];
    if (!ownKeys(value.tournament, required) || ["id", "title", "discipline", "season", "status", "statusLabel", "summary"].some((key) => !nonEmpty(value.tournament[key])) || !record(value.tournament.dates) || !ownKeys(value.tournament.dates, ["start", "end", "display"]) || ["start", "end", "display"].some((key) => !nullableString(value.tournament.dates[key])) || !Array.isArray(value.tournament.facts) || value.tournament.facts.some((fact) => !nonEmpty(fact))) {
      errors.push("tournament is not a TournamentView");
    }
    if (value.tournament.slug !== MINI_APP_CONFIG.tournamentSlug) errors.push("tournament.slug does not match miniapp configuration");
  }
  if (record(value.registration) && (!ownKeys(value.registration, ["status", "message", "capacity", "count"]) || !nullableString(value.registration.status) || !nullableString(value.registration.message) || !(value.registration.capacity === null || nonNegativeInteger(value.registration.capacity)) || !nonNegativeInteger(value.registration.count))) errors.push("registration is not a RegistrationView");
  if (Array.isArray(value.participants)) value.participants.forEach((participant, index) => {
    if (!record(participant) || !nonEmpty(participant.teamId) || !nonEmpty(participant.displayName) || !nonEmpty(participant.status) || !(participant.logoUrl === null || nonEmpty(participant.logoUrl))) {
      errors.push(`participants[${index}] is invalid`);
    }
  });
  if (Array.isArray(value.actions)) value.actions.forEach((action, index) => { if (!isUiAction(action)) errors.push(`actions[${index}] is invalid`); });
  if (Array.isArray(value.timeline)) value.timeline.forEach((entry, index) => {
    if (!record(entry) || !ownKeys(entry, ["label", "state", "date"]) || !nonEmpty(entry.label) || !nonEmpty(entry.state) || !nonEmpty(entry.date)) errors.push(`timeline[${index}] is invalid`);
  });
  if (Array.isArray(value.sections)) value.sections.forEach((section, index) => {
    if (!record(section) || !isSectionId(section.id) || !nonEmpty(section.label) || !["ready", "empty"].includes(section.availability) || !(section.emptyText === null || typeof section.emptyText === "string")) {
      errors.push(`sections[${index}] is invalid`);
    }
  });
  if (Array.isArray(value.sections)) {
    const sectionIds = value.sections.map((section) => section?.id).filter(isSectionId);
    if (new Set(sectionIds).size !== sectionIds.length) errors.push("Duplicate section id");
    if ((value.results !== null) !== sectionIds.includes("results")) errors.push("results section and results payload must appear together");
  }
  const matchKeys = new Set();
  if (Array.isArray(value.matches)) value.matches.forEach((match, index) => {
    if (!record(match) || !nonEmpty(match.key)) errors.push(`matches[${index}].key is required`);
    else if (matchKeys.has(match.key)) errors.push(`Duplicate match key: ${match.key}`);
    else {
      matchKeys.add(match.key);
      const required = ["key", "id", "tournamentId", "stageId", "roundId", "roundTitle", "team1", "team2", "team1Id", "team2Id", "status", "scheduledAt", "date", "dateDisplay", "bestOf", "note", "result", "links"];
      if (!ownKeys(match, required)) errors.push(`matches[${index}] is not a MatchViewModel`);
      if (!nonEmpty(match.id) || !nonEmpty(match.tournamentId) || match.key !== `${match.tournamentId}/${match.id}`) errors.push(`matches[${index}].key does not match tournamentId/id`);
      if (!nonEmpty(match.stageId) || !nullableString(match.roundId) || !nonEmpty(match.roundTitle) || !nullableString(match.team1) || !nullableString(match.team2) || !nullableString(match.team1Id) || !nullableString(match.team2Id) || !nonEmpty(match.status) || ["scheduledAt", "date", "dateDisplay", "bestOf", "note"].some((key) => !nullableString(match[key]))) errors.push(`matches[${index}] contains invalid fields`);
      validateResult(match.result, errors, `matches[${index}].result`);
      if (!Array.isArray(match.links) || match.links.some((link) => !isUiAction(link))) errors.push(`matches[${index}].links is invalid`);
    }
  });
  const slotKeys = new Set();
  if (Array.isArray(value.stages)) value.stages.forEach((stage, stageIndex) => {
    const path = `stages[${stageIndex}]`;
    if (!record(stage) || !ownKeys(stage, ["id", "type", "title", "notice", "rules", "availability", "tables", "rounds", "edges"]) || !nonEmpty(stage.id) || !nonEmpty(stage.title) || !["swiss", "double_elimination"].includes(stage.type) || !nullableString(stage.notice) || !["ready", "empty", "partial"].includes(stage.availability)) errors.push(`${path} is not a StageViewModel`);
    if (!Array.isArray(stage?.rules) || stage.rules.some((rule) => !record(rule) || !ownKeys(rule, ["label", "value"]) || !nullableString(rule.label) || !nonEmpty(rule.value))) errors.push(`${path}.rules is invalid`);
    if (!Array.isArray(stage?.tables)) errors.push(`${path}.tables must be an array`);
    else stage.tables.forEach((table, tableIndex) => validateTable(table, errors, `${path}.tables[${tableIndex}]`));
    if (!Array.isArray(stage?.edges) || stage.edges.some((edge) => !record(edge) || !ownKeys(edge, ["fromSlotKey", "toSlotKey", "outcome", "targetSide"]) || !nonEmpty(edge.fromSlotKey) || !nonEmpty(edge.toSlotKey) || !["winner", "loser"].includes(edge.outcome) || ![null, 1, 2].includes(edge.targetSide))) errors.push(`${path}.edges is invalid`);
    if (!Array.isArray(stage?.rounds)) errors.push(`stages[${stageIndex}].rounds must be an array`);
    else stage.rounds.forEach((round, roundIndex) => {
      if (!record(round) || !ownKeys(round, ["id", "label", "slots"]) || !nonEmpty(round.id) || !nonEmpty(round.label)) errors.push(`${path}.rounds[${roundIndex}] is invalid`);
      if (!Array.isArray(round?.slots)) errors.push(`${path}.rounds[${roundIndex}].slots must be an array`);
      else round.slots.forEach((slot, slotIndex) => {
        const path = `stages[${stageIndex}].rounds[${roundIndex}].slots[${slotIndex}]`;
        validateSlot(slot, matchKeys, value.tournament?.id, errors, path);
        if (nonEmpty(slot?.slotKey)) {
          if (slotKeys.has(slot.slotKey)) errors.push(`Duplicate slot key: ${slot.slotKey}`);
          slotKeys.add(slot.slotKey);
        }
      });
    });
  });
  if (record(value.rewards) && (!ownKeys(value.rewards, ["prizeDistribution", "additionalAwards", "referralContest"]) || !(value.rewards.prizeDistribution === null || record(value.rewards.prizeDistribution)) || !Array.isArray(value.rewards.additionalAwards) || value.rewards.additionalAwards.some((award) => !record(award)) || !(value.rewards.referralContest === null || record(value.rewards.referralContest)))) errors.push("rewards is invalid");
  if (!(value.results === null || record(value.results))) errors.push("results must be an object or null");
  if (record(value.project) && (!ownKeys(value.project, ["brandName", "logoUrl", "partners", "contactEmail"]) || !nonEmpty(value.project.brandName) || !nonEmpty(value.project.logoUrl) || !nonEmpty(value.project.contactEmail) || !Array.isArray(value.project.partners) || value.project.partners.some((partner) => !record(partner) || !nonEmpty(partner.name) || !nonEmpty(partner.logoUrl)))) errors.push("project is not a ProjectView");
  return errors;
}
