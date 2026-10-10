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
  ["combat", "Бой", "(K + A − L) / 3"], ["damage", "Урон", "(D + T) / 1500"],
  ["healing", "Лечение", "H / 500"], ["control", "Контроль", "C / 15"],
  ["wards", "Варды", "V / 2"], ["stacks", "Стаки", "S / 6"],
];
const reasonLabels = {
  awaiting_parse: "Реплей ожидает разбора.", missing_replay: "Реплей пока недоступен.",
  missing_metrics: "Ожидаются необходимые показатели.", unidentifiable_player: "Не удалось определить игрока.",
  "Replay not yet parsed": "Реплей ожидает разбора.",
  "Confirmed played map identities unavailable": "Ожидается подтверждение аккаунтов участников карты.",
  "No complete real tournament statistics for estimation": "Ожидается реальное среднее турнира для расчётной замены.",
};
const safeReason = (reason) => reasonLabels[reason] || (typeof reason === "string" && /[а-яё]/i.test(reason) ? reason : "Недостаточно подтверждённых данных для расчёта.");
const numberText = (number) => typeof number === "string" ? number.replace(".", ",") : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(number);
const scoreText = (exact) => exact ? formatMvpScore(exact).replace(".", ",") : "—";
const updateText = (date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }).format(new Date(date));

function teamName(player, teamId, tournament) {
  const index = player.teamIds?.indexOf(teamId) ?? -1;
  return index >= 0 && player.teamNames?.[index] || tournament.participants?.find((team) => team.teamId === teamId)?.displayName || "Команда не сопоставлена";
}

function Formula({ mapContributions, mapTeam }) {
  return <details className="dota-mvp-formula">
    <summary>Формула регламента</summary>
    <p className="dota-mvp-equation">M = (K + A − L) / 3 + (D + T) / 1500 + H / 500 + C / 15 + V / 2 + S / 6</p>
    {mapContributions && <dl className="dota-mvp-formula-contributions">{contributionLabels.map(([key, label, formula]) => <div key={key}><dt>{label} · {formula}</dt><dd>{scoreText(mapContributions[key])}</dd></div>)}</dl>}
    <dl className="dota-mvp-formula-metrics">{metrics.map(([key, label]) => <div key={key}><dt>{key}</dt><dd>{label}</dd></div>)}</dl>
    <p>D — урон пяти реальным вражеским героям. T — урон вражеским строениям. H — лечение четырёх союзных героев, без себя. V — подтверждённые уничтожения вражеских observer wards.</p>
    <p>Отрицательные баллы сохраняются. Округление — только при отображении; места и равенство определяются по точным значениям.</p>
    <p>Если у сыгранной карты нет полной статистики, каждому подтверждённому участнику начисляется средний реальный балл за игрока и карту этого турнира: победителям +15%, проигравшим −15%. В среднем учитываются только карты с полной реальной статистикой. Расчётные замены не входят в среднее и пересчитываются при новых данных; восстановленная статистика заменяет оценку. Без реального среднего или подтверждённых участников начисление ожидает данных. Техническая победа без игры не даёт MVP.</p>
    {mapTeam && <p>Команда на этой карте: {mapTeam}</p>}
  </details>;
}

function MapCalculation({ record, player, tournament, initiallyOpen = false, correctionPendingMatchIds, children }) {
  const estimated = Boolean(record.estimation);
  const contributions = estimated ? null : mvpContributions(record.metrics);
  const [open, setOpen] = useState(initiallyOpen);
  const detailId = `mvp-map-${tournament.id}-${player.accountId}-${record.matchId}`;
  return <li className="dota-mvp-map">
    <div className="dota-mvp-map-heading">
      <button type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((current) => !current)}><span>Карта <b>{record.matchId}</b></span><CaretDown aria-hidden="true" /></button>
      <strong>{scoreText(record.scoreExact)} <span>{estimated ? "расчётных балла за эту карту" : "балла за эту карту"}</span></strong>
      <a href={`https://www.opendota.com/matches/${record.matchId}`} target="_blank" rel="noopener noreferrer">OpenDota<ArrowUpRight aria-hidden="true" /></a>
    </div>
    {open && <div id={detailId} className="dota-mvp-map-calculation">
      {correctionPendingMatchIds.includes(record.matchId) && <p className="dota-mvp-map-review">Данные этой карты перепроверяются. Показан предыдущий подтверждённый расчёт.</p>}
      {estimated ? <p className="dota-mvp-map-review">Расчётная замена: средний реальный балл турнира × {record.estimation.factorExact.numerator === "23" ? "1,15 (победа)" : "0,85 (поражение)"}. Пересчитывается при новых реальных данных. Исходные показатели этой карты недоступны.</p> : <>
      <dl className="dota-mvp-contributions" aria-label="Вклады в балл карты">{contributionLabels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{scoreText(contributions[key])}</dd></div>)}</dl>
      <p className="dota-mvp-metrics-label">Исходные показатели</p>
      <dl className="dota-mvp-metrics">{metrics.map(([key, label]) => <div key={key}><dt title={label}><span aria-hidden="true">{key}</span><span className="dota-mvp-sr-only">{key} · {label}</span></dt><dd>{numberText(record.metrics[key])}</dd></div>)}</dl>
      </>}
    </div>}
    {(open || children) && <div className="dota-mvp-map-footers">{open && <Formula mapContributions={contributions} mapTeam={teamName(player, record.teamId, tournament)} />}{children}</div>}
  </li>;
}

function PlayerMaps({ player, tournament, correctionPendingMatchIds = [] }) {
  if (!player.records?.length) return <p className="dota-mvp-record-empty">Учитываемых карт пока нет. Отсутствие оценки не равно нулю.</p>;
  const [first, ...otherRecords] = player.records;
  return <>
    <ol className="dota-mvp-map-list" aria-label={`Расчёт игрока ${player.nickname}`}><MapCalculation key={first.matchId} record={first} player={player} tournament={tournament} initiallyOpen correctionPendingMatchIds={correctionPendingMatchIds}>
      <details className="dota-mvp-other-maps"><summary>{otherRecords.length ? "Другие карты и источники" : "Источники игрока"}</summary><p className="dota-mvp-player-source">Steam ID: {player.steamId || "не опубликован"} · Рейтинг = сумма M.</p>{otherRecords.length > 0 && <ol className="dota-mvp-map-list">{otherRecords.map((record) => <MapCalculation key={record.matchId} record={record} player={player} tournament={tournament} correctionPendingMatchIds={correctionPendingMatchIds} />)}</ol>}</details>
    </MapCalculation></ol>
  </>;
}

function PlayerRow({ player, tournament, expanded, onToggle, correctionPendingMatchIds }) {
  const detailId = `mvp-player-${tournament.id}-${player.accountId}`;
  return <Fragment>
    <tr className={`dota-mvp-player${player.rank === 1 ? " dota-mvp-player--leader" : ""}${expanded ? " dota-mvp-player--expanded" : ""}`}>
      <td className="dota-mvp-rank">{player.countedMaps > 0 ? player.rank : "—"}</td>
      <th scope="row" className="dota-mvp-name"><button type="button" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}><span>{player.nickname}</span><CaretDown aria-hidden="true" /></button></th>
      <td className="dota-mvp-teams">{player.teamNames?.length ? player.teamNames.join(" / ") : "Команда не сопоставлена"}</td>
      <td className="dota-mvp-score" data-label="Баллы">{player.countedMaps > 0 ? scoreText(player.ratingExact) : "—"}</td>
    </tr>
    {expanded && <tr className="dota-mvp-detail"><td colSpan={4}><div id={detailId} className="dota-mvp-detail-inner"><PlayerMaps player={player} tournament={tournament} correctionPendingMatchIds={correctionPendingMatchIds} /></div></td></tr>}
  </Fragment>;
}

export function DotaMvpPanel({ tournament, snapshot, availability = "current" }) {
  const [mode, setMode] = useState("top");
  // A user's disclosure choice takes precedence over refreshed calculations.
  const [disclosures, setDisclosures] = useState({ tournamentId: tournament.id, accounts: null });
  const allPlayers = snapshot?.players || [];
  const players = useMemo(() => mode === "top" ? topMvpPlayers(allPlayers, 20) : allPlayers, [allPlayers, mode]);
  const maps = Object.entries(snapshot?.maps || {});
  const pending = maps.filter(([, map]) => map.status === "pending");
  const excluded = maps.filter(([, map]) => map.status === "excluded");
  const ingestionPending = Boolean(snapshot?.ingestionPendingMatchIds?.length || snapshot?.discoveryPending);
  const correctionPending = Boolean(snapshot?.correctionPendingMatchIds?.length);
  const estimated = maps.some(([, map]) => map.status === "estimated");
  const preliminary = snapshot?.coverageComplete === false || pending.length > 0 || ingestionPending || correctionPending || estimated;
  const leaders = allPlayers.filter((player) => player.countedMaps > 0 && player.rank === 1);
  const leaderTeams = [...new Set(leaders.flatMap((player) => player.teamNames || []))];
  const defaultAccounts = new Set(allPlayers[0] ? [allPlayers[0].accountId] : []);
  const expanded = disclosures.tournamentId === tournament.id && disclosures.accounts !== null ? disclosures.accounts : defaultAccounts;
  const toggle = (accountId) => setDisclosures((current) => {
    const next = new Set(current.tournamentId === tournament.id && current.accounts !== null ? current.accounts : defaultAccounts);
    if (next.has(accountId)) next.delete(accountId); else next.add(accountId);
    return { tournamentId: tournament.id, accounts: next };
  });
  const headingNote = snapshot?.retrospective
    ? `Проверочный пересчёт${preliminary ? " · данные турнира ещё уточняются" : ""}`
    : preliminary ? "Предварительный расчёт · данные турнира ещё уточняются" : "Расчёт по опубликованной статистике турнира";
  return <section className="dota-mvp" aria-labelledby="dota-mvp-title">
    <header className="dota-mvp-heading"><h2 id="dota-mvp-title">MVP турнира</h2><p className="dota-mvp-intro">{snapshot ? headingNote : "Рейтинг по статистике сыгранных карт"}</p></header>
    <div className="dota-mvp-composition">
      <aside className="dota-mvp-identity" aria-label="Лидер расчёта">
        <p className="dota-mvp-identity-label">{leaders.length > 1 ? "Равенство первого места" : "Лидер расчёта"}</p>
        <h3 className={leaders.length ? undefined : "dota-mvp-identity-empty"}>{leaders.length ? leaders.map((player) => player.nickname).join(" / ") : "Пока нет лидера"}</h3>
        {leaders.length > 0 && <><p className="dota-mvp-identity-teams">{leaderTeams.length ? leaderTeams.join(" / ") : "Команда не сопоставлена"}</p><p className="dota-mvp-total"><strong>{scoreText(leaders[0].ratingExact)}</strong><span>баллов за турнир</span></p><div className="dota-mvp-identity-art" aria-hidden="true" /></>}
      </aside>
      <div className="dota-mvp-ranking">
        <div className="dota-mvp-toolbar"><div className="dota-mvp-tabs" role="group" aria-label="Список игроков"><button type="button" aria-pressed={mode === "top"} onClick={() => setMode("top")}>Топ-20</button><button type="button" aria-pressed={mode === "all"} onClick={() => setMode("all")}>Все игроки</button></div></div>
        {players.length > 0 ? <>
          <table className="dota-mvp-table"><caption className="dota-mvp-sr-only">Рейтинг игроков турнира. Нажмите ник, чтобы проверить расчёт.</caption><thead><tr><th scope="col">Место</th><th scope="col">Игрок</th><th scope="col">Команда</th><th scope="col">Баллы</th></tr></thead><tbody>{players.map((player) => <PlayerRow key={player.accountId} player={player} tournament={tournament} expanded={expanded.has(player.accountId)} onToggle={() => toggle(player.accountId)} correctionPendingMatchIds={snapshot.correctionPendingMatchIds} />)}</tbody></table>
          <p className="dota-mvp-table-note">{mode === "top" ? "При равенстве на границе топ-20 включены все игроки." : "«—» означает, что учитываемых карт пока нет."} Рейтинг — сумма баллов.</p>
        </> : <div className="dota-mvp-empty" role="status"><strong>{availability === "loading" && !snapshot ? "Получаем статистику…" : pending.length ? "Карты сыграны. Ждём данные для MVP." : "Рейтинг ещё не рассчитан"}</strong><p>{availability === "loading" && !snapshot ? "Проверяем опубликованный расчёт турнира." : pending.length ? "Для расчётной замены нужны реальное среднее турнира и подтверждённые участники карты. Пропуски не заменяются нулями." : "Здесь появятся игроки и баллы после публикации расчёта по сыгранным картам."}</p></div>}
        {snapshot && <p className="dota-mvp-updated">Обновлено {updateText(snapshot.updatedAt)} МСК</p>}
        {snapshot && availability === "bundled" && <p className="dota-mvp-saved">Показан сохранённый проверочный расчёт на дату обновления.</p>}
        {snapshot && ["unavailable", "stale"].includes(availability) && <p className="dota-mvp-delay" role="status">Обновление задерживается. Показан последний подтверждённый расчёт.</p>}
        {correctionPending && <p className="dota-mvp-delay" role="status">Ранее учтённые карты перепроверяются. Показан предыдущий подтверждённый расчёт.</p>}
        {leaders.length > 1 && <p className="dota-mvp-caveat">При точном равенстве максимума сайт не назначает победителя. В регламенте предусмотрена дуэль.</p>}
        {snapshot && <details className="dota-mvp-provenance"><summary>О расчёте и источниках</summary>
          {snapshot.retrospective && <p>Проверочный пересчёт по формуле §9.4 осеннего регламента от 14.09.2026. Предварительная привязка к архиву по опубликованным датам турнира{tournament.dates?.display ? `: ${tournament.dates.display}` : ": даты не опубликованы"}. Не является официальным награждением прошлого турнира.</p>}
          <p>Версия формулы: {snapshot.formulaVersion}.</p>
          {estimated && <p>Рейтинг включает расчётные замены: среднее реальных баллов турнира {scoreText(snapshot.estimation?.meanExact)}. Они отмечены в деталях карт и пересчитываются при обновлении статистики.</p>}
          {snapshot.coverageComplete === false && <p>Полнота данных турнира ещё не подтверждена.</p>}
          {ingestionPending && <p>Ожидаются данные API карт лиги; принадлежность турниру уточняется. Они не входят в расчёт турнира.</p>}
          {(pending.length > 0 || excluded.length > 0) && <ul className="dota-mvp-map-statuses">{[...pending, ...excluded].map(([matchId, map]) => <li key={matchId}><a href={`https://www.opendota.com/matches/${matchId}`} target="_blank" rel="noopener noreferrer">Карта {matchId}<ArrowUpRight aria-hidden="true" /></a><span>{map.status === "excluded" ? "Исключена для всех игроков" : "Ожидает данных"}{safeReason(map.reason) && ` · ${safeReason(map.reason)}`}</span></li>)}</ul>}
          <Formula />
        </details>}
      </div>
    </div>
  </section>;
}

export function DotaMvpSection({ tournament }) {
  const state = useDotaMvp(tournament);
  return <DotaMvpPanel tournament={tournament} {...state} />;
}
