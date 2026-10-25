import { useEffect, useMemo, useRef, useState } from "react";
import { useDotaResults } from "./lib/dota-results-client.js";
import { ArrowUpRight, CaretRight } from "@phosphor-icons/react";
import { getChampionLabels, getTournamentOutcome, isArchive, hasScore, isFinished, participantCount } from "./lib/tournament.js";
import { community } from './data/community.js';
import { projectContent, projectLegal } from './data/project-content.js';
import { MatchdayPage } from "./components/Matchday.jsx";
import { TournamentNavigator } from "./components/TournamentNavigator.jsx";
import { DotaSwissStandings } from "./components/DotaSwissStandings.jsx";
import { SwissPlayoffs } from "./components/SwissPlayoffs.jsx";
import { getSwissStandings, formatBuchholz } from "./lib/swiss-seeding.js";
import { OrganizerRoom } from "./components/OrganizerRoom.jsx";
import { ThemeArtwork } from "./components/ThemeSwitcher.jsx";
import { readTheme, saveTheme, normalizeTheme, THEME_STORAGE_KEY } from "./lib/theme.js";
import "./themes.css";
import "./internal-themes.css";
import "./tournament-arena.css";
import "./dota-home.css";
import { matchDateLabel, normalizeResult, safeHttps } from './lib/community.js';
import { getHomeBroadcastContent } from './lib/home-content.js';
import { loadHomeContent } from './data/home-content.js';
import { TeamPage, MatchPage } from './components/CommunityPages.jsx';
import { NavigationContext, TeamLink, MatchLink } from './components/CommunityLinks.jsx';
import { ClickHighlight } from "./components/ClickHighlight.jsx";
import { TechiesEgg } from "./components/TechiesEgg.jsx";
import { AboutPage } from "./components/AboutPage.jsx";
import { PartnersPage } from "./components/PartnersPage.jsx";
import { BroadcastLinks, MatchCasters } from "./components/BroadcastLinks.jsx";
import { getTournamentBroadcasts, isClosedBroadcast } from "./lib/home-board.js";
import "./content-refresh.css";
import "./home-partners.css";
import "./postseason.css";
import { SiteHeader } from "./components/SiteHeader.jsx";
import PlayerIntakePage from './components/PlayerIntakePage.jsx';
import { SeasonFinale, TournamentThanks } from './components/SeasonFinale.jsx';
import { applyPageMetadata } from "./lib/page-metadata.js";
import {
  archivedTournaments,
  currentTournament,
  getTournament,
  nextTournament,
} from "./data/tournaments/index.js";

function useLocationPath(initialPath) {
  const [path, setPath] = useState(() => initialPath || (typeof window === "undefined" ? "/" : window.location.pathname || "/"));

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

function followPublicLink(event, href, navigate) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.currentTarget.target || event.currentTarget.hasAttribute("download")) return;
  event.preventDefault();
  navigate(href);
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
  const logo = tournament?.teamLogos?.[team] || community.resolveTeam(tournament?.id, team)?.logo || '/assets/teams/_default.svg';

  return (
    <span className={`team-identity team-identity--${align} team-identity--${size}`}>
      {logo && <img src={logo} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/assets/teams/_default.svg"; }} />}
      <TeamLink tournamentId={tournament?.id} name={team} />
    </span>
  );
}

function PageFrame({ children, navigate, path, theme, onThemeChange }) {
  const isHome = path === "/";
  const isAbout = path.replace(/\/$/, "") === "/about";
  const isPlayerIntake = path.replace(/\/$/, "") === "/player/profile";
  const isTeam = path.startsWith("/teams/");
  const matchdayPath = path.match(/^\/tournaments\/([a-z0-9-]+)\/matchday\/?$/);
  const isMatchday = Boolean(matchdayPath && getTournament(matchdayPath[1])?.matchday);
  const isTournament = path.startsWith("/tournaments/") && !isMatchday;

  return (
    <div data-theme={isAbout ? "ycs" : isPlayerIntake ? "corporate" : theme} className={`site-shell${isHome ? " site-shell--home" : isAbout ? " site-shell--about" : isPlayerIntake ? " site-shell--player-league" : isMatchday ? " site-shell--matchday" : isTournament ? " site-shell--tournament" : isTeam ? " site-shell--team" : ""}`}>
      <div className="site-background" aria-hidden="true" />
      <SiteHeader path={path} navigate={navigate} theme={theme} onThemeChange={onThemeChange}
        matchdayRoute={currentTournament.matchday.route} fixedTheme={isAbout || isPlayerIntake} />
      {children}
      {isPlayerIntake ? <footer className="league-footer">
        <span>Лига цифровой экономики · Карточка игрока</span>
        <nav aria-label="Документы формы"><a href={projectLegal.privacyUrl} target="_blank" rel="noopener noreferrer">Политика обработки персональных данных</a>
          <a href="/about#requisites">Контакты организатора</a></nav>
      </footer> : !isHome && <Footer navigate={navigate} compact={isTournament} />}
    </div>
  );
}


function Footer({ navigate }) {
  return <footer className="legal-footer container">
    <div className="legal-footer-grid">
      <div><p className="legal-company">{projectLegal.companyName}</p>
        <address>{projectLegal.address[0]}<br />{projectLegal.address[1]}</address>
        <p>{projectLegal.identifiers}</p>
      </div>
      <nav aria-label="Документы и контакты">
        <a href={`mailto:${projectContent.contactEmail}`}>{projectContent.contactEmail}</a>
        <a href="/about#requisites">Контакты и реквизиты</a>
        <a href="/webmcp">Данные для ИИ</a>
        <a href={projectLegal.privacyUrl} target="_blank" rel="noopener noreferrer">Политика обработки персональных данных <ArrowUpRight aria-hidden="true" /></a>
        <a href={`/tournaments/${currentTournament.slug}#format`}>Регламент турнира</a>
      </nav>
    </div>
    <p className="legal-copyright">{projectLegal.copyright}</p>
    <details className="image-credits">
      <summary>Фотография Ярославля</summary>
      <p>Стрелка и Успенский собор. Фото: © Алексей Фёдоров (Florstein), 2015 · <a href="https://commons.wikimedia.org/wiki/File:Strelka_of_Yaroslavl_03.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Снимок уменьшен для сайта; цветовое оформление и логотип наложены отдельно.</p>
    </details>
    <OrganizerRoom />
  </footer>;
}

function ActionButton({ action, variant = "primary", navigate }) {
  const target = action.target;
  const className = `button button--${variant}`;

  if (isExternal(target)) {
    return <a className={className} href={target}>{action.label}</a>;
  }

  return <a className={className} href={target} onClick={(event) => followPublicLink(event, target, navigate)}>{action.label}</a>;
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

function HomeGameMark({ src, label }) {
  return <img className="home-game-mark" src={src} alt={label} />;
}

function HomeBroadcastBoard({ tournament, navigate }) {
  const { match, state, label, date, format, note, links, score } = getHomeBroadcastContent(tournament);
  const schedule = state === 'completed' ? `/tournaments/${tournament.slug}?section=results` : tournament.matchday?.route || `/tournaments/${tournament.slug}?section=matches`;
  return <aside className={`home-broadcast-board home-broadcast-board--${state}`} aria-label="Табло сезона">
    <div className="home-board-topline"><span className="home-board-signal" aria-hidden="true" /><p>{label}</p><span>YCS / 2026</span></div>
    {match && <>
      <p className="home-board-date">{date} · {format}</p>
      <div className="home-board-teams">
        <TeamIdentity tournament={tournament} team={match.team1} />
        <strong aria-label={score ? `Счёт серии ${score.join(':')}` : 'Против'}>{score ? score.join(':') : 'VS'}</strong>
        <TeamIdentity tournament={tournament} team={match.team2} align="end" />
      </div>
      <MatchCasters match={match} />
    </>}
    {note && <p className="home-board-note">{note}</p>}
    <div className="home-board-actions">
      {state !== 'completed' && <BroadcastLinks match={match} className="button button--primary" />}
      <ActionButton action={{ label: state === 'completed' ? 'Итоги турнира' : 'Открыть Matchday', target: schedule }} navigate={navigate} variant={links.length ? 'secondary' : 'primary'} />
    </div>
  </aside>;
}

function HomePage({ navigate, theme }) {
  const heroImageRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const home = loadHomeContent(now);
  const archivePreview = home.archivePreview;
  const { match: featuredMatch, outcome, finished, tournament: seasonTournament } = home.season;
  const featuredTournament = home.featuredTournament;

  return (
    <>
      <main className="home-page">
        <section className={`home-conversion${home.completed ? ' home-conversion--completed' : ''}`} aria-labelledby="home-title">
          <ThemeArtwork theme={theme} imageRef={heroImageRef} />
          {theme === "cs2" && <ClickHighlight imageRef={heroImageRef} />}
          {theme === "dota2" && <TechiesEgg />}
          {home.completed ? <SeasonFinale content={home} /> : <div className="home-conversion-inner container">
            <div className="home-conversion-copy">
              <p className="home-kicker">{home.kicker}</p>
              <h1 id="home-title">{home.headline[0]}{home.headline[1] && <><br /><span>{home.headline[1]}</span></>}</h1>
              <div className="home-next-lockup">
                <HomeGameMark src="/assets/games/dota2.svg" label="Dota 2" />
                <div>
                  <p>{featuredTournament.title}</p>
                  <span>{featuredTournament.season}</span>
                </div>
              </div>
              <p className="home-next-date">{featuredTournament.dates.display}</p>
              {featuredTournament.registration?.message && <p className="home-registration-status">{featuredTournament.registration.message}</p>}
              <ul className="home-facts" aria-label="Турнир в цифрах">
                {home.facts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
              <HomeBroadcastBoard tournament={featuredTournament} navigate={navigate} />
            </div>
          </div>}
        </section>

        <section className="home-season container" aria-label="Завершённый турнир">
          <div className="home-season-main">
            <div className="home-section-intro">
              <p className="home-kicker">{finished ? "ТУРНИР ЗАВЕРШЁН" : "СЕЙЧАС В СЕЗОНЕ"}</p>
              <h2>{seasonTournament.title}</h2>
              <p>{seasonTournament.dates.display}</p>
            </div>
            {featuredMatch && <article className="home-featured-match">
              {outcome?.champion && <p className="home-champion">Чемпион <strong>{outcome.champion}</strong></p>}
              <div className="home-match-meta">
                <span>{featuredMatch.dateDisplay}{featuredMatch.time ? ` · ${featuredMatch.time}` : ""}</span>
                <span>{featuredMatch.roundLabel} · {featuredMatch.bestOf}</span>
              </div>
              <div className="home-match-teams">
                <TeamIdentity tournament={seasonTournament} team={featuredMatch.team1} size="feature" />
                <span className={`home-versus${isFinished(featuredMatch) && hasScore(featuredMatch) ? " home-final-score" : ""}`}>{isFinished(featuredMatch) && hasScore(featuredMatch) ? `${featuredMatch.score1}:${featuredMatch.score2}` : "VS"}</span>
                <TeamIdentity tournament={seasonTournament} team={featuredMatch.team2} align="end" size="feature" />
              </div>
              <a className="home-match-link" href={finished ? `/tournaments/${seasonTournament.slug}#results` : seasonTournament.matchday.route} onClick={(event) => followPublicLink(event, finished ? `/tournaments/${seasonTournament.slug}#results` : seasonTournament.matchday.route, navigate)}>
                {finished ? "Итоги турнира" : "Открыть Matchday"} <CaretRight weight="bold" aria-hidden="true" />
              </a>
            </article>}
          </div>

          <aside className="home-archive" aria-labelledby="home-archive-title">
            <div className="home-archive-heading">
              <p className="home-kicker">ЗАВЕРШЁННЫЕ ТУРНИРЫ</p>
              <h2 id="home-archive-title">Архив</h2>
            </div>
            <div className="home-archive-list">
              {archivePreview.map(({ tournament, champions }) => (
                <a className="home-archive-row" key={tournament.slug} href={`/tournaments/${tournament.slug}`} onClick={(event) => followPublicLink(event, `/tournaments/${tournament.slug}`, navigate)}>
                  <HomeGameMark src={tournament.discipline === "Dota 2" ? "/assets/games/dota2.svg" : "/assets/games/counterstrike.svg"} label={tournament.discipline} />
                  <span className="home-archive-copy"><strong>{tournament.title}</strong><small>{tournament.dates.display}</small>{champions.map((label) => <small key={label}>{label}</small>)}</span>
                  <ArrowUpRight weight="bold" aria-hidden="true" />
                </a>
              ))}
            </div>
            <a className="home-all-results" href="/results" onClick={(event) => followPublicLink(event, "/results", navigate)}>Все результаты <ArrowUpRight weight="bold" aria-hidden="true" /></a>
          </aside>
        </section>
        {home.completed && <div className="container"><TournamentThanks tournament={featuredTournament} /></div>}
        <section className="home-partners home-partners--brand-row container" aria-labelledby="home-partners-title">
          <div className="home-partners-heading">
            <h2 id="home-partners-title">Партнёры турнира</h2>
            <a className="home-partners-contact" href="/partners" onClick={(event) => followPublicLink(event, "/partners", navigate)}>
              Проект в цифрах <ArrowUpRight size={20} weight="bold" aria-hidden="true" />
            </a>
          </div>
          <div className="home-partners-brands">
            {home.partners.map((partner) => {
              const url = safeHttps(partner.homeUrl || partner.url);
              const Tag = url ? "a" : "div";
              const logo = partner.homeLogoUrl || partner.logoUrl;
              return <Tag className={`home-brand home-brand--${partner.id}`} key={partner.id || partner.name}
                {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer", "aria-label": `${partner.name} — сайт партнёра (новая вкладка)` } : {})}>
                <div className="home-brand-logo">
                  {logo ? <img src={logo} alt={partner.name} loading="lazy" decoding="async" /> : <strong>{partner.shortName || partner.name}</strong>}
                </div>
                <span className="home-brand-role">{partner.homeRole || partner.description}</span>
                {url && <ArrowUpRight className="home-brand-arrow" size={20} aria-hidden="true" />}
              </Tag>;
            })}
          </div>
        </section>
        {home.officialSupport.length > 0 && <section className="home-official-support container" aria-label="При поддержке">
          <h2>При поддержке</h2><div>{home.officialSupport.map((partner) => <div key={partner.id || partner.name}>
            {partner.logoUrl && <img src={partner.logoUrl} alt="" loading="lazy" />}<span>{partner.name}</span>
          </div>)}</div>
        </section>}
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

function BracketMatch({ match, tournament }) {
  const result = normalizeResult(match, tournament.discipline);
  const team1 = match.team1 || "Ожидает соперника";
  const team2 = match.team2 || "Ожидает соперника";
  const meta = [match.sourceLabel, match.dateDisplay, match.time, match.bestOf].filter(Boolean).join(" · ");
  return (
    <div className="bracket-match">
      {meta && <p className="bracket-match-meta">{meta}</p>}
      <div><span className="bracket-team-name">{match.seed1 && <small className="bracket-seed">{match.seed1}</small>}<TeamLink tournamentId={tournament.id} name={team1} /></span><strong>{result.score?.[0] ?? "—"}</strong></div>
      <div><span className="bracket-team-name">{match.seed2 && <small className="bracket-seed">{match.seed2}</small>}<TeamLink tournamentId={tournament.id} name={team2} /></span><strong>{result.score?.[1] ?? "—"}</strong></div>
      <MatchLink tournamentId={tournament.id} matchId={match.id} />
    </div>
  );
}

function BracketRound({ round, index, total, showConnectors = true, tournament }) {
  return (
    <div className={`bracket-round ${index === total - 1 ? "is-last" : ""} ${showConnectors ? "" : "bracket-round--no-connectors"}`}>
      <div className="bracket-round-heading"><span>{String(index + 1).padStart(2, "0")}</span><h3>{round.label}</h3></div>
      <div className={`bracket-matches bracket-matches--${round.matches.length}`}>
        {round.matches.map((match) => <BracketMatch key={match.id} match={match} tournament={tournament} />)}
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

function BracketStage({ stage, number, tournament }) {
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
                  {track.rounds.map((round, index) => <BracketRound tournament={tournament} key={round.id} round={round} index={index} total={track.rounds.length} showConnectors={false} />)}
                </div>
              </section>
            )) : stage.rounds.map((round, index) => <BracketRound tournament={tournament} key={round.id} round={round} index={index} total={stage.rounds.length} />)}
          </div>
        </div>
        <p className="data-caption">{stage.caption || "Показаны только опубликованные раунды и результаты. Пустые слоты не означают результат."}</p>
      </> : <div className="format-card"><StatusDot state="upcoming" /><div><p className="eyebrow">Сетка формируется</p><strong>{stage.emptyState || "Пары и результаты появятся после публикации сетки."}</strong></div></div>}
    </section>
  );
}

function SwissStage({ stage, number, tournament }) {
  const groups = (stage.ranking === 'buchholz' ? [{ id: 'current-swiss', title: 'Текущие результаты Swiss', rows: getSwissStandings(tournament, stage) }] : stage.groups || []).filter((group) => group.rows?.length > 0);
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
      {groups.length > 0 ? <>
        {groups.map((group) => <div key={group.id}>
          <h3>{group.title}</h3>
          <div className="table-wrap">
            <table className="standings-table" aria-label={group.title}>
              <thead><tr><th>Команда</th><th>И</th><th>В</th><th>П</th>{stage.ranking === 'buchholz' && <th>Бухгольц</th>}</tr></thead>
              <tbody>{[...group.rows].sort((a, b) => b.won - a.won || a.lost - b.lost).map((row) => (
                <tr key={row.teamId || row.team}>
                  <td><TeamIdentity tournament={tournament} team={row.team} size="compact" /></td>
                  <td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td>{stage.ranking === 'buchholz' && <td>{formatBuchholz(row.buchholz)}</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>)}
        <p className="data-caption">Учтены только подтверждённые результаты. Пары следующих туров появятся после публикации.</p>
      </> : <div className="format-card">
        <StatusDot state="upcoming" />
        <div><p className="eyebrow">Данные этапа</p><strong>Таблица и пары появятся после первого тура</strong></div>
      </div>}
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

function TournamentPage({ tournament, navigate, theme }) {
  const renderStage = (stage, number) => {
    if (stage.seeding?.method === 'buchholz') return <SwissPlayoffs stage={stage} tournament={tournament} />;
    if (stage.type === "round_robin") return <RoundRobinStage stage={stage} number={number} tournament={tournament} />;
    if (stage.type === "swiss") return theme === 'dota2' && tournament.discipline === 'Dota 2'
      ? <DotaSwissStandings stage={stage} tournament={tournament} />
      : <SwissStage stage={stage} number={number} tournament={tournament} />;
    if (stage.rounds) return <BracketStage stage={stage} number={number} tournament={tournament} />;
    return <section className="tn-info"><h2>{stage.title}</h2>{stage.notice && <p>{stage.notice}</p>}</section>;
  };
  return <TournamentNavigator key={tournament.id} tournament={tournament} navigate={navigate} theme={theme} renderStage={renderStage} renderRewards={() => <TournamentPerks tournament={tournament} />} />;
}

function ResultsPage({ navigate }) {
  return (
    <main>
      <PageIntro eyebrow="Архив / результаты" title={<>Каждый турнир<br /><span>остаётся в сезоне</span></>} body="Сохраняем результаты групповых этапов, подтверждённые матчи и исходные данные по каждому проведённому турниру." />
      <section className="container result-list">
        {archivedTournaments.map((tournament, index) => (
          <a className="result-card" key={tournament.slug} href={`/tournaments/${tournament.slug}`} onClick={(event) => followPublicLink(event, `/tournaments/${tournament.slug}`, navigate)}>
            <div><span>АРХИВ / {String(index + 1).padStart(2, "0")}</span><StatusPill state="closed">{tournament.statusLabel}</StatusPill></div>
            <h2>{tournament.title}</h2>
            <p>{tournament.dates.display}</p>
            {getChampionLabels(tournament).map((label) => <p className="result-champion" key={label}>{label}</p>)}
            <strong>{getArchiveLabel(tournament)}</strong>
          </a>
        ))}
      </section>

    </main>
  );
}

function BroadcastsPage({ navigate }) {
  const broadcasts = getTournamentBroadcasts(currentTournament);
  const current = getHomeBroadcastContent(currentTournament);
  const history = broadcasts.filter(isClosedBroadcast);
  const upcoming = isArchive(currentTournament) ? [] : broadcasts.filter((match) => !isClosedBroadcast(match) && match.id !== current.match?.id);
  const card = (match, completed) => <article className="broadcast-match-card" key={match.id} data-match-id={match.id}>
    <p className="eyebrow">{match.status === 'cancelled' ? 'Эфир отменён' : completed ? 'Завершённый эфир' : match.status === 'live' ? 'В эфире' : 'Назначенный эфир'}</p>
    <h3>{match.team1} — {match.team2}</h3><p>{matchDateLabel(match)}{match.bestOf && ` · ${match.bestOf}`}</p>
    <MatchCasters match={match} />
    {completed && <p>{match.status === 'cancelled' ? 'Эфир отменён.' : 'Трансляция завершена. Ссылки ведут на площадки эфира.'}</p>}
    <div className="home-board-actions"><BroadcastLinks match={match} className="button button--secondary" />
      {match.replayUrl && safeHttps(match.replayUrl) && <a className="button button--secondary" href={safeHttps(match.replayUrl)} target="_blank" rel="noreferrer">Запись матча</a>}
      <MatchLink tournamentId={currentTournament.id} matchId={match.id} />
    </div>
  </article>;
  return <main className="broadcasts-page">
    <PageIntro eyebrow="Эфир / трансляции" title={<>Трансляции<br /><span>{currentTournament.discipline}</span></>} body={`${currentTournament.title}. Назначенные эфиры, площадки и опубликованные сведения о матчах.`} />
    <section className="container broadcast-current" aria-label="Текущий или следующий эфир">
      <HomeBroadcastBoard tournament={currentTournament} navigate={navigate} />
    </section>
    {upcoming.length > 0 && <section className="container broadcast-history"><h2>Следующие эфиры</h2>{upcoming.map((match) => card(match, false))}</section>}
    {history.length > 0 && <section className="container broadcast-history"><h2>История эфиров</h2>{history.map((match) => card(match, true))}</section>}
    <section className="container broadcast-history"><h2>Архив турниров</h2><div className="broadcast-archives">{archivedTournaments.map((tournament) => <article key={tournament.id}>
      <p>{tournament.discipline} · {tournament.dates.display}</p><h3>{tournament.title}</h3>
      <ActionButton action={{label:'Итоги турнира',target:`/tournaments/${tournament.slug}`}} navigate={navigate} variant="secondary" />
    </article>)}</div></section>
  </main>;
}

function NotFound({ navigate }) {
  return <main><PageIntro eyebrow="404" title={<>Маршрут<br /><span>не найден</span></>} body="Вернитесь к активному турниру или в архив сезона." action={{ label: "На главную", target: "/" }} navigate={navigate} /></main>;
}

export function Prototype({ initialPath = "/" }) {
  const [path, setPath] = useLocationPath(initialPath);
  const [theme, setTheme] = useState("cs2");
  const dotaResults = useDotaResults();

  const changeTheme = (value) => {
    const next = normalizeTheme(value);
    setTheme(next);
    saveTheme(next);
  };

  useEffect(() => {
    setTheme(readTheme());
    const syncTheme = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(readTheme());
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  useEffect(() => { applyPageMetadata(path); }, [path]);

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
    const destination = new URL(target, window.location.origin);
    if (destination.pathname === path && destination.hash) {
      window.history.pushState({}, "", `${destination.pathname}${destination.search}${destination.hash}`);
      window.dispatchEvent(new Event("hashchange"));
      const id = decodeURIComponent(destination.hash.slice(1));
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (target === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", `${destination.pathname}${destination.search}${destination.hash}`);
    setPath(destination.pathname);
    window.dispatchEvent(new Event("popstate"));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const page = useMemo(() => {
    if (path.replace(/\/$/, '') === '/player/profile') return <PlayerIntakePage />;
    if (path === "/") return <HomePage navigate={navigate} theme={theme} />;
    if (path === "/results") return <ResultsPage navigate={navigate} />;
    if (path === "/broadcasts") return <BroadcastsPage navigate={navigate} />;
    if (path === "/partners") return <PartnersPage navigate={navigate} />;
    if (path.replace(/\/$/, "") === "/about") return <AboutPage />;
    if (path === "/tournaments/next") return <TournamentPage tournament={nextTournament || currentTournament} navigate={navigate} theme={theme} />;
    const matchdayRoute = path.match(/^\/tournaments\/([a-z0-9-]+)\/matchday\/?$/);
    const matchdayTournament = matchdayRoute && getTournament(matchdayRoute[1]);
    if (matchdayTournament?.matchday) return <MatchdayPage tournament={matchdayTournament} navigate={navigate} />;
    const teamRoute = path.match(/^\/teams\/([a-z0-9-]+)\/?$/);
    if (teamRoute) return <TeamPage key={teamRoute[1]} teamId={teamRoute[1]} theme={theme} />;
    const matchRoute = path.match(/^\/tournaments\/([a-z0-9-]+)\/matches\/([a-z0-9-]+)\/?$/);
    if (matchRoute) return <MatchPage key={path} tournamentSlug={matchRoute[1]} matchId={matchRoute[2]} theme={theme} />;
    if (path.startsWith("/tournaments/")) {
      const tournament = getTournament(path.replace("/tournaments/", ""));
      if (tournament) return <TournamentPage tournament={tournament} navigate={navigate} theme={theme} />;
    }
    return <NotFound navigate={navigate} />;
  }, [path, theme, dotaResults.revision]);

  return <NavigationContext.Provider value={navigate}><PageFrame navigate={navigate} path={path} theme={theme} onThemeChange={changeTheme}>
    {dotaResults.revision > 0 && dotaResults.availability === "unavailable" && (path === "/" || path.includes("dota2-autumn-2026") ||
      currentTournament.participants?.some((participant) => path === `/teams/${participant.teamId}`)) &&
      <p className="dota-results-notice" role="status">Результаты могут обновляться с задержкой.</p>}
    {page}
  </PageFrame></NavigationContext.Provider>;
}
