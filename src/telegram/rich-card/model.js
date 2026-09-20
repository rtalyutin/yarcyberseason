import { validateMiniAppModel, serializeMiniAppRoute, tournamentRoute } from "../contracts.js";
import { matchStatusLabel } from "../match-presentation.js";
import { getMessages } from "../preferences.js";

export const PUBLIC_ORIGIN = "https://xn--90aiaibl0ahlel5n.xn--p1ai";
const copy = getMessages("ru");
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

export function publicAsset(path) {
  if (!hasText(path) || !/^\/assets\/[a-zA-Z0-9_./-]+$/.test(path) || path.split("/").includes("..")) return null;
  return new URL(path, PUBLIC_ORIGIN).href;
}

/**
 * RichCard/1 is a presentation DTO, not a second results store.
 * provenance: {kind: 'demo'|'published', revision: string, source: string}.
 * currentMap is optional explicit evidence, never inferred from a map list/clock:
 * {name: string, number: positive integer|null, confirmed: true, observedAt: ISO, source: string}.
 */
export function buildRichCard(model, matchKey, provenance) {
  const errors = validateMiniAppModel(model);
  if (errors.length) throw new TypeError(`Invalid card model: ${errors.join('; ')}`);
  if (!["demo", "published"].includes(provenance?.kind) || !hasText(provenance.revision) || !hasText(provenance.source)) {
    throw new TypeError("Explicit card provenance is required");
  }
  const match = model.matches.find((item) => item.key === matchKey);
  if (!match) throw new RangeError("Match does not belong to the selected tournament");
  const score = match.result.confirmed && match.result.known && match.result.score ? [...match.result.score] : null;
  let currentMap = null;
  if (match.currentMap != null) {
    const map = match.currentMap;
    if (match.status !== "live" || map.confirmed !== true || !hasText(map.name) ||
      !(map.number === null || (Number.isInteger(map.number) && map.number > 0)) ||
      !hasText(map.source) || !hasText(map.observedAt) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(map.observedAt) || !Number.isFinite(Date.parse(map.observedAt))) {
      throw new TypeError("Current map requires explicit live evidence");
    }
    currentMap = { name: map.name, number: map.number, source: map.source, observedAt: map.observedAt };
  }
  const teams = [1, 2].map((side) => {
    const participant = model.participants.find((item) => item.teamId === match[`team${side}Id`]);
    return { id: match[`team${side}Id`], name: match[`team${side}`], logoUrl: publicAsset(participant?.logoUrl) };
  });
  return {
    schemaVersion: 1, matchKey: match.key,
    provenance: { kind: provenance.kind, revision: provenance.revision, source: provenance.source },
    brand: { name: model.project.brandName, logoUrl: publicAsset(model.project.logoUrl) },
    tournament: { slug: model.tournament.slug, title: model.tournament.title, discipline: model.tournament.discipline },
    teams, bestOf: match.bestOf, status: match.status, statusLabel: matchStatusLabel(match, copy),
    confirmed: match.result.confirmed, score, scoreLabel: match.result.label,
    scoreText: score ? score.join(":") : match.result.confirmed ? copy.unknownScore : copy.noConfirmedScore,
    technical: match.result.technical, currentMap, dateText: match.dateDisplay || copy.datePending,
    actions: [
      ...[["draft", "Драфт"], ["statistics", "Статистика"], ["analysis", "AI-анализ"]].map(([id, label]) =>
        ({ id, label, kind: "demo", notice: `${label}: демонстрация. Функция ещё не подключена.` })),
      { id: "matches", label: "Все матчи", kind: "url", url: PUBLIC_ORIGIN + serializeMiniAppRoute(tournamentRoute("matches", model.tournament.slug)) },
    ],
  };
}

export function cardFacts(card) {
  return [
    card.provenance.kind === "demo" ? "ДЕМОНСТРАЦИЯ · ТЕСТОВЫЕ ДАННЫЕ" : "ОПУБЛИКОВАННЫЙ МАТЧ",
    card.brand.name,
    `${card.tournament.discipline} · ${card.tournament.title}`,
    card.teams.map((team) => team.name || "Соперник ещё не определён").join(" — "),
    `Формат: ${card.bestOf || "не опубликован"} · ${card.statusLabel}`,
    `${card.scoreLabel}: ${card.scoreText}`,
    ...(card.technical ? ["Технический результат — без сыгранных карт."] : []),
    `Дата: ${card.dateText}`,
    ...(card.currentMap ? [`Текущая карта: ${card.currentMap.number === null ? "" : `${card.currentMap.number} · `}${card.currentMap.name}`, `Снимок состояния: ${card.currentMap.observedAt} · ${card.currentMap.source}`] : []),
    ...card.actions.filter((action) => action.kind === "demo").map((action) => action.notice),
  ];
}
