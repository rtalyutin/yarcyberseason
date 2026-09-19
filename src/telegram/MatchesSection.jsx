import React from "react";
import { getMessages } from "./preferences.js";
import { isUiAction } from "./contracts.js";
import { matchStatusLabel } from "./match-presentation.js";

export function MatchResult({ result, copy = getMessages("ru") }) {
  if (!result.confirmed) return <span className="tg-match-score-empty">{copy.noConfirmedScore}</span>;
  if (!result.known || !result.score) return <span className="tg-match-score-empty">{copy.unknownScore}</span>;
  return <span className="tg-match-score">
    <span>{result.label}</span><strong>{result.score.join(":")}</strong>
    {result.draw && <span>{copy.draw}</span>}
  </span>;
}

export function MatchDetails({ match, runtime, copy = getMessages("ru") }) {
  const { result } = match;
  const links = match.links.filter((action) => isUiAction(action) && action.kind === "external");
  return <div className="tg-match-details">
    {match.note && <p>{match.note}</p>}
    {!result.confirmed ? <p className="tg-empty">{["completed", "walkover", "bye"].includes(match.status) ? copy.resultPending : copy.noConfirmedScore}</p>
      : result.technical ? <p className="tg-empty">{copy.technicalNoMaps}</p>
      : <>
        <h3>{copy.maps}</h3>
        {result.maps.length ? <>
          <p className="tg-source-state">{copy.publishedMapsOnly}</p>
          <ol className="tg-map-results">{result.maps.map((map, index) => <li key={map.id || index}>
            <strong>{map.name}</strong>
            {map.score ? <span>{map.unit}: <b>{map.score.join(":")}</b></span> : <span>{copy.noMapScore}</span>}
            {map.outcome && <p>{map.outcome}</p>}
          </li>)}</ol>
        </> : <p className="tg-empty">{copy.noMaps}</p>}
      </>}
    {links.length > 0 && <div className="tg-match-links" aria-label={copy.matchLinks}>
      {links.map((action) => <button key={action.url} type="button" disabled={!runtime}
        onClick={() => runtime.openExternal(action)}>{action.label}<span aria-hidden="true"> ↗</span></button>)}
    </div>}
  </div>;
}

export function MatchRow({ match, runtime, copy = getMessages("ru") }) {
  return <details className="tg-match-row" data-match-key={match.key}>
    <summary>
      <span className="tg-match-meta"><span>{match.roundTitle}{match.bestOf ? ` · ${match.bestOf}` : ""}</span>
        <span className="tg-source-state">{matchStatusLabel(match, copy)}</span></span>
      <span className="tg-match-pair">
        <strong>{match.team1 || copy.unknownTeam} <span aria-hidden="true">—</span> {match.team2 || copy.unknownTeam}</strong>
        <MatchResult result={match.result} copy={copy} />
      </span>
      <span className="tg-match-meta"><span className="tg-match-date">{match.dateDisplay || copy.datePending}</span>
        <span className="tg-match-toggle"><span className="tg-when-closed">{copy.showDetails}</span><span className="tg-when-open">{copy.hideDetails}</span><span aria-hidden="true">⌄</span></span>
      </span>
    </summary>
    <MatchDetails match={match} runtime={runtime} copy={copy} />
  </details>;
}

export function MatchesSection({ model, runtime, copy = getMessages("ru") }) {
  return <section className="tg-section-content" aria-labelledby="matches-title">
    <h2 id="matches-title">{copy.matches}</h2>
    {model.matches.length ? <div className="tg-match-list">{model.matches.map((match) =>
      <MatchRow key={match.key} match={match} runtime={runtime} copy={copy} />)}</div>
      : <p className="tg-empty">{model.sections.find((section) => section.id === "matches")?.emptyText || copy.noMatches}</p>}
  </section>;
}
