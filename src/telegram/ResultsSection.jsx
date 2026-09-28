import React from "react";
import { MatchRow } from "./MatchesSection.jsx";
import { getMessages } from "./preferences.js";
import { resultGroups } from "../lib/tournament.js";

// Published placements are not standings calculated from matches or bracket seeds.
// The final uses the same normalized match as Matches and Playoffs.
export function ResultsSection({ model, runtime, copy = getMessages("ru") }) {
  if (!model.results) return null;
  return <section className="tg-section-content tg-results" aria-labelledby="results-title">
    <h2 id="results-title">{copy.results}</h2>
    {resultGroups(model.results).map((group) => {
      const final = model.matches.find((match) => match.id === group.finalMatchId);
      const placements = [...(group.placements || [])].sort((a, b) => a.position - b.position);
      return <div className="tg-result-division" key={group.id || "overall"}>
        <h3>{group.title || copy.publishedPlaces}</h3>
        {placements.length ? <ol className="tg-placements">{placements.map((placement) =>
          <li key={placement.position} value={placement.position} data-position={placement.position}>
            <span className="tg-placement-number">{placement.position}<small>{copy.place}</small></span>
            <strong>{placement.team}</strong>
          </li>)}</ol> : <p className="tg-empty">{copy.noPlacements}</p>}
        {final && <><h4>{copy.finalMatch}</h4><MatchRow match={final} runtime={runtime} copy={copy} /></>}
      </div>;
    })}
  </section>;
}
