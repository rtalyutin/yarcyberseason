import React from "react";
import { getMessages } from "./preferences.js";

// These renderers consume only L2 DTOs. They never read raw tournament JSON,
// infer a match state from the clock, or create another copy of a result.
export function RulesSection({ model, copy = getMessages("ru") }) {
  const stages = model.stages.filter((stage) => stage.rules.length || stage.notice);
  return <section className="tg-section-content" aria-labelledby="rules-title">
    <h2 id="rules-title">{copy.rules}</h2>
    {stages.length ? stages.map((stage) => <article className="tg-rule-stage" key={stage.id}>
      <h3>{stage.title}</h3>
      {stage.notice && <p>{stage.notice}</p>}
      {stage.rules.length > 0 && <dl className="tg-rule-list">{stage.rules.map((rule, index) => <div key={index}>
        {rule.label && <dt>{rule.label}</dt>}<dd>{rule.value}</dd>
      </div>)}</dl>}
    </article>) : <p className="tg-empty">{model.sections.find((section) => section.id === "rules")?.emptyText || copy.noRules}</p>}
    {model.registration.message && <p className="tg-empty">{model.registration.message}</p>}
    {model.rewards.referralContest && <article className="tg-rule-stage">
      <h3>{model.rewards.referralContest.title}</h3>
      {model.rewards.referralContest.headline && <p>{model.rewards.referralContest.headline}</p>}
      <ul>{(model.rewards.referralContest.rules || []).map((rule, index) => <li key={index}>{rule}</li>)}</ul>
    </article>}
  </section>;
}

export function ScheduleSection({ model, copy = getMessages("ru") }) {
  return <section className="tg-section-content" aria-labelledby="schedule-title">
    <h2 id="schedule-title">{copy.schedule}</h2>
    {model.timeline.length > 0 && <ol className="tg-timeline">{model.timeline.map((item, index) => <li key={index}>
      <div><strong>{item.label}</strong><span className="tg-source-state">{copy.timelineStates[item.state] || copy.unknownStatus}</span></div>
      <p>{item.date}</p>
    </li>)}</ol>}
    {!model.timeline.length && !model.matches.length && <p className="tg-empty">{copy.noSchedule}</p>}
    <h3>{copy.matchSchedule}</h3>
    {model.matches.length ? <ol className="tg-schedule-matches">{model.matches.map((match) => <li key={match.key} data-match-key={match.key}>
      <p className="tg-kicker">{match.roundTitle}{match.bestOf ? ` · ${match.bestOf}` : ""}</p>
      <h4>{match.team1 || copy.unknownTeam} <span aria-hidden="true">—</span> {match.team2 || copy.unknownTeam}</h4>
      <p className="tg-match-date">{match.dateDisplay || copy.datePending}</p>
      <p className="tg-source-state">{["completed", "walkover", "bye"].includes(match.status) && !match.result.confirmed
        ? copy.resultPending : copy.matchStates[match.status] || copy.unknownStatus}</p>
      {match.note && <p>{match.note}</p>}
    </li>)}</ol> : <p className="tg-empty">{copy.noMatches}</p>}
  </section>;
}
