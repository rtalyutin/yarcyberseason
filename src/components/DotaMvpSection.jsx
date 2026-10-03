import { Fragment, useMemo, useState } from "react";
import { CaretDown, ArrowUpRight } from "@phosphor-icons/react";
import { useDotaMvp } from "../lib/dota-mvp-client.js";
import { formatMvpScore, mvpContributions, topMvpPlayers } from "../lib/dota-mvp.js";
import "./DotaMvpSection.css";

const metrics = [
  ["K", "Убийства"], ["A", "Ассисты"], ["L", "Смерти"],
  ["D", "Урон героям"], ["T", "Урон строениям"], ["H", "Лечение союзников"],
  ["C", "Контроль, с"], ["V", "Observer wards"], ["S", "Стаки лагерей"],
];
const contributionLabels = [
  ["combat", "(K + A − L) / 3"], ["damage", "(D + T) / 1500"], ["healing", "H / 500"],
  ["control", "C / 15"], ["wards", "V / 2"], ["stacks", "S / 6"],
];
const reasonLabels = {
  awaiting_parse: "Реплей ожидает разбора.", missing_replay: "Реплей пока недоступен.",
  missing_metrics: "Ожидаются необходимые показатели.", unidentifiable_player: "Не удалось определить игрока.",
  "Replay not yet parsed": "Реплей ожидает разбора.",
};
const safeReason = (reason) => reasonLabels[reason] || (typeof reason === "string" && /[а-яё]/i.test(reason) ? reason : "Недостаточно подтверждённых данных для расчёта.");
const numberText = (number) => typeof number === "string" ? number.replace(".", ",") : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(number);
const scoreText = (exact) => exact ? formatMvpScore(exact).replace(".", ",") : "—";
const updateText = (date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }).format(new Date(date));

function teamName(player, teamId, tournament) {
  const index = player.teamIds?.indexOf(teamId) ?? -1;
  return index >= 0 && player.teamNames?.[index] || tournament.participants?.find((team) => team.teamId === teamId)?.displayName || "Команда не сопоставлена";
}

function PlayerMaps({ player, tournament, correctionPendingMatchIds = [] }) {
  if (!player.records?.length) return <p className="dota-mvp-record-empty">Учитываемых карт пока нет. Отсутствие оценки не равно нулю.</p>;
  return <ol className="dota-mvp-map-list" aria-label={`Карты игрока ${player.nickname}`}>
    {player.records.map((record) => {
      const contributions = mvpContributions(record.metrics);
      return <li className="dota-mvp-map" key={record.matchId}>
        <div className="dota-mvp-map-heading"><a href={`https://www.opendota.com/matches/${record.matchId}`} target="_blank" rel="noopener noreferrer">Карта {record.matchId}<ArrowUpRight aria-hidden="true" /></a><span>{teamName(player, record.teamId, tournament)}</span><strong>M = {scoreText(record.scoreExact)}</strong></div>
        {correctionPendingMatchIds.includes(record.matchId) && <p className="dota-mvp-map-review">Данные этой карты перепроверяются. Показан предыдущий подтверждённый расчёт.</p>}
        <dl className="dota-mvp-metrics">{metrics.map(([key, label]) => <div key={key}><dt><b>{key}</b> {label}</dt><dd>{numberText(record.metrics[key])}</dd></div>)}</dl>
        <p className="dota-mvp-contribution-label">Вклад в M</p>
        <dl className="dota-mvp-contributions">{contributionLabels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{scoreText(contributions[key])}</dd></div>)}</dl>
      </li>;
    })}
  </ol>;
}

function PlayerRow({ player, tournament, expanded, onToggle, correctionPendingMatchIds }) {
  const detailId = `mvp-player-${tournament.id}-${player.accountId}`;
  return <Fragment>
    <tr className={`dota-mvp-player${player.rank === 1 ? " dota-mvp-player--leader" : ""}`}>
      <td className="dota-mvp-rank">{player.countedMaps > 0 ? player.rank : "—"}</td>
      <th scope="row" className="dota-mvp-name"><button type="button" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}><span>{player.nickname}</span><CaretDown aria-hidden="true" /></button></th>
      <td className="dota-mvp-teams">{player.teamNames?.length ? player.teamNames.join(" / ") : "Команда не сопоставлена"}</td>
      <td className="dota-mvp-count" data-label="Карт в расчёте">{player.countedMaps}{player.playedMaps > player.countedMaps && <small> / {player.playedMaps} сыграно</small>}</td>
      <td className="dota-mvp-score" data-label="Рейтинг">{player.countedMaps > 0 ? scoreText(player.ratingExact) : "—"}</td>
    </tr>
    {expanded && <tr className="dota-mvp-detail"><td colSpan={5}><div id={detailId} className="dota-mvp-detail-inner"><p className="dota-mvp-player-source">Steam ID: {player.steamId || "не опубликован"} · Рейтинг = сумма M по учитываемым картам.</p><PlayerMaps player={player} tournament={tournament} correctionPendingMatchIds={correctionPendingMatchIds} /></div></td></tr>}
  </Fragment>;
}

export function DotaMvpPanel({ tournament, snapshot, availability = "current" }) {
  const [mode, setMode] = useState("top");
  const [expanded, setExpanded] = useState(new Set());
  const allPlayers = snapshot?.players || [];
  const players = useMemo(() => mode === "top" ? topMvpPlayers(allPlayers, 20) : allPlayers, [allPlayers, mode]);
  const maps = Object.entries(snapshot?.maps || {});
  const ready = maps.filter(([, map]) => map.status === "ready");
  const pending = maps.filter(([, map]) => map.status === "pending");
  const excluded = maps.filter(([, map]) => map.status === "excluded");
  const ingestionPending = snapshot?.ingestionPendingMatchIds?.length || 0;
  const correctionPending = snapshot?.correctionPendingMatchIds?.length || 0;
  const preliminary = snapshot?.coverageComplete === false || pending.length > 0 || ingestionPending > 0 || correctionPending > 0;
  const leaders = allPlayers.filter((player) => player.countedMaps > 0 && player.rank === 1);
  const toggle = (accountId) => setExpanded((current) => { const next = new Set(current); if (next.has(accountId)) next.delete(accountId); else next.add(accountId); return next; });
  return <section className="dota-mvp" aria-labelledby="dota-mvp-title">
    <header className="dota-mvp-heading"><p className="dota-mvp-eyebrow">Статистика по картам</p><h2 id="dota-mvp-title">MVP турнира</h2><p className="dota-mvp-intro">Не веришь баллу? Разбери его по картам.</p></header>
    {snapshot?.retrospective && <p className="dota-mvp-provenance">{snapshot.sourceNote || "Проверочный пересчёт по формуле §9.4 осеннего регламента 2026; не официальное награждение прошлого турнира."} В расчёте {ready.length} из {maps.length} карт.</p>}
    {snapshot && <div className="dota-mvp-ledger">
      <div className="dota-mvp-lead"><span>{leaders.length > 1 ? "Равенство первого места" : preliminary ? "Предварительный лидер расчёта" : "Лидер расчёта"}</span><strong>{leaders.length ? leaders.map((player) => player.nickname).join(" / ") : "Ещё не определён"}</strong>{leaders.length > 0 && <b>{scoreText(leaders[0].ratingExact)} <small>балла</small></b>}</div>
      <dl className="dota-mvp-coverage"><div><dt>Карт в расчёте</dt><dd>{ready.length}</dd></div><div><dt>Ожидают данных</dt><dd>{pending.length}</dd></div><div><dt>Исключены</dt><dd>{excluded.length}</dd></div></dl>
    </div>}
    {snapshot?.coverageComplete === false && <p className="dota-mvp-caveat">Учтены доступные карты. Полнота данных турнира ещё не подтверждена.</p>}
    {ingestionPending > 0 && <p className="dota-mvp-caveat">Ожидаются данные API ещё для {ingestionPending} карт лиги; принадлежность турниру уточняется. Они не входят в число сыгранных или учитываемых карт турнира.</p>}
    {correctionPending > 0 && <p className="dota-mvp-caveat">Перепроверяются данные {correctionPending} ранее учтённых карт; показан предыдущий подтверждённый расчёт.</p>}
    {leaders.length > 1 && <p className="dota-mvp-caveat">При точном равенстве максимума сайт не назначает победителя. В регламенте предусмотрена дуэль.</p>}
    <div className="dota-mvp-toolbar"><div className="dota-mvp-tabs" role="group" aria-label="Список игроков"><button type="button" aria-pressed={mode === "top"} onClick={() => setMode("top")}>Топ-20</button><button type="button" aria-pressed={mode === "all"} onClick={() => setMode("all")}>Все игроки{snapshot && <span>{allPlayers.length}</span>}</button></div>{snapshot && <span className="dota-mvp-updated">Обновлено {updateText(snapshot.updatedAt)} МСК</span>}</div>
    {snapshot && availability === "bundled" && <p className="dota-mvp-saved">Показан сохранённый проверочный расчёт на дату обновления.</p>}
    {snapshot && ["unavailable", "stale"].includes(availability) && <p className="dota-mvp-delay" role="status">Обновление задерживается. Показан последний подтверждённый расчёт.</p>}
    {players.length > 0 ? <>
      <p className="dota-mvp-table-note">{mode === "top" ? `Показано: ${players.length}. При равенстве на границе топ-20 включены все игроки.` : `Показано: ${players.length}. «—» означает, что учитываемых карт пока нет.`} Рейтинг — сумма баллов, без деления на число карт.</p>
      <table className="dota-mvp-table"><caption className="dota-mvp-sr-only">Рейтинг игроков турнира. Нажмите ник, чтобы проверить расчёт.</caption><thead><tr><th scope="col">Место</th><th scope="col">Игрок · открыть расчёт</th><th scope="col">Команда / команды</th><th scope="col">Карт в расчёте</th><th scope="col">Рейтинг</th></tr></thead><tbody>{players.map((player) => <PlayerRow key={player.accountId} player={player} tournament={tournament} expanded={expanded.has(player.accountId)} onToggle={() => toggle(player.accountId)} correctionPendingMatchIds={snapshot.correctionPendingMatchIds} />)}</tbody></table>
    </> : <div className="dota-mvp-empty" role="status"><strong>{availability === "loading" && !snapshot ? "Получаем статистику…" : pending.length ? "Карты сыграны. Ждём статистику." : "Рейтинг ещё не рассчитан"}</strong><p>{availability === "loading" && !snapshot ? "Проверяем опубликованный расчёт турнира." : pending.length ? "Баллы появятся после получения всех необходимых показателей. Пропуски не заменяются нулями." : "Здесь появятся игроки и баллы после публикации расчёта по сыгранным картам."}</p></div>}
    {(pending.length > 0 || excluded.length > 0) && <details className="dota-mvp-map-statuses"><summary>Какие карты ещё не учтены · {pending.length + excluded.length}</summary><ul>{[...pending, ...excluded].map(([matchId, map]) => <li key={matchId}><a href={`https://www.opendota.com/matches/${matchId}`} target="_blank" rel="noopener noreferrer">Карта {matchId}<ArrowUpRight aria-hidden="true" /></a><span>{map.status === "excluded" ? "Исключена для всех игроков" : "Ожидает данных"}{safeReason(map.reason) && ` · ${safeReason(map.reason)}`}</span></li>)}</ul></details>}
    <details className="dota-mvp-formula"><summary>Как считаются баллы</summary><p className="dota-mvp-equation">M = (K + A − L) / 3 + (D + T) / 1500 + H / 500 + C / 15 + V / 2 + S / 6</p><dl>{metrics.map(([key, label]) => <div key={key}><dt>{key}</dt><dd>{label}</dd></div>)}</dl><p>D — урон пяти реальным вражеским героям. T — урон вражеским строениям. H — лечение четырёх союзных героев, без себя. V — подтверждённые уничтожения вражеских observer wards.</p><p>Отрицательные баллы сохраняются. Округление — только при отображении; места и равенство определяются по точным значениям. Если показатели карты невозможно восстановить, карта исключается из MVP для всех десяти игроков.</p></details>
  </section>;
}

export function DotaMvpSection({ tournament }) {
  const state = useDotaMvp(tournament);
  return <DotaMvpPanel tournament={tournament} {...state} />;
}
