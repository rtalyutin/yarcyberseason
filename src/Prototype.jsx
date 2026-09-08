import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CaretRight, List, Plus, X } from "@phosphor-icons/react";
import { getTournamentOutcome, isArchive, hasScore } from "./lib/tournament.js";
import { MatchdayPage } from "./components/Matchday.jsx";
import { TournamentNavigator } from "./components/TournamentNavigator.jsx";
import {
  archivedTournaments,
  currentTournament,
  getTournament,
  nextTournament,
} from "./data/tournaments/index.js";

const navItems = [
  { label: isArchive(currentTournament) ? "Итоги CS2" : "Сейчас", href: `/tournaments/${currentTournament.slug}` },
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
  const isHome = path === "/";
  const isMatchday = path === currentTournament.matchday?.route;
  const isTournament = path.startsWith("/tournaments/") && !isMatchday;
  const homeNav = [
    { label: "Турниры", href: "/" },
    { label: "Matchday", href: currentTournament.matchday.route },
    { label: "Архив", href: "/results" },
    { label: "О проекте", href: "/about" },
  ];
  const pageNav = isHome ? homeNav : isTournament ? [
    { label: "Турниры", href: "/" },
    { label: "Matchday", href: currentTournament.matchday.route },
    { label: "Трансляции", href: "/broadcasts" },
  ] : isMatchday ? [
    { label: "Турнир", href: `/tournaments/${currentTournament.id}` },
    { label: "Matchday", href: currentTournament.matchday.route },
    { label: "Трансляции", href: "/broadcasts" },
  ] : navItems;

  const go = (href) => {
    setMenuOpen(false);
    navigate(href);
  };

  return (
    <div className={`site-shell${isHome ? " site-shell--home" : isMatchday ? " site-shell--matchday" : isTournament ? " site-shell--tournament" : ""}`}>
      <div className="site-background" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" type="button" onClick={() => go("/")} aria-label="YCS — на главную">
          <img src="/assets/ycs-logo.jpg" alt="ЯКС" />
          <span>YAR CYBER SEASON</span>
        </button>
        {isMatchday && <p className="md-mobile-title">Matchday</p>}
        <nav className="desktop-nav" aria-label="Основная навигация">
          {pageNav.map((item) => (
            <button
              key={item.href}
              type="button"
              className={path === item.href || (isTournament && item.href === "/") ? "nav-link is-active" : "nav-link"}
              onClick={() => go(item.href)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}>
          {isHome || isMatchday || isTournament ? (menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />) : (menuOpen ? "Закрыть" : "Меню")}
        </button>
      </header>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Мобильная навигация">
          {pageNav.map((item) => (
            <button key={item.href} type="button" onClick={() => go(item.href)}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => go("/about")}>О проекте</button>
        </nav>
      )}
      {children}
      {!isHome && <Footer navigate={navigate} compact={isTournament} />}
    </div>
  );
}

const PRIVACY_URL = "https://ycs.bar/docs/" + encodeURIComponent("Политика_в_отношении_обработки_персональных_данных.pdf");

function Footer({ navigate }) {
  return <footer className="legal-footer container">
    <div className="legal-footer-grid">
      <div><p className="legal-company">ООО «ЯрКиберСезон»</p>
        <address>150040, Ярославская область, г. Ярославль,<br />ул. Володарского, д. 64, кв. 37</address>
        <p>ИНН 7606143578 · ОГРН 1257600007500</p>
      </div>
      <nav aria-label="Документы и контакты">
        <a href="mailto:info@ycs.bar">info@ycs.bar</a>
        <a href="/about#requisites">Контакты и реквизиты</a>
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Политика обработки персональных данных <ArrowUpRight aria-hidden="true" /></a>
        <a href={`/tournaments/${nextTournament.slug}#format`}>Правила участия</a>
      </nav>
    </div>
    <p className="legal-copyright">© 2026 ЯрКиберСезон</p>
  </footer>;
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

function getHomePlayoffMatch(tournament) {
  const outcome = getTournamentOutcome(tournament);
  if (outcome?.final) return { ...outcome.final, roundLabel: "Гранд-финал" };
  const playoff = tournament.stages?.find((stage) => stage.id === "playoffs");
  if (!playoff?.rounds) return null;
  const rounds = playoff.rounds.flatMap((round) => round.matches.map((match) => ({ ...match, roundLabel: round.label })));
  return rounds.find((match) => match.status !== "completed" && match.id.includes("grand-final"))
    || rounds.find((match) => match.status !== "completed")
    || rounds.at(-1)
    || null;
}

function HomeGameMark({ src, label }) {
  return <img className="home-game-mark" src={src} alt={label} />;
}

function HomePage({ navigate }) {
  const archivePreview = archivedTournaments.slice(0, 3);
  const featuredMatch = getHomePlayoffMatch(currentTournament);
  const outcome = getTournamentOutcome(currentTournament);
  const finished = isArchive(currentTournament);
  const registration = nextTournament.timeline?.find((item) => item.label.toLowerCase().includes("регистрац"));
  const deadline = registration?.date || nextTournament.facts?.find((fact) => fact.toLowerCase().includes("регистрац"));

  return (
    <>
      <main className="home-page">
        <section className="home-conversion" aria-labelledby="home-title">
          <img className="home-conversion-art" src="/assets/home-team-stage.webp" alt="" aria-hidden="true" />
          <div className="home-conversion-inner container">
            <div className="home-conversion-copy">
              <p className="home-kicker">YAR CYBER SEASON / 2026</p>
              <h1 id="home-title">Твоя команда.<br /><span>Твой сезон.</span></h1>
              <div className="home-next-lockup">
                <HomeGameMark src="/assets/games/dota2.svg" label="Dota 2" />
                <div>
                  <p>{nextTournament.title}</p>
                  <span>{nextTournament.season}</span>
                </div>
              </div>
              <p className="home-next-date">{nextTournament.dates.display}</p>
              <ul className="home-facts" aria-label="Условия участия">
                {nextTournament.facts?.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
              {deadline && <p className="home-deadline">Регистрация {deadline}</p>}
              <div className="home-conversion-actions">
                <ActionButton action={nextTournament.primaryAction} navigate={navigate} />
                <button className="home-subtle-link" type="button" onClick={() => navigate(`/tournaments/${nextTournament.slug}#format`)}>
                  Условия участия <ArrowUpRight weight="bold" aria-hidden="true" />
                </button>
              </div>
              <div className="registration-documents">
                <p>Заявка отправляется на <a href="mailto:info@ycs.bar">info@ycs.bar</a></p>
                <div><a href={`/tournaments/${nextTournament.slug}#format`}>Правила турнира <ArrowUpRight aria-hidden="true" /></a>
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Политика обработки персональных данных <ArrowUpRight aria-hidden="true" /></a></div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-season container" aria-label="Текущий сезон">
          <div className="home-season-main">
            <div className="home-section-intro">
              <p className="home-kicker">{finished ? "ТУРНИР ЗАВЕРШЁН" : "СЕЙЧАС В СЕЗОНЕ"}</p>
              <h2>{currentTournament.title}</h2>
              <p>{currentTournament.dates.display}</p>
            </div>
            {featuredMatch && <article className="home-featured-match">
              {outcome?.champion && <p className="home-champion">Чемпион <strong>{outcome.champion}</strong></p>}
              <div className="home-match-meta">
                <span>{featuredMatch.dateDisplay}{featuredMatch.time ? ` · ${featuredMatch.time}` : ""}</span>
                <span>{featuredMatch.roundLabel} · {featuredMatch.bestOf}</span>
              </div>
              <div className="home-match-teams">
                <TeamIdentity tournament={currentTournament} team={featuredMatch.team1} size="feature" />
                <span className={`home-versus${hasScore(featuredMatch) ? " home-final-score" : ""}`}>{hasScore(featuredMatch) ? `${featuredMatch.score1}:${featuredMatch.score2}` : "VS"}</span>
                <TeamIdentity tournament={currentTournament} team={featuredMatch.team2} align="end" size="feature" />
              </div>
              <button className="home-match-link" type="button" onClick={() => navigate(finished ? `/tournaments/${currentTournament.slug}#results` : currentTournament.matchday.route)}>
                {finished ? "Итоги турнира" : "Открыть Matchday"} <CaretRight weight="bold" aria-hidden="true" />
              </button>
            </article>}
          </div>

          <aside className="home-archive" aria-labelledby="home-archive-title">
            <div className="home-archive-heading">
              <p className="home-kicker">ЗАВЕРШЁННЫЕ ТУРНИРЫ</p>
              <h2 id="home-archive-title">Архив</h2>
            </div>
            <div className="home-archive-list">
              {archivePreview.map((tournament) => (
                <button className="home-archive-row" key={tournament.slug} type="button" onClick={() => navigate(`/tournaments/${tournament.slug}`)}>
                  <HomeGameMark src={tournament.discipline === "Dota 2" ? "/assets/games/dota2.svg" : "/assets/games/counterstrike.svg"} label={tournament.discipline} />
                  <span className="home-archive-copy"><strong>{tournament.title}</strong><small>{tournament.dates.display}</small>{getTournamentOutcome(tournament)?.champion && <small>Чемпион · {getTournamentOutcome(tournament).champion}</small>}</span>
                  <ArrowUpRight weight="bold" aria-hidden="true" />
                </button>
              ))}
            </div>
            <button className="home-all-results" type="button" onClick={() => navigate("/results")}>Все результаты <ArrowUpRight weight="bold" aria-hidden="true" /></button>
          </aside>
        </section>
        <section className="home-partners container" aria-labelledby="home-partners-title">
          <h2 id="home-partners-title">Спонсоры и партнёры</h2>
          <div className="home-partners-grid">
            <div className="home-partner">
              <img src="/assets/partners/fks-yao.png" alt="ФКС ЯО" width="160" height="80" loading="lazy" />
              <p>Федерация компьютерного спорта Ярославской области</p>
            </div>
            <div className="home-partner">
              <img src="/assets/partners/minsport-yao.png" alt="Минспорта ЯО" width="160" height="80" loading="lazy" />
              <p>Министерство спорта Ярославской области</p>
            </div>
            <div className="home-partner home-partner--dodo">
              <img src="/assets/partners/dodo-pizza.jpg" alt="Додо Пицца" width="180" height="100" loading="lazy" />
            </div>
            <a className="home-partner home-partner--join" href="mailto:info@ycs.bar?subject=Партнёрство%20с%20ЯрКиберСезоном">
              <Plus size={58} weight="light" aria-hidden="true" />
              <span>Стать партнёром <CaretRight size={16} weight="bold" aria-hidden="true" /></span>
            </a>
          </div>
        </section>
      </main>
      <Footer navigate={navigate} />
    </>
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

function TournamentPerks({ tournament }) {
  const hasPrizeDistribution = Boolean(tournament.prizeDistribution?.total || tournament.prizeDistribution?.items?.length);
  const hasAdditionalAwards = Boolean(tournament.additionalAwards?.length);
  const hasReferralContest = Boolean(tournament.referralContest);

  if (!hasPrizeDistribution && !hasAdditionalAwards && !hasReferralContest) return null;

  return (
    <section className="container tournament-perks" id="rewards">
      <div className="stage-title">
        <p className="eyebrow">Призы / условия</p>
        <div>
          <h2>За что играем</h2>
          <p>Призовой фонд, дополнительные награды и условия конкурса репостов.</p>
        </div>
      </div>
      <div className="tournament-perks-grid">
        {hasPrizeDistribution && (
          <article className="tournament-perk-card tournament-perk-card--prize">
            <p className="eyebrow">Призовой фонд</p>
            <strong className="tournament-prize-total">{tournament.prizeDistribution.total}</strong>
            <ul className="tournament-prize-list">
              {(tournament.prizeDistribution.items || []).map((item) => (
                <li key={item.place}><span>{item.place}</span><strong>{item.amount}</strong></li>
              ))}
            </ul>
          </article>
        )}
        {hasAdditionalAwards && (
          <article className="tournament-perk-card">
            <p className="eyebrow">Дополнительные награды</p>
            <ol className="tournament-perk-list">
              {tournament.additionalAwards.map((award) => (
                <li key={award.title}><strong>{award.title}</strong><span>{award.description}</span></li>
              ))}
            </ol>
          </article>
        )}
        {hasReferralContest && (
          <article className="tournament-perk-card tournament-perk-card--referral">
            <p className="eyebrow">{tournament.referralContest.title}</p>
            <h3>{tournament.referralContest.headline}</h3>
            <ul className="tournament-perk-list tournament-perk-list--bullets">
              {(tournament.referralContest.rules || []).map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </article>
        )}
      </div>
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
      <StageTitle number={number} title={stage.title} description={stage.notice} />
      <div className="group-tabs" role="tablist" aria-label="Группы турнира">
        {stage.groups.map((entry) => (
          <button
            key={entry.id}
            className={entry.id === group?.id ? "group-tab is-active" : "group-tab"}
            type="button"
            role="tab"
            aria-selected={entry.id === group?.id}
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
              <tr className="empty-table-row"><td colSpan={hasMapRecord ? "7" : "6"}><StatusDot state="upcoming" /> {group?.emptyState || "Данные этапа появятся после старта"}</td></tr>
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
              {hasPublishedScore ? <span className="schedule-score"><b>{match.score1}</b><i>:</i><b>{match.score2}</b></span> : <span>{isBye ? "→" : "vs"}</span>}
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
      {stage.rules?.length > 0 && (
        <div className="swiss-rule-grid" aria-label="Правила швейцарской системы">
          {stage.rules.map((rule) => (
            <article className="swiss-rule-card" key={rule.label}>
              <span>{rule.label}</span>
              <strong>{rule.value}</strong>
            </article>
          ))}
        </div>
      )}
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

function TournamentPage({ tournament, navigate }) {
  const renderStage = (stage, number) => {
    if (stage.type === "round_robin") return <RoundRobinStage stage={stage} number={number} tournament={tournament} />;
    if (stage.type === "swiss") return <SwissStage stage={stage} number={number} />;
    if (stage.rounds) return <BracketStage stage={stage} number={number} />;
    return <section className="tn-info"><h2>{stage.title}</h2>{stage.notice && <p>{stage.notice}</p>}</section>;
  };
  return <TournamentNavigator key={tournament.id} tournament={tournament} navigate={navigate} renderStage={renderStage} renderRewards={() => <TournamentPerks tournament={tournament} />} />;
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
            {getTournamentOutcome(tournament)?.champion && <p className="result-champion">Чемпион · {getTournamentOutcome(tournament).champion}</p>}
            <strong>{getArchiveLabel(tournament)}</strong>
          </button>
        ))}
      </section>

    </main>
  );
}

function BroadcastsPage({ navigate }) {
  const outcome = getTournamentOutcome(currentTournament);
  if (isArchive(currentTournament)) return <main>
    <PageIntro eyebrow="Трансляции" title={<>Турнир<br /><span>завершён</span></>} body={outcome?.champion ? `${outcome.champion} — чемпион ${currentTournament.title}.` : currentTournament.summary} />
    <section className="container broadcast-layout"><div className="broadcast-main-card"><StatusPill state="closed">{currentTournament.statusLabel}</StatusPill><h2>{currentTournament.title}</h2>{outcome?.final?.replayUrl ? <a className="button button--primary" href={outcome.final.replayUrl} target="_blank" rel="noreferrer">Запись гранд-финала</a> : <p>Запись гранд-финала пока не опубликована.</p>}<ActionButton action={{ label: "Итоги турнира", target: `/tournaments/${currentTournament.slug}` }} navigate={navigate} /></div></section>
  </main>;
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
      <section className="container legal-requisites" id="requisites">
        <h2>Контакты и реквизиты</h2>
        <p>Общество с ограниченной ответственностью «ЯрКиберСезон»</p>
        <dl><dt>Юридический адрес</dt><dd>150040, Ярославская область, г. Ярославль, ул. Володарского, д. 64, кв. 37</dd>
        <dt>ИНН / КПП</dt><dd>7606143578 / 760601001</dd><dt>ОГРН</dt><dd>1257600007500</dd>
        <dt>Электронная почта</dt><dd><a href="mailto:info@ycs.bar">info@ycs.bar</a></dd></dl>
      </section>
    </main>
  );
}

function NotFound({ navigate }) {
  return <main><PageIntro eyebrow="404" title={<>Маршрут<br /><span>не найден</span></>} body="Вернитесь к активному турниру или в архив сезона." action={{ label: "На главную", target: "/" }} navigate={navigate} /></main>;
}

export function Prototype() {
  const [path, setPath] = useLocationPath();

  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [path]);

  const navigate = (target) => {
    if (isExternal(target)) {
      window.location.href = target;
      return;
    }
    if (target.startsWith("#")) {
      window.history.pushState({}, "", target);
      window.dispatchEvent(new Event("hashchange"));
      const element = document.querySelector(target);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", target);
    setPath(new URL(target, window.location.origin).pathname);
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
