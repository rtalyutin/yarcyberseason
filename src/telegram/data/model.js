import { buildCommunityModel, matchDateLabel } from "../../lib/community.js";
import { MINI_APP_CONFIG } from "../config.js";
import { transformActions } from "./actions.js";
import { assertMiniAppModel, createRegistryProjection, validateSelectedSource } from "./validate.js";

const labels = {
  overview: "О турнире", participants: "Участники", rules: "Формат", schedule: "Расписание",
  matches: "Матчи", swiss: "Swiss", playoffs: "Плей-офф", results: "Итоги",
};

const emptyTexts = {
  participants: "Участники ещё не опубликованы",
  rules: "Регламент ещё не опубликован",
  schedule: "Расписание ещё не опубликовано",
  matches: "Матчи ещё не опубликованы",
  swiss: "Таблица Swiss ещё не опубликована",
  playoffs: "Пары плей-офф ещё не опубликованы",
};

const cloneValue = (value, fallback) => value == null ? fallback : structuredClone(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const stageRounds = (stage) => stage.rounds || [{ id: `${stage.id}-matches`, label: stage.title, matches: stage.matches || [] }];
const visibleRaw = (match) => match?.published !== false;
const isPublishedMatch = (match) => visibleRaw(match) && Boolean(match.team1 || match.team2);

function mapMatch(record) {
  const external = [];
  for (const [field, label] of [["streamUrl", "Трансляция"], ["replayUrl", "Запись"], ["documentUrl", "Документ"]]) {
    const url = record[field];
    if (!nonEmpty(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) external.push({ kind: "external", label, url: parsed.href });
    } catch { /* Invalid source links are rejected by validation elsewhere. */ }
  }
  return {
    key: record.key,
    id: record.id,
    tournamentId: record.tournamentId,
    stageId: record.stageId,
    roundId: record.roundId || null,
    roundTitle: record.roundTitle || record.stageTitle,
    team1: record.team1 || null,
    team2: record.team2 || null,
    team1Id: record.team1Id || null,
    team2Id: record.team2Id || null,
    status: record.status || "unknown",
    scheduledAt: record.scheduledAt || null,
    date: record.date || null,
    dateDisplay: matchDateLabel(record),
    bestOf: record.bestOf || null,
    note: record.note || null,
    result: cloneValue(record.result, null),
    links: external,
  };
}

function tableForGroup(group, stage, community, tournamentId, index) {
  const rows = group.rows || [];
  const hasMapRecord = rows.some((row) => Object.hasOwn(row, "mapRecord"));
  const hasFinal = rows.some((row) => Object.hasOwn(row, "finalLabel") || Object.hasOwn(row, "points"));
  const columns = [
    { key: "position", label: "Место" }, { key: "played", label: "И" },
    { key: "won", label: "В" }, { key: "lost", label: "П" },
    ...(hasMapRecord ? [{ key: "mapRecord", label: group.recordColumnLabel || "Счёт" }] : []),
    ...(hasFinal ? [{ key: "final", label: group.finalColumnLabel || "Итог" }] : []),
  ];
  return {
    id: group.id || `${stage.id}-group-${index + 1}`,
    title: group.title || stage.title,
    columns,
    rows: rows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .sort((left, right) => {
        const leftPosition = Number.isInteger(left.row.position) ? left.row.position : Number.POSITIVE_INFINITY;
        const rightPosition = Number.isInteger(right.row.position) ? right.row.position : Number.POSITIVE_INFINITY;
        return leftPosition - rightPosition || left.sourceIndex - right.sourceIndex;
      })
      .map(({ row }) => ({
      teamId: community.resolveTeam(tournamentId, row.team)?.id || null,
      displayName: row.team || "—",
      cells: {
        position: row.position ?? null,
        played: row.played ?? null,
        won: row.won ?? null,
        lost: row.lost ?? null,
        ...(hasMapRecord ? { mapRecord: row.mapRecord ?? null } : {}),
        ...(hasFinal ? { final: row.finalLabel ?? row.points ?? null } : {}),
      },
      seed: Number.isInteger(row.seed) ? row.seed : null,
      placeLocked: row.placeLocked === true,
    })),
  };
}

function mapStage(stage, tournament, matchMap, community) {
  const visibleIds = new Set(stageRounds(stage).flatMap((round) => (round.matches || []).filter(visibleRaw).map((match) => match.id)));
  const rounds = stageRounds(stage).map((round, index) => ({
    id: round.id || `${stage.id}-round-${index + 1}`,
    label: round.label || stage.title,
    slots: (round.matches || []).filter(visibleRaw).map((raw) => {
      const key = `${tournament.id}/${raw.id}`;
      return isPublishedMatch(raw) && matchMap.has(key)
        ? { slotKey: key, kind: "match", matchKey: key }
        : { slotKey: key, kind: "empty" };
    }),
  }));
  const edges = [];
  for (const raw of stageRounds(stage).flatMap((round) => round.matches || []).filter(isPublishedMatch)) {
    for (const [field, outcome] of [["winnerTo", "winner"], ["loserTo", "loser"]]) {
      const target = raw[field];
      if (!target || !visibleIds.has(target.matchId)) continue;
      edges.push({
        fromSlotKey: `${tournament.id}/${raw.id}`,
        toSlotKey: `${tournament.id}/${target.matchId}`,
        outcome,
        targetSide: target.slot ?? null,
      });
    }
  }
  const tables = (stage.groups || []).map((group, index) => tableForGroup(group, stage, community, tournament.id, index));
  const occupied = rounds.reduce((sum, round) => sum + round.slots.filter((slot) => slot.kind === "match").length, 0);
  const empty = rounds.reduce((sum, round) => sum + round.slots.filter((slot) => slot.kind === "empty").length, 0);
  const hasRows = tables.some((table) => table.rows.length);
  const availability = occupied || hasRows ? (empty ? "partial" : "ready") : "empty";
  return {
    id: stage.id,
    type: stage.type,
    title: stage.title,
    notice: stage.notice || stage.emptyState || null,
    rules: (stage.rules || []).map((rule) => ({ label: rule.label || null, value: rule.value })),
    availability,
    tables,
    rounds,
    edges,
  };
}

function section(id, ready, emptyText = null) {
  return { id, label: labels[id], availability: ready ? "ready" : "empty", emptyText: ready ? null : emptyText };
}

export function buildMiniAppModel(tournament, registry, projectContent) {
  const sourceErrors = validateSelectedSource(tournament, registry);
  if (sourceErrors.length) throw new Error(`Invalid miniapp source:\n${sourceErrors.join("\n")}`);
  const projection = createRegistryProjection(tournament, registry);
  const community = buildCommunityModel([tournament], projection);
  const matches = [...community.matches.values()].map(mapMatch);
  const matchMap = new Map(matches.map((match) => [match.key, match]));
  const stages = (tournament.stages || []).map((stage) => mapStage(stage, tournament, matchMap, community));
  const swiss = stages.find((stage) => stage.type === "swiss");
  const playoffs = stages.find((stage) => stage.type === "double_elimination");
  const results = tournament.results ? cloneValue(tournament.results, null) : null;
  const participantIds = new Set();
  const registryTeams = new Map(projection.teams.map((team) => [team.id, team]));
  const participants = (tournament.participants || []).map((participant) => {
    participantIds.add(participant.teamId);
    return {
      teamId: participant.teamId,
      displayName: participant.displayName,
      logoUrl: registryTeams.get(participant.teamId)?.logo || null,
      status: participant.status,
    };
  });
  const rulesReady = stages.some((stage) => stage.rules.length || stage.notice);
  const scheduleReady = Boolean((tournament.timeline || []).length || matches.some((match) => match.scheduledAt || match.date || match.dateDisplay));
  const sections = [
    section("overview", true),
    section("participants", participants.length > 0, emptyTexts.participants),
    section("rules", rulesReady, emptyTexts.rules),
    section("schedule", scheduleReady, emptyTexts.schedule),
    section("matches", matches.length > 0, emptyTexts.matches),
    section("swiss", Boolean(swiss && swiss.availability !== "empty"), emptyTexts.swiss),
    section("playoffs", Boolean(playoffs && playoffs.availability !== "empty"), tournament.stages?.find((stage) => stage.id === "playoffs")?.emptyState || emptyTexts.playoffs),
    ...(results ? [section("results", true)] : []),
  ];
  const model = {
    schemaVersion: 1,
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      title: tournament.title,
      discipline: tournament.discipline,
      season: tournament.season,
      status: tournament.status,
      statusLabel: tournament.statusLabel,
      dates: cloneValue(tournament.dates, { start: null, end: null, display: null }),
      summary: tournament.summary,
      facts: cloneValue(tournament.facts, []),
    },
    registration: {
      status: tournament.registration?.status || null,
      message: tournament.registration?.message || null,
      capacity: Number.isInteger(tournament.registration?.capacity) ? tournament.registration.capacity : null,
      count: participantIds.size,
    },
    participants,
    actions: transformActions(tournament, { hasResults: Boolean(results) }),
    timeline: cloneValue(tournament.timeline, []),
    stages,
    matches,
    rewards: {
      prizeDistribution: cloneValue(tournament.prizeDistribution, null),
      additionalAwards: cloneValue(tournament.additionalAwards, []),
      referralContest: cloneValue(tournament.referralContest, null),
    },
    results,
    sections,
    project: {
      brandName: projectContent.brandName,
      logoUrl: projectContent.logoUrl,
      partners: projectContent.partners.map((partner) => ({ name: partner.name, logoUrl: partner.logoUrl })),
      contactEmail: projectContent.contactEmail,
    },
  };
  if (model.tournament.slug !== MINI_APP_CONFIG.tournamentSlug) throw new Error("Miniapp tournament configuration changed during adaptation");
  return assertMiniAppModel(model);
}
