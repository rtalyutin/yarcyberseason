import { useEffect, useMemo, useState } from "react";
import {
  archivedTournaments,
  currentTournament,
  getTournament,
  nextTournament,
} from "./data/tournaments/index.js";

const navItems = [
  { label: "Сейчас", href: "/tournaments/cs2-august-2026" },
  { label: "Следующий Dota 2", href: "/tournaments/dota2-autumn-2026" },
  { label: "Архив", href: "/results" },
  { label: "Трансляции", href: "/broadcasts" },
  { label: "Партнёры", href: "/partners" },
];

function useLocationPath() {
  const [path, setPath] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return [path, setPath];
}

function isExternal(target) {
  return /^(https?:|mailto:|tel:)/.test(target);
}

function getTournamentStatusState(tournament) {
  if (["completed", "archive"].includes(tournament.status)) return "closed";
  if (tournament.status === "registration_open") return "active";
  if (tournament.status === "upcoming") return "upcoming";
  return "active";
}

function getArchiveLabel(tournament) {
  return tournament.archiveLabel || "Турнирные данные";
}

function StatusDot({ state = "upcoming" }) {
  return <span className={`status-dot status-dot--${state}`} aria-hidden="true" />;
}

function StatusPill({ children, state = "active" }) {
  return (
    <span className={`status-pill status-pill--${state}`}>
      <StatusDot state={state} />
      {children}
    </span>
  );
}

function TeamIdentity({ tournament, team, align = "start", size = "default" }) {
  const logo = tournament?.teamLogos?.[team];

  return (
    <span className={`team-identity team-identity--${align} team-identity--${size}`}>
      {logo && <img src={logo} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/assets/teams/_default.svg"; }} />}
      <span>{team}</span>
    </span>
  );
}

function PageFrame({ children, navigate, path }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (href) => {
    setMenuOpen(false);
    navigate(href);
  };

  return (
    <div className="site-shell">
      <div className="site-background" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" type="button" onClick={() => go("/")} aria-label="YCS — на главную">
          <img src="/assets/ycs-logo.jpg" alt="ЯКС" />
          <span>YAR CYBER SEASON</span>
        </button>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <button
              key={item.href}
              type="button"
              className={path === item.href ? "nav-link is-active" : "nav-link"}
              onClick={() => go(item.href)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
          {menuOpen ? "Закрыть" : "Меню"}
        </button>
      </header>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Мобильная навигация">
          {navItems.map((item) => (
            <button key={item.href} type="button" onClick={() => go(item.href)}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => go("/about")}>О проекте</button>
        </nav>
      )}
      {children}
      <Footer navigate={navigate} />
    </div>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="footer">
      <div className="footer-rule" />
      <div className="footer-grid">
        <div>
          <p className="eyebrow">YAR CYBER SEASON</p>
          <p className="footer-copy">Открытые киберспортивные турниры Ярославля.</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => navigate("/about")}>О проекте</button>
          <button type="button" onClick={() => navigate("/partners")}>Партнёрам</button>
          <a href="mailto:info@ycs.bar">info@ycs.bar</a>
        </div>
        <p className="footer-meta">© 2026 YCS<br />16+</p>
      </div>
    </footer>
  );
}

function ActionButton({ action, variant = "primary", navigate }) {
  const target = action.target;
  const className = `button button--${variant}`;

  if (isExternal(target)) {
    return <a className={className} href={target}>{action.label}</a>;
  }

  return (
    <button className={className} type="button" onClick={() => navigate(target)}>
      {action.label}
    </button>
  );
}

function PageIntro({ eyebrow, title, body, action, navigate }) {
  return (
    <section className="page-intro container">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {body && <p className="intro-copy">{body}</p>}
      {action && <ActionButton action={action} navigate={navigate} variant="secondary" />}
    </section>
  );
}

function HomePage({ navigate }) {
  const archivePreview = archivedTournaments.slice(0, 3);
  const nextDate = nextTournament.homeDate || {
    days: nextTournament.dates.display,
    month: "",
    marker: `2026 / ${nextTournament.discipline}`,
  };

  return (
    <main>
      <section className="home-hero container">
        <div className="hero-main">
          <p className="eyebrow">Ярославль / киберспорт / сезон 2026</p>
          <h1 className="hero-title">YAR<br />CYBER<br /><span>SEASON</span></h1>
          <p className="hero-subtitle">Открытые турниры. Прямая конкуренция. Одна сезонная линия.</p>
        </div>
        <aside className="home-status-panel">
          <div className="panel-topline">
            <StatusPill state={getTournamentStatusState(currentTournament)}>{currentTournament.statusLabel}</StatusPill>
            <span className="panel-index">01 / 03</span>
          </div>
          <p className="panel-game">{currentTournament.discipline}</p>
          <h2>{currentTournament.title}</h2>
          <p className="panel-date">{currentTournament.dates.display}</p>
          <div className="panel-facts">
            {currentTournament.facts.map((fact) => <span key={fact}>{fact}</span>)}
          </div>
          <ActionButton action={{ label: "Открыть текущий турнир", target: `/tournaments/${currentTournament.slug}` }} navigate={navigate} />
        </aside>
      </section>

      <section className="container current-strip">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / Текущий статус</p>
            <h2>Играем прямо сейчас</h2>
          </div>
          <button className="text-link" type="button" onClick={() => navigate(`/tournaments/${currentTournament.slug}`)}>Этапы и таблицы</button>
        </div>
        <div className="status-grid">
          {currentTournament.timeline.map((item, index) => (
            <div className="timeline-card" key={item.label}>
              <p className="timeline-no">0{index + 1}</p>
              <StatusDot state={item.state} />
              <h3>{item.label}</h3>
              <p>{item.date}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container next-feature">
        <div className="next-feature-copy">
          <p className="eyebrow">02 / Следующий турнир</p>
          <h2>{nextTournament.discipline}<br /><span>{nextTournament.statusLabel}</span></h2>
          <p>{nextTournament.summary}</p>
          <ActionButton action={{ label: "Открыть анонс", target: `/tournaments/${nextTournament.slug}` }} navigate={navigate} />
        </div>
        <div className="next-feature-meta">
          <StatusPill state={getTournamentStatusState(nextTournament)}>{nextTournament.statusLabel}</StatusPill>
          <strong>{nextDate.days}<br />{nextDate.month}</strong>
          <span>{nextDate.marker}</span>
        </div>
      </section>

      <section className="container archive-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / Архив</p>
            <h2>Сохранённые результаты</h2>
          </div>
          <button className="text-link" type="button" onClick={() => navigate("/results")}>Весь архив</button>
        </div>
        <div className="archive-preview-list">
          {archivePreview.map((tournament, index) => (
            <button className="archive-row" key={tournament.slug} type="button" onClick={() => navigate(`/tournaments/${tournament.slug}`)}>
              <span className="archive-row-index">АРХИВ / {String(index + 1).padStart(2, "0")}</span>
              <span className="archive-row-title">{tournament.title}</span>
              <span className="archive-row-date">{tournament.dates.display}</span>
              <span className="archive-row-cta">Открыть</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function TournamentHero({ tournament, navigate }) {
  const state = getTournamentStatusState(tournament);
  return (
    <section className="tournament-hero container">
      <div className="tournament-hero-copy">
        <p className="eyebrow">Турнир / {tournament.discipline}</p>
        <StatusPill state={state}>{tournament.statusLabel}</StatusPill>
        <h1>{tournament.title}</h1>
        <p className="tournament-date">{tournament.dates.display}</p>
        <div className="hero-actions">
          <ActionButton action={tournament.primaryAction} navigate={navigate} />
          <ActionButton action={tournament.secondaryAction} navigate={navigate} variant="secondary" />
          {tournament.matchday && <ActionButton action={{ label: "Карточка для чата", target: tournament.matchday.route }} navigate={navigate} variant="secondary" />}
        </div>
        {tournament.sourceNote && <p className="source-note">{tournament.sourceNote}</p>}
      </div>
      <aside className="tournament-status-card" aria-label="Статус турнира">
        <div className="panel-topline">
          <p className="eyebrow">Путь турнира</p>
          <span className="panel-index">YCS</span>
        </div>
        <div className="tournament-timeline">
          {tournament.timeline?.length ? tournament.timeline.map((item, index) => (
            <div key={item.label} className="tournament-timeline-row">
              <div className="timeline-track"><StatusDot state={item.state} /></div>
              <div><p>0{index + 1} / {item.label}</p><strong>{item.date}</strong></div>
            </div>
          )) : <p className="timeline-empty">{tournament.status === "archive" ? "Опубликованные материалы и подтверждённые результаты сохранены в архиве." : "Турнир завершён. Результаты сохранены в архиве."}</p>}
        </div>
        <div className="tournament-status-footer">
          <span>{tournament.season}</span>
          <span>{tournament.discipline}</span>
        </div>
      </aside>
    </section>
  );
}

function InfoBand({ tournament }) {
  return (
    <section className="container info-band" id="schedule">
      <div className="info-band-heading">
        <p className="eyebrow">Параметры</p>
        <h2>Коротко о турнире</h2>
      </div>
      <div className="fact-grid">
        {(tournament.facts || ["Сохранённый архив", "Dota 2", "Групповой этап", "Плей-офф"]).map((fact, index) => (
          <div className="fact-card" key={fact}>
            <span>0{index + 1}</span><strong>{fact}</strong>
          </div>
        ))}
      </div>
      {tournament.support && <p className="support-line">{tournament.support}</p>}
    </section>
  );
}

function StageTitle({ number, title, description }) {
  return (
    <div className="stage-title">
      <p className="eyebrow">Этап / {number}</p>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function RoundRobinStage({ stage, number, tournament }) {
  const [groupId, setGroupId] = useState(stage.groups[0]?.id);
  const group = stage.groups.find((entry) => entry.id === groupId) || stage.groups[0];
  const rows = useMemo(() => [...(group?.rows || [])].sort((a, b) => a.position - b.position), [group]);
  const hasMapRecord = group?.rows?.some((row) => row.mapRecord) || false;
  const finalColumnLabel = stage.finalColumnLabel || "О";
  const recordColumnLabel = stage.recordColumnLabel || "Счёт";
  const thresholds = stage.outcomeThresholds;
  const getOutcomeClass = (row) => {
    if (thresholds?.losses === row.lost) return "is-three-losses";
    if (thresholds?.wins === row.won) return "is-three-wins";
    return "";
  };

  return (
    <section className="container tournament-stage" id={stage.id}>
      <StageTitle number={number} title={stage.title} description={stage.notice || "Положение команд сохранено в отдельном JSON турнира."} />
      <div className="group-tabs" role="tablist" aria-label="Группы турнира">
        {stage.groups.map((entry) => (
          <button
            key={entry.id}
            className={entry.id === group.id ? "group-tab is-active" : "group-tab"}
            type="button"
            role="tab"
            aria-selected={entry.id === group.id}
            onClick={() => setGroupId(entry.id)}
          >
            {entry.title}
          </button>
        ))}
      </div>
      {stage.sortRules?.length > 0 && (
        <div className="standings-order" aria-label="Порядок сортировки турнирной таблицы">
          <span className="standings-order-label">Порядок мест</span>
          <ol>
            {stage.sortRules.map((rule, index) => (
              <li key={rule}><span>{String(index + 1).padStart(2, "0")}</span>{rule}</li>
            ))}
          </ol>
        </div>
      )}
      {thresholds && (
        <div className="standings-key" aria-label="Цветовая маркировка турнирной таблицы">
          <span className="standings-key-item standings-key-item--wins">{thresholds.wins} победы · место зафиксировано</span>
          <span className="standings-key-item standings-key-item--losses">{thresholds.losses} поражения · выбыла</span>
        </div>
      )}
      <div className="table-wrap">
        <table className="standings-table">
          <thead><tr><th>#</th><th>Команда</th><th>И</th><th>В</th><th>П</th>{hasMapRecord && <th>{recordColumnLabel}</th>}<th>{finalColumnLabel}</th></tr></thead>
          <tbody>
            {rows.length > 0 ? rows.map((row) => (
              <tr className={getOutcomeClass(row)} key={row.team}>
                <td className="position">{String(row.position).padStart(2, "0")}</td>
                <td>
                  <div className="standings-team-cell">
                    <TeamIdentity tournament={tournament} team={row.team} size="compact" />
                    {row.placeLocked && <span className="standings-seed-lock">Посев {String(row.seed).padStart(2, "0")}</span>}
                  </div>
                </td><td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td>{hasMapRecord && <td className="map-record">{row.mapRecord || "—"}</td>}<td className="points">{row.finalLabel || row.points}</td>
              </tr>
            )) : (
              <tr className="empty-table-row"><td colSpan={hasMapRecord ? "7" : "6"}><StatusDot state="upcoming" /> {group.emptyState || "Данные этапа появятся после старта"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScheduleStage({ stage, number, tournament }) {
  const schedule = (
    <div className="schedule-list">
      {stage.matches.map((match) => {
        const isWalkover = match.status === "walkover";
        const isBye = match.status === "bye";
        const isCompleted = match.status === "completed";
        const hasPublishedScore = Number.isFinite(match.score1) && Number.isFinite(match.score2);
        const isAutomaticAdvance = isWalkover || isBye;
        const statusState = isAutomaticAdvance || isCompleted ? "closed" : "upcoming";
        const statusLabel = isWalkover ? "Техническая победа" : isBye ? "Проход без игры" : isCompleted ? (hasPublishedScore ? "Матч завершён" : "Результат подтверждён") : "Назначен матч";
        return (
          <article className={`schedule-match ${isWalkover ? "is-walkover" : ""} ${isBye ? "is-bye" : ""} ${isCompleted ? "is-completed" : ""}`} key={match.id}>
            <div className="schedule-meta">
              <span>{[match.dateDisplay, match.time].filter(Boolean).join(" · ")}</span>
              <StatusPill state={statusState}>{statusLabel}</StatusPill>
            </div>
            <div className="schedule-teams">
              <TeamIdentity tournament={tournament} team={match.team1} />
              {isCompleted ? <span className="schedule-score"><b>{hasPublishedScore ? match.score1 : "—"}</b><i>:</i><b>{hasPublishedScore ? match.score2 : "—"}</b></span> : <span>{isBye ? "→" : "vs"}</span>}
              <TeamIdentity tournament={tournament} team={match.team2} align="end" />
            </div>
            {match.note && <p>{match.note}</p>}
            {match.faceitUrl && <p className="schedule-source"><a href={match.faceitUrl} target="_blank" rel="noreferrer">Результат FACEIT</a>{match.map && <> · {match.map}</>}</p>}
          </article>
        );
      })}
    </div>
  );

  if (stage.collapsible) {
    return (
      <section className="container tournament-stage tournament-stage--accordion" id={stage.id}>
        <details className="stage-accordion" open={stage.defaultOpen || undefined}>
          <summary>
            <span>
              <span className="eyebrow">Архив / этап {number}</span>
              <strong>{stage.collapsedLabel || stage.title}</strong>
            </span>
            <span className="stage-accordion-action" aria-hidden="true" />
          </summary>
          <div className="stage-accordion-body">
            <StageTitle number={number} title={stage.title} description={stage.notice} />
            {schedule}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="container tournament-stage" id={stage.id}>
      <StageTitle number={number} title={stage.title} description={stage.notice} />
      {schedule}
    </section>
  );
}

function BracketMatch({ match }) {
  const team1 = match.team1 || "Ожидает соперника";
  const team2 = match.team2 || "Ожидает соперника";
  const meta = [match.sourceLabel, match.dateDisplay, match.time, match.bestOf].filter(Boolean).join(" · ");
  return (
    <div className="bracket-match">
      {meta && <p className="bracket-match-meta">{meta}</p>}
      <div><span className="bracket-team-name">{match.seed1 && <small className="bracket-seed">{match.seed1}</small>}{team1}</span><strong>{match.score1 ?? "—"}</strong></div>
      <div><span className="bracket-team-name">{match.seed2 && <small className="bracket-seed">{match.seed2}</small>}{team2}</span><strong>{match.score2 ?? "—"}</strong></div>
    </div>
  );
}

function BracketRound({ round, index, total, showConnectors = true }) {
  return (
    <div className={`bracket-round ${index === total - 1 ? "is-last" : ""} ${showConnectors ? "" : "bracket-round--no-connectors"}`}>
      <div className="bracket-round-heading"><span>{String(index + 1).padStart(2, "0")}</span><h3>{round.label}</h3></div>
      <div className={`bracket-matches bracket-matches--${round.matches.length}`}>
        {round.matches.map((match) => <BracketMatch key={match.id} match={match} />)}
      </div>
    </div>
  );
}

function getDoubleEliminationTracks(stage) {
  const upperRounds = stage.rounds.filter((round) => /upper|верхняя/i.test(`${round.id} ${round.label}`));
  const lowerRounds = stage.rounds.filter((round) => /lower|нижняя/i.test(`${round.id} ${round.label}`));
  const grandFinalRounds = stage.rounds.filter((round) => !upperRounds.includes(round) && !lowerRounds.includes(round));

  if (!upperRounds.length || !lowerRounds.length) return null;

  return [
    { id: "upper", title: "Верхняя сетка", rounds: upperRounds },
    { id: "lower", title: "Нижняя сетка", rounds: lowerRounds },
    { id: "grand-final", title: "Финал", rounds: grandFinalRounds },
  ].filter((track) => track.rounds.length > 0);
}

function BracketStage({ stage, number }) {
  const tracks = stage.type === "double_elimination" ? getDoubleEliminationTracks(stage) : null;
  const hasPublishedMatches = stage.rounds.some((round) => round.matches.some((match) => (
    match.team1 || match.team2 || match.score1 !== undefined || match.score2 !== undefined
  )));

  return (
    <section className="container tournament-stage" id={stage.id}>
      <StageTitle number={number} title={stage.title} description={stage.notice} />
      {hasPublishedMatches ? <>
        {stage.formatNotes?.length > 0 && (
          <div className="bracket-rules" aria-label="Правила сетки плей-офф">
            {stage.formatNotes.map((item) => (
              <div className="bracket-rule" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="bracket-scroll">
          <div className={`bracket bracket--${stage.type} ${tracks ? `bracket--tracked bracket--tracks-${tracks.length}` : ""}`}>
            {tracks ? tracks.map((track) => (
              <section className={`bracket-track bracket-track--${track.id}`} key={track.id}>
                <p className="bracket-track-title">{track.title}</p>
                <div className="bracket-track-rounds" style={{ gridTemplateColumns: `repeat(${track.rounds.length}, minmax(188px, 1fr))` }}>
                  {track.rounds.map((round, index) => <BracketRound key={round.id} round={round} index={index} total={track.rounds.length} showConnectors={false} />)}
                </div>
              </section>
            )) : stage.rounds.map((round, index) => <BracketRound key={round.id} round={round} index={index} total={stage.rounds.length} />)}
          </div>
        </div>
        <p className="data-caption">{stage.caption || "Показаны только опубликованные раунды и результаты. Пустые слоты не означают результат."}</p>
      </> : <div className="format-card"><StatusDot state="upcoming" /><div><p className="eyebrow">Сетка формируется</p><strong>{stage.emptyState || "Пары и результаты появятся после публикации сетки."}</strong></div></div>}
    </section>
  );
}

function SwissStage({ stage, number }) {
  return (
    <section className="container tournament-stage" id={stage.id}>
      <StageTitle number={number} title={stage.title} description={stage.notice} />
      <div className="format-card">
        <StatusDot state="upcoming" />
        <div><p className="eyebrow">Данные этапа</p><strong>Таблица и пары появятся после первого тура</strong></div>
      </div>
    </section>
  );
}

function HistoricalMatchesStage({ stage, number }) {
  return (
    <section className="container tournament-stage" id={stage.id}>
      <StageTitle number={number} title={stage.title} description={stage.notice} />
      {stage.matches.length > 0 ? <>
        <div className="archive-warning"><StatusDot state="closed" /> Полная визуальная сетка не реконструируется без первичных данных — ниже только подтверждённые матчи.</div>
        <div className="historical-matches">
          {stage.matches.map((match) => (
            <article className="historical-match" key={match.id || `${match.dateDisplay || match.date}-${match.team1}-${match.team2}`}>
              <div className="historical-meta"><span>{match.dateDisplay || match.date}</span><span>{match.stage} / {match.bestOf}</span></div>
              <div className="historical-score"><strong>{match.team1}</strong><b>{match.score1}</b><i>:</i><b>{match.score2}</b><strong>{match.team2}</strong></div>
            </article>
          ))}
        </div>
      </> : <div className="format-card"><StatusDot state="closed" /><div><p className="eyebrow">Архив данных</p><strong>{stage.emptyState || "Матчи для этого этапа не опубликованы."}</strong></div></div>}
    </section>
  );
}

function MatchdayMeta({ match }) {
  return <p className="matchday-meta"><span>Сегодня</span><span>{match.bestOf || "BO1"}</span><span>{match.time || "Время уточняется"}</span></p>;
}

function MatchdayFeaturedMatch({ match, tournament, roundLabel }) {
  return (
    <article className="matchday-featured-match">
      <div className="matchday-featured-heading">
        <p className="eyebrow">{roundLabel} / главная пара</p>
        <h1>Fight<br />sheet</h1>
      </div>
      <div className="matchday-featured-versus">
        <TeamIdentity tournament={tournament} team={match.team1} size="feature" />
        <strong>VS</strong>
        <TeamIdentity tournament={tournament} team={match.team2} align="end" size="feature" />
      </div>
      <MatchdayMeta match={match} />
    </article>
  );
}

function MatchdayRundownMatch({ match, tournament }) {
  return (
    <article className="matchday-rundown-match">
      <div className="matchday-rundown-versus">
        <TeamIdentity tournament={tournament} team={match.team1} size="feature" />
        <strong>VS</strong>
        <TeamIdentity tournament={tournament} team={match.team2} align="end" size="feature" />
      </div>
      <MatchdayMeta match={match} />
    </article>
  );
}

function MatchdayRundownResult({ match, tournament }) {
  return (
    <article className="matchday-rundown-match is-completed">
      <div className="matchday-rundown-versus">
        <TeamIdentity tournament={tournament} team={match.team1} size="feature" />
        <strong>{match.score1}:{match.score2}</strong>
        <TeamIdentity tournament={tournament} team={match.team2} align="end" size="feature" />
      </div>
      <p className="matchday-meta"><span>Завершён</span><span>{match.bestOf || "BO1"}</span><span>{match.roundRecord ? `Раунды ${match.roundRecord}` : match.dateDisplay}</span></p>
    </article>
  );
}

function CompletedMatchdayResult({ match, tournament }) {
  const hasPublishedScore = Number.isFinite(match.score1) && Number.isFinite(match.score2);
  const firstWon = hasPublishedScore ? match.score1 > match.score2 : match.winner === match.team1;
  const winner = firstWon ? match.team1 : match.team2;
  const loser = firstWon ? match.team2 : match.team1;
  const winningScore = firstWon ? match.score1 : match.score2;
  const losingScore = firstWon ? match.score2 : match.score1;

  return (
    <article className="matchday-result-item">
      <TeamIdentity tournament={tournament} team={winner} size="compact" />
      <strong>{hasPublishedScore ? `${winningScore}:${losingScore}` : "Победа · счёт уточняется"}</strong>
      <TeamIdentity tournament={tournament} team={loser} align="end" size="compact" />
    </article>
  );
}

function MatchdayPage({ tournament, navigate }) {
  const config = tournament.matchday;
  const nextStage = tournament.stages.find((stage) => stage.id === config.nextStageId);
  const previousStage = tournament.stages.find((stage) => stage.id === config.previousStageId);
  const scheduledMatches = (nextStage?.matches || []).filter((match) => !["walkover", "bye", "completed"].includes(match.status));
  const currentCompletedMatches = (nextStage?.matches || []).filter((match) => match.status === "completed");
  const automaticAdvances = (nextStage?.matches || []).filter((match) => ["walkover", "bye"].includes(match.status));
  const completedMatches = (previousStage?.matches || []).filter((match) => match.status === "completed");
  const walkovers = (previousStage?.matches || []).filter((match) => match.status === "walkover");
  const previousByes = (previousStage?.matches || []).filter((match) => match.status === "bye");
  const featuredMatch = scheduledMatches[0];
  const rundownMatches = scheduledMatches.slice(1);
  const roundLabel = config.dateLabel?.split("·")[0]?.trim() || nextStage?.title || "Текущий круг";
  const previousRoundLabel = previousStage?.title?.split("·")[0]?.trim() || "Предыдущий круг";

  return (
    <main className="matchday-page matchday-page--fight-sheet">
      <section className="container matchday-fight-sheet" aria-labelledby="matchday-title">
        <div className="matchday-fight-sheet-topline">
          <p>{config.dateDisplay || config.dateLabel}</p>
          <span>{config.formatRule || "CS2 / август 2026"}</span>
        </div>
        <div className="matchday-fight-sheet-grid">
          {featuredMatch && <MatchdayFeaturedMatch match={featuredMatch} tournament={tournament} roundLabel={roundLabel} />}
          <section className="matchday-rundown" aria-labelledby="matchday-title">
            <div className="matchday-rundown-heading">
              <p className="eyebrow">{config.matchdayLabel || roundLabel}</p>
              <h2 id="matchday-title">{rundownMatches.length > 0 ? "Остальные пары" : currentCompletedMatches.length > 0 ? "Результаты сегодня" : "Остальные пары"}</h2>
            </div>
            {rundownMatches.map((match) => <MatchdayRundownMatch key={match.id} match={match} tournament={tournament} />)}
            {currentCompletedMatches.map((match) => <MatchdayRundownResult key={match.id} match={match} tournament={tournament} />)}
          </section>
        </div>
      </section>

      <details className="container matchday-results">
        <summary>
          <span><b>{previousRoundLabel}</b> · Итоги</span>
          <span className="matchday-results-open-label">{previousStage?.matches?.length || 0} результатов · открыть</span>
          <span className="matchday-results-close-label">{previousStage?.matches?.length || 0} результатов · закрыть</span>
        </summary>
        <div className="matchday-results-body">
          <div className="matchday-results-ribbon">
            {completedMatches.map((match) => <CompletedMatchdayResult key={match.id} match={match} tournament={tournament} />)}
          </div>
          {walkovers.length > 0 && (
            <div className="matchday-walkovers">
              <strong>Технические победы</strong>
              <div>{walkovers.map((match) => <TeamIdentity key={match.id} tournament={tournament} team={match.team1} size="compact" />)}</div>
            </div>
          )}
          {previousByes.length > 0 && (
            <div className="matchday-walkovers">
              <strong>Победы без игры</strong>
              <div>{previousByes.map((match) => <TeamIdentity key={match.id} tournament={tournament} team={match.team1} size="compact" />)}</div>
            </div>
          )}
        </div>
      </details>

      {automaticAdvances.length > 0 && (
        <section className="container matchday-byes" aria-label="Проходы без игры">
          <strong>Проход без игры</strong>
          <div>{automaticAdvances.map((match) => <TeamIdentity key={match.id} tournament={tournament} team={match.team1} size="compact" />)}</div>
        </section>
      )}

      <section className="container matchday-partners" aria-label="Партнёры турнира">
        <div className="matchday-partners-title"><p>При <span>поддержке</span></p></div>
        <div className="matchday-partner-list">
          {config.partners.map((partner) => (
            <article key={partner.name} className={partner.logo ? "has-logo" : ""}>
              {partner.logo ? <img src={partner.logo} alt={partner.name} /> : <><strong>{partner.name}</strong><span>{partner.role}</span></>}
            </article>
          ))}
        </div>
        <ActionButton action={{ label: "Стать партнёром", target: "mailto:info@ycs.bar?subject=Партнёрство%20с%20YCS" }} navigate={navigate} variant="secondary" />
      </section>
    </main>
  );
}

function TournamentPage({ tournament, navigate }) {
  return (
    <main>
      <TournamentHero tournament={tournament} navigate={navigate} />
      <InfoBand tournament={tournament} />
      {tournament.stages.map((stage, index) => {
        const number = String(index + 1).padStart(2, "0");
        if (stage.type === "round_robin") return <RoundRobinStage key={stage.id} stage={stage} number={number} tournament={tournament} />;
        if (stage.type === "match_schedule") return <ScheduleStage key={stage.id} stage={stage} number={number} tournament={tournament} />;
        if (stage.type === "swiss") return <SwissStage key={stage.id} stage={stage} number={number} />;
        if (stage.type === "historical_matches") return <HistoricalMatchesStage key={stage.id} stage={stage} number={number} />;
        return <BracketStage key={stage.id} stage={stage} number={number} />;
      })}
    </main>
  );
}

function ResultsPage({ navigate }) {
  return (
    <main>
      <PageIntro eyebrow="Архив / результаты" title={<>Каждый турнир<br /><span>остаётся в сезоне</span></>} body="Сохраняем результаты групповых этапов, подтверждённые матчи и исходные данные по каждому проведённому турниру." />
      <section className="container result-list">
        {archivedTournaments.map((tournament, index) => (
          <button type="button" className="result-card" key={tournament.slug} onClick={() => navigate(`/tournaments/${tournament.slug}`)}>
            <div><span>АРХИВ / {String(index + 1).padStart(2, "0")}</span><StatusPill state="closed">{tournament.statusLabel}</StatusPill></div>
            <h2>{tournament.title}</h2>
            <p>{tournament.dates.display}</p>
            <strong>{getArchiveLabel(tournament)}</strong>
          </button>
        ))}
      </section>
      <section className="container archive-note"><p className="eyebrow">Хранение данных</p><p>Страницы не зависят от одной общей таблицы: для каждого турнира предусмотрен отдельный JSON‑файл с этапами и матчами.</p></section>
    </main>
  );
}

function BroadcastsPage({ navigate }) {
  return (
    <main>
      <PageIntro eyebrow="Эфир / трансляции" title={<>Матчи —<br /><span>в прямом эфире</span></>} body="Расписание эфиров собирается вокруг активного турнира. Ссылки на эфиры появляются на карточках матчей после утверждения сетки." />
      <section className="container broadcast-layout">
        <div className="broadcast-main-card"><StatusPill state="active">Ближайший эфир</StatusPill><h2>CS2 / YCS</h2><p>Эфир будет добавлен на страницу текущего турнира после публикации пар.</p><ActionButton action={{ label: "К турниру", target: "/tournaments/cs2-august-2026" }} navigate={navigate} /></div>
        <div className="broadcast-rules"><p className="eyebrow">Как следить</p><div><span>01</span><p>Откройте страницу турнира</p></div><div><span>02</span><p>Проверьте опубликованные пары</p></div><div><span>03</span><p>Перейдите в эфир в день игры</p></div></div>
      </section>
    </main>
  );
}

function PartnersPage() {
  return (
    <main>
      <PageIntro eyebrow="Партнёры / сезон 2026" title={<>Партнёры<br /><span>YCS</span></>} body="Поддержка партнёров помогает YAR CYBER SEASON проводить турниры, эфиры и встречи игроков в Ярославле." action={{ label: "Стать партнёром", target: "mailto:info@ycs.bar?subject=Партнёрство%20с%20YCS" }} />
      <section className="container partner-showcase" aria-labelledby="dodo-partner-title">
        <div className="partner-showcase__brand">
          <p className="eyebrow">01 / Партнёр сезона</p>
          <div className="partner-showcase__logo-wrap">
            <img src="/assets/partners/dodo-pizza.jpg" alt="Додо Пицца" />
          </div>
        </div>
        <div className="partner-showcase__copy">
          <p className="partner-showcase__label">YAR CYBER SEASON × DODO PIZZA</p>
          <h2 id="dodo-partner-title">Додо<br /><span>Пицца</span></h2>
          <p className="partner-showcase__role">Партнёр YAR CYBER SEASON</p>
          <div className="partner-showcase__rule" aria-hidden="true" />
          <p className="partner-showcase__description">Спасибо Додо Пицце за поддержку киберспортивного сезона в Ярославле.</p>
        </div>
      </section>
      <section className="container partner-contact">
        <div>
          <p className="eyebrow">Новая коллаборация</p>
          <h2>Ваш бренд<br /><span>в следующем матче</span></h2>
        </div>
        <p>Если хотите поддержать турнир, команду или трансляцию — напишите YCS. Обсудим формат, который будет заметен игрокам и зрителям.</p>
        <ActionButton action={{ label: "Связаться с YCS", target: "mailto:info@ycs.bar?subject=Партнёрство%20с%20YCS" }} variant="secondary" />
      </section>
    </main>
  );
}

function AboutPage({ navigate }) {
  return (
    <main>
      <PageIntro eyebrow="О проекте" title={<>YCS — сезон для<br /><span>соревновательной игры</span></>} body="Ярославский киберспортивный сезон объединяет турниры, трансляции и архив результатов в одной понятной системе." action={{ label: "Посмотреть текущий турнир", target: "/tournaments/cs2-august-2026" }} navigate={navigate} />
      <section className="container about-grid"><div><p className="eyebrow">Принцип</p><h2>Открытая точка входа для команды.</h2></div><div><p className="eyebrow">Структура</p><p>Анонс, турнирная страница, таблицы и сетки, сохранённый архив.</p></div><div><p className="eyebrow">Контакт</p><a href="mailto:info@ycs.bar">info@ycs.bar</a></div></section>
    </main>
  );
}

function NotFound({ navigate }) {
  return <main><PageIntro eyebrow="404" title={<>Маршрут<br /><span>не найден</span></>} body="Вернитесь к активному турниру или в архив сезона." action={{ label: "На главную", target: "/" }} navigate={navigate} /></main>;
}

export function Prototype() {
  const [path, setPath] = useLocationPath();

  const navigate = (target) => {
    if (isExternal(target)) {
      window.location.href = target;
      return;
    }
    if (target.startsWith("#")) {
      const element = document.querySelector(target);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", target);
    setPath(target);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const page = useMemo(() => {
    if (path === "/") return <HomePage navigate={navigate} />;
    if (path === "/results") return <ResultsPage navigate={navigate} />;
    if (path === "/broadcasts") return <BroadcastsPage navigate={navigate} />;
    if (path === "/partners") return <PartnersPage navigate={navigate} />;
    if (path === "/about") return <AboutPage navigate={navigate} />;
    if (path === "/tournaments/next") return <TournamentPage tournament={nextTournament} navigate={navigate} />;
    if (path === currentTournament.matchday?.route) return <MatchdayPage tournament={currentTournament} navigate={navigate} />;
    if (path.startsWith("/tournaments/")) {
      const tournament = getTournament(path.replace("/tournaments/", ""));
      if (tournament) return <TournamentPage tournament={tournament} navigate={navigate} />;
    }
    return <NotFound navigate={navigate} />;
  }, [path]);

  return <PageFrame navigate={navigate} path={path}>{page}</PageFrame>;
}
