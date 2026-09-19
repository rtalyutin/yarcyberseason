import React, { Component, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadMiniAppModel } from "./data/load.js";
import { createMiniAppRouter } from "./router.js";
import { homeRoute, tournamentRoute } from "./contracts.js";
import { DEFAULT_PREFERENCES, THEMES, LANGUAGES, readPreferences, savePreferences, getMessages } from "./preferences.js";
import { RulesSection, ScheduleSection } from "./TournamentSections.jsx";
import { MatchesSection } from "./MatchesSection.jsx";

function deviceStorage() { try { return window.localStorage; } catch { return undefined; } }

class RenderBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function MiniApp({ runtimeFactory, modelLoader = loadMiniAppModel }) {
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState(null);
  const [activeRuntime, setActiveRuntime] = useState(null);
  const [error, setError] = useState(false);
  const [preferences, setPreferences] = useState(() => readPreferences(deviceStorage()));
  const copy = getMessages(preferences.language);
  useEffect(() => {
    savePreferences(deviceStorage(), preferences);
    document.documentElement.lang = preferences.language;
    document.title = "ЯрКиберСезон · Mini App";
  }, [preferences]);
  useEffect(() => {
    let cancelled = false;
    let router;
    const runtime = runtimeFactory();
    setActiveRuntime(runtime);
    setSession(null);
    setError(false);
    (async () => {
      try {
        await runtime.init();
        if (cancelled) return;
        const model = await modelLoader();
        if (cancelled) return;
        router = createMiniAppRouter(window, runtime, model.sections.map((section) => section.id));
        setSession({ model, runtime, router });
      // Keep the host exit available when data loading fails. Retry/unmount owns cleanup.
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; router?.dispose(); runtime.dispose(); };
  }, [attempt, runtimeFactory, modelLoader]);
  const retry = () => setAttempt((value) => value + 1);
  const failure = <><MiniAppHeader runtime={activeRuntime} copy={copy} /><div className="tg-message"><p role="alert">{copy.error}</p><button onClick={retry}>{copy.retry}</button></div></>;
  return <div className="tg-app" data-theme={preferences.theme} lang={preferences.language}>
    {error ? failure : session ? <RenderBoundary key={attempt} fallback={failure}>
      <MiniAppView {...session} copy={copy} preferences={preferences} onPreferences={(next) => setPreferences(savePreferences(deviceStorage(), next))} />
    </RenderBoundary> : <><MiniAppHeader runtime={activeRuntime} copy={copy} /><p className="tg-message" role="status">{copy.loading}</p></>}
  </div>;
}

export function MiniAppHeader({ model, runtime, copy, route = homeRoute(), onBack }) {
  const inTelegram = runtime?.kind === "telegram";
  return <header className="tg-header">
      {route.screen === "tournament" ? <button className="tg-back" aria-label={copy.back} onClick={onBack}>←</button> : <span className="tg-kicker">{copy.app}</span>}
      <img className="tg-logo" src={model?.project.logoUrl || "/assets/ycs-logo.jpg"} alt={model?.project.brandName || "ЯрКиберСезон"} width="76" height="38" />
      <div className="tg-header-actions">
        {model && <span className="tg-discipline">{model.tournament.discipline}</span>}
        <button className="tg-close" type="button" disabled={!runtime} aria-label={inTelegram ? copy.closeApp : copy.website}
          title={inTelegram ? `${copy.closeApp} (Esc)` : copy.website} onClick={() => runtime.close()}>
          <span className="tg-close-label">{inTelegram ? copy.close : copy.website}</span>
          <span aria-hidden="true">{inTelegram ? "×" : "↗"}</span>
        </button>
      </div>
    </header>;
}

export function MiniAppView({ model, runtime, router, copy, preferences, onPreferences }) {
  const state = useSyncExternalStore(router.subscribe, router.getSnapshot, router.getSnapshot);
  const { route } = state;
  const heading = useRef(null);
  useEffect(() => {
    runtime.setBackHandler(route.screen === "tournament" ? () => router.navigate(homeRoute()) : null);
    return () => runtime.setBackHandler(null);
  }, [runtime, router, route.screen]);
  useEffect(() => { runtime.ready(); }, [runtime]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [state.canonicalUrl]);
  const navigate = (next) => router.navigate(next);
  return <>
    <MiniAppHeader model={model} runtime={runtime} route={route} copy={copy} onBack={() => navigate(homeRoute())} />
    {(THEMES.length > 1 || LANGUAGES.length > 1) && <div className="tg-settings">
      {THEMES.length > 1 && <label>{copy.theme}<select value={preferences.theme} onChange={(event) => onPreferences({ ...preferences, theme: event.target.value })}>{THEMES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      {LANGUAGES.length > 1 && <label>{copy.language}<select value={preferences.language} onChange={(event) => onPreferences({ ...preferences, language: event.target.value })}>{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    </div>}
    {state.notice && <p className="tg-notice" role="status">{state.notice}</p>}
    <main>{route.screen === "home" ? <HomeScreen model={model} copy={copy} navigate={navigate} headingRef={heading} />
      : <TournamentScreen model={model} runtime={runtime} copy={copy} route={route} navigate={navigate} headingRef={heading} />}</main>
  </>;
}

export function RegistrationStatus({ model, copy }) {
  const label = model.registration.status === "closed" ? copy.closed : model.registration.status === "open" ? copy.openRegistration : copy.unknownRegistration;
  return <div className="tg-status"><span>{label}</span><strong>{model.registration.count}{model.registration.capacity !== null ? ` / ${model.registration.capacity}` : ""}</strong></div>;
}

export function HomeScreen({ model, copy = getMessages(DEFAULT_PREFERENCES.language), navigate, headingRef }) {
  return <div className="tg-home-layout">
    <section className="tg-hero">
      <div className="tg-art" aria-hidden="true"><div className="tg-map" /></div>
      <p className="tg-kicker">{model.tournament.discipline} · {model.tournament.season}</p>
      <h1 ref={headingRef} tabIndex={-1}>{copy.homeTitle.map((line, index) => index === 2 ? <em key={line}>{line}</em> : <span key={line}>{line}</span>)}</h1>
      <p className="tg-date">{model.tournament.dates.display || copy.noDates}</p>
    </section>
    <section className="tg-dock">
      <RegistrationStatus model={model} copy={copy} />
      <button className="tg-primary" onClick={() => navigate(tournamentRoute())}>{copy.open}<span aria-hidden="true">↗</span></button>
      <button className="tg-secondary" onClick={() => navigate(tournamentRoute("participants"))}>{copy.participants} · {model.participants.length}</button>
    </section>
    <footer className="tg-partners" aria-label={copy.partners}>{model.project.partners.map((partner) => <div key={partner.name}><img src={partner.logoUrl} alt={partner.name} /></div>)}</footer>
  </div>;
}

function TeamLogo({ participant }) {
  const [failed, setFailed] = useState(false);
  return participant.logoUrl && !failed ? <img className="tg-team-mark" src={participant.logoUrl} alt="" onError={() => setFailed(true)} loading="lazy" />
    : <span className="tg-team-mark" aria-hidden="true">{participant.displayName.slice(0, 1).toUpperCase()}</span>;
}

export function TournamentScreen({ model, runtime, copy = getMessages("ru"), route, navigate, headingRef }) {
  const isParticipants = route.section === "participants";
  return <div className="tg-tournament-layout">
    <section className="tg-tournament-title">
      <p className="tg-kicker">{copy.current}</p>
      <h1 ref={headingRef} tabIndex={-1}>{model.tournament.season.replace("YAR CYBER SEASON", "YCS")}</h1>
      <div className="tg-tournament-meta"><span>{model.tournament.dates.display || copy.noDates}</span><strong>{copy.count}: {model.participants.length}</strong></div>
    </section>
    <nav className="tg-section-strip" aria-label={copy.current}>
      {model.sections.filter((section) => ["overview", "participants", "rules", "schedule", "matches"].includes(section.id)).map((section) =>
        <button key={section.id} aria-current={route.section === section.id ? "page" : undefined} onClick={() => navigate(tournamentRoute(section.id))}>{section.label}</button>)}
    </nav>
    {isParticipants ? <section className="tg-participants" aria-labelledby="participant-title">
      <p className="tg-kicker">{copy.participantSection}</p>
      <h2 id="participant-title">{copy.count}: {model.participants.length}</h2>
      <RegistrationStatus model={model} copy={copy} />
      {model.participants.length ? <ol>{model.participants.map((participant, index) => <li key={participant.teamId} data-team-id={participant.teamId}>
        <span className="tg-team-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <TeamLogo participant={participant} /><strong>{participant.displayName}</strong>
        <small>{participant.status === "registered" ? copy.registered : copy.unknownStatus}</small>
      </li>)}</ol> : <p>{copy.noTeams}</p>}
    </section> : route.section === "overview" ? <section className="tg-overview">
      <p>{model.tournament.summary}</p>
      <ul className="tg-facts">{model.tournament.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      <p className="tg-notice">{model.registration.message}</p>
      <button className="tg-primary" onClick={() => navigate(tournamentRoute("participants"))}>{copy.participants}<span aria-hidden="true">→</span></button>
    </section> : route.section === "rules" ? <RulesSection model={model} copy={copy} />
      : route.section === "schedule" ? <ScheduleSection model={model} copy={copy} />
      : route.section === "matches" ? <MatchesSection model={model} runtime={runtime} copy={copy} />
      : <section className="tg-overview"><h2>{model.sections.find((section) => section.id === route.section)?.label}</h2><p>{copy.pendingSection}</p><button className="tg-primary" onClick={() => navigate(tournamentRoute("participants"))}>{copy.participants}</button></section>}
  </div>;
}
