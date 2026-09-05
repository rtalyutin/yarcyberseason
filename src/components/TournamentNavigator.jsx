import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, MagnifyingGlass, Trophy, Users, X } from "@phosphor-icons/react";
import { displayMatchDate, filterTournamentMatches, getTournamentModel, hasScore, isArchive, isFinished, matchLabel, isPlayoffStage, resolveTournamentView, resultLabel } from "../lib/tournament.js";
import "../tournament.css";

function MatchRow({ match }) {
  const scored = hasScore(match);
  const finished = isFinished(match);
  const winner = finished ? (scored && match.score1 !== match.score2 ? (match.score1 > match.score2 ? match.team1 : match.team2) : match.winner) : null;
  const date = displayMatchDate(match);
  const status = match.status === "walkover" ? "Техническая победа" : match.status === "bye" ? "Проход без игры" : !finished ? "Матч назначен" : null;
  const metadata = [date, match.time && !date.includes(match.time) ? match.time : null, match.roundTitle, match.bestOf, status].filter(Boolean);
  const details = Boolean(match.note || match.maps?.length || match.faceitUrl || match.roundRecord);
  return (
    <article className={`tn-match${!finished ? " tn-match--scheduled" : ""}`} data-match-id={match.id || match.key}>
      <p className="tn-match-meta">{metadata.join(" · ")}</p>
      <div className="tn-scoreboard">
        <strong className={`tn-team${!winner || winner === match.team1 ? " is-winner" : ""}`}>{match.team1 || "Соперник определяется"}</strong>
        <span className="tn-score" aria-label={scored ? `Счёт ${match.score1}:${match.score2}` : "Счёт пока не опубликован"}>{scored ? `${match.score1} : ${match.score2}` : "— : —"}</span>
        <strong className={`tn-team tn-team--second${!winner || winner === match.team2 ? " is-winner" : ""}`}>{match.team2 || "Соперник определяется"}</strong>
      </div>
      {details && <details className="tn-match-details">
        <summary>Подробности матча</summary>
        {match.maps?.length > 0 && <ul>{match.maps.map((map, index) => <li key={`${map.name}-${index}`}><span>{map.name}</span><b>{Number.isFinite(map.score1) && Number.isFinite(map.score2) ? `${map.score1}:${map.score2}` : "Не сыграна"}</b></li>)}</ul>}
        {match.note && <p>{match.note}</p>}
        {match.roundRecord && !match.note && <p>Раунды: {match.roundRecord}</p>}
        {match.faceitUrl && <a href={match.faceitUrl} target="_blank" rel="noreferrer">Результат FACEIT <ArrowUpRight aria-hidden="true" /></a>}
      </details>}
    </article>
  );
}

function MatchList({ model, view, changeView, fixedStage }) {
  const [visibleCount, setVisibleCount] = useState(5);
  const phase = fixedStage?.id || view.phase;
  const matches = useMemo(() => filterTournamentMatches(model.matches, phase, view.query), [model, phase, view.query]);
  useEffect(() => setVisibleCount(5), [phase, view.query]);
  const shown = matches.slice(0, visibleCount);
  const complete = matches.every(isFinished);
  const subsetTitle = phase === "playoffs" ? "плей-офф" : phase === "before-playoffs" ? "до плей-офф" : "";
  const notes = fixedStage ? [fixedStage.notice] : phase === "playoffs" ? model.stages.filter(isPlayoffStage).map((stage) => stage.notice) : model.stages.filter((stage) => stage.id === phase).map((stage) => stage.notice);
  return (
    <section className="tn-matches" aria-labelledby="tn-matches-title">
      <div className="tn-panel-heading">
        <div><h2 id="tn-matches-title">{fixedStage?.title || "Матчи"}</h2><span>{complete ? resultLabel(fixedStage ? matches.length : model.finishedCount) : matchLabel(fixedStage ? matches.length : model.matches.length)}</span></div>
        <label className="tn-search"><MagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Найти команду" placeholder="Найти команду" value={view.query} onChange={(event) => changeView({ query: event.target.value }, false)} />{view.query && <button type="button" aria-label="Очистить поиск" onClick={() => changeView({ query: "" }, false)}><X aria-hidden="true" /></button>}</label>
      </div>
      {!fixedStage && <nav className="tn-filters" aria-label="Фильтр матчей по этапу">{model.filters.map((filter) => <button type="button" key={filter.id} aria-pressed={view.phase === filter.id} onClick={() => changeView({ phase: filter.id })}>{filter.title} <span>{filter.count}</span></button>)}</nav>}
      <p className="tn-list-summary" role="status">{view.query ? `Найдено: ${matchLabel(matches.length)}. Показано: ${shown.length}.` : `Показаны ${complete ? "последние " : ""}${shown.length} из ${matches.length} матчей${subsetTitle ? ` ${subsetTitle}` : ""}.`}</p>
      <div className="tn-match-list">{shown.map((match) => <MatchRow key={match.key} match={match} />)}</div>
      {!shown.length && <div className="tn-empty"><h3>{view.query ? "Команда не найдена" : "Матчи ещё не опубликованы"}</h3><p>{view.query ? "Проверьте название команды или выберите другой этап." : "Пары и результаты появятся после публикации организатором."}</p>{view.query && <button className="tn-outline" type="button" onClick={() => changeView({ query: "", phase: "all" })}>Сбросить поиск и фильтр</button>}</div>}
      <div className="tn-list-footer">{matches.length > visibleCount && <button className="tn-outline" type="button" onClick={() => setVisibleCount(matches.length)}>Показать ещё {matchLabel(matches.length - visibleCount)}</button>}{notes.filter(Boolean).map((note) => <p key={note}>{note}</p>)}</div>
    </section>
  );
}

export function TournamentNavigator({ tournament, navigate, renderStage, renderRewards }) {
  const model = useMemo(() => getTournamentModel(tournament), [tournament]);
  const readView = () => resolveTournamentView(model, window.location.search, window.location.hash);
  const [view, setView] = useState(readView);
  useEffect(() => {
    const sync = () => setView(readView());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, [model]);
  useEffect(() => { document.title = `${tournament.title} — YAR CYBER SEASON`; }, [tournament.title]);
  const changeView = (patch, push = true) => {
    const next = { ...view, ...patch };
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set("section", next.section);
    url.searchParams.set("phase", next.phase);
    if (next.query) url.searchParams.set("q", next.query); else url.searchParams.delete("q");
    window.history[push ? "pushState" : "replaceState"]({}, "", `${url.pathname}${url.search}`);
    setView(next);
  };
  const go = (target) => {
    if (target.startsWith("#")) {
      const next = resolveTournamentView(model, "", target);
      changeView(next);
    } else navigate(target);
  };
  const active = model.sections.find((section) => section.id === view.section);
  const archived = isArchive(tournament);
  const sourceFacts = (tournament.facts || []).filter((fact) => !/подтвержд[её]нн.*матч/i.test(fact));
  return (
    <main className="tn-page">
      <header className="tn-heading">
        <nav className="tn-breadcrumb" aria-label="Путь к турниру"><button type="button" onClick={() => navigate("/")}>Турниры</button><span>/</span>{archived ? <button type="button" onClick={() => navigate("/results")}>Архив</button> : <span>{tournament.discipline}</span>}</nav>
        <div className="tn-title-row"><h1>{tournament.title}</h1><span className={`tn-status tn-status--${tournament.status}`}>{tournament.statusLabel}</span></div>
        {tournament.dates?.display && <p className="tn-date">{tournament.dates.display}</p>}
        {!archived && <div className="tn-header-actions">{[tournament.primaryAction, tournament.secondaryAction, ...(tournament.matchday ? [{ label: "Matchday", target: tournament.matchday.route }] : [])].filter(Boolean).map((action) => /^(https?:|mailto:|tel:)/.test(action.target) ? <a className="tn-outline" href={action.target} key={action.target}>{action.label}<ArrowUpRight aria-hidden="true" /></a> : <button type="button" className="tn-outline" key={action.target} onClick={() => go(action.target)}>{action.label}</button>)}</div>}
      </header>
      <div className="tn-layout">
        <aside className="tn-sidebar">
          <p className="tn-eyebrow">Разделы турнира</p>
          <nav className="tn-section-nav" aria-label="Разделы турнира">{model.sections.map((section) => <button type="button" key={section.id} aria-current={section.id === view.section ? "page" : undefined} onClick={() => changeView({ section: section.id })}>{section.title}{section.count !== undefined && <span>{section.count}</span>}</button>)}</nav>
          <div className="tn-facts">{sourceFacts.map((fact) => <p key={fact}>{/команд/i.test(fact) ? <Users aria-hidden="true" /> : <Trophy aria-hidden="true" />}<span>{fact}</span></p>)}</div>
          {model.finishedCount > 0 && <p className="tn-archive-count">{archived ? "В архиве сохранены" : "Подтверждено"}<br />{resultLabel(model.finishedCount)}.</p>}
          <button className="tn-back" type="button" onClick={() => navigate(archived ? "/results" : "/")}><ArrowLeft aria-hidden="true" />Все турниры</button>
        </aside>
        <div className="tn-content" key={active?.id}>
          {active?.id === "matches" ? <MatchList model={model} view={view} changeView={changeView} /> : active?.id === "info" ? <section className="tn-info" id="info"><h2>О турнире</h2>{tournament.season && <p className="tn-season">{tournament.season}</p>}{tournament.summary && <p>{tournament.summary}</p>}{tournament.timeline?.length > 0 && <dl className="tn-timeline">{tournament.timeline.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.date}</dd></div>)}</dl>}{model.stages.some((stage) => stage.rules?.length || stage.notice) && <div className="tn-format" id="format"><h3>Формат турнира</h3>{model.stages.filter((stage) => stage.rules?.length || stage.notice).map((stage) => <div key={stage.id}><h4>{stage.title}</h4>{stage.notice && <p>{stage.notice}</p>}{stage.rules?.length > 0 && <ul>{stage.rules.map((rule, index) => <li key={index}>{typeof rule === "string" ? rule : <><strong>{rule.label}: </strong>{rule.value}</>}</li>)}</ul>}</div>)}</div>}{renderRewards()}{tournament.support && <p>{tournament.support}</p>}{tournament.sourceNote && <p className="tn-source-note">{tournament.sourceNote}</p>}</section> : active?.stage?.type === "historical_matches" ? <MatchList model={model} view={view} changeView={changeView} fixedStage={active.stage} /> : active?.stage ? renderStage(active.stage, String(model.stages.indexOf(active.stage) + 1).padStart(2, "0")) : <p>Информация о турнире появится после публикации.</p>}
        </div>
      </div>
    </main>
  );
}
