import React from "react";
import { MatchRow } from "./MatchesSection.jsx";
import { getMessages } from "./preferences.js";

// Published placements are not standings calculated from matches or bracket seeds.
// The final uses the same normalized match as Matches and Playoffs.
export function ResultsSection({ model, runtime, copy = getMessages("ru") }) {
  if (!model.results) return null;
  const final = model.matches.find((match) => match.id === model.results.finalMatchId);
  const placements = [...(model.results.placements || [])].sort((a, b) => a.position - b.position);
  return <section className="tg-section-content tg-results" aria-labelledby="results-title">
    <h2 id="results-title">{copy.results}</h2>
    <h3>{copy.publishedPlaces}</h3>
    {placements.length ? <ol className="tg-placements">{placements.map((placement) =>
      <li key={placement.position} value={placement.position} data-position={placement.position}>
        <span className="tg-placement-number">{placement.position}<small>{copy.place}</small></span>
        <strong>{placement.team}</strong>
      </li>)}</ol> : <p className="tg-empty">{copy.noPlacements}</p>}
    <h3>{copy.finalMatch}</h3>
    {final && <MatchRow match={final} runtime={runtime} copy={copy} />}
  </section>;
}
