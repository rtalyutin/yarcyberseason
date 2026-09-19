import React, { useEffect, useRef, useState } from "react";
import { getMessages } from "./preferences.js";
import { MatchRow } from "./MatchesSection.jsx";

export function SwissTable({ table, copy = getMessages("ru") }) {
  const teamColumn = { key: "team", label: copy.team };
  const columns = table.columns.flatMap((column) => column.key === "position" ? [column, teamColumn] : [column]);
  if (!columns.some((column) => column.key === "team")) columns.unshift(teamColumn);
  return <div className="tg-table-scroll" role="region" aria-label={`${table.title}. ${copy.tableScroll}`} tabIndex={0}>
    <table className="tg-swiss-table">
      <caption>{table.title}</caption>
      <thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody>{table.rows.map((row, index) => <tr key={`${row.teamId || row.displayName}-${index}`}>
        {columns.map((column) => column.key === "team" ? <th scope="row" key="team">
          <span>{row.displayName}</span>
          {(row.seed !== null || row.placeLocked) && <span className="tg-standing-meta">
            {row.seed !== null && <span>{copy.seed} {row.seed}</span>}
            {row.placeLocked && <span>{copy.placeLocked}</span>}
          </span>}
        </th> : <td key={column.key}>{row.cells[column.key] ?? "—"}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function StageNotes({ stage, copy }) {
  return <>
    {stage.notice && <p className="tg-stage-notice">{stage.notice}</p>}
    {stage.rules.length > 0 && <details className="tg-stage-rules">
      <summary>{copy.stageRules}</summary>
      <dl className="tg-rule-list">{stage.rules.map((rule, index) => <div key={index}>
        {rule.label && <dt>{rule.label}</dt>}<dd>{rule.value}</dd>
      </div>)}</dl>
    </details>}
  </>;
}

// Positions come from the rendered cards, including expanded details. Edges are
// exclusively the adapter's explicit, visible transitions; no seeding inference.
function BracketLines({ stage, canvasRef, slotRefs }) {
  const [paths, setPaths] = useState([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage.edges.length) { setPaths([]); return; }
    let active = true;
    const measure = () => {
      if (!active) return;
      const origin = canvas.getBoundingClientRect();
      setPaths(stage.edges.flatMap((edge, index) => {
        const from = slotRefs.current.get(edge.fromSlotKey)?.getBoundingClientRect();
        const to = slotRefs.current.get(edge.toSlotKey)?.getBoundingClientRect();
        if (!from || !to) return [];
        const rightwards = to.left > from.left;
        const sameColumn = Math.abs(to.left - from.left) < 1;
        const x1 = (rightwards || sameColumn ? from.right : from.left) - origin.left;
        const x2 = (rightwards ? to.left : to.right) - origin.left;
        const y1 = from.top + from.height / 2 - origin.top;
        const y2 = to.top + to.height / 2 - origin.top;
        const bend = sameColumn ? Math.max(x1, x2) + 14 : (x1 + x2) / 2;
        return [{ ...edge, id: index, d: `M ${x1} ${y1} H ${bend} V ${y2} H ${x2}` }];
      }));
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(canvas);
    for (const slot of slotRefs.current.values()) observer?.observe(slot);
    window.addEventListener("resize", measure);
    canvas.addEventListener("toggle", measure, true);
    document.fonts?.ready.then(measure);
    return () => { active = false; observer?.disconnect(); window.removeEventListener("resize", measure); canvas.removeEventListener("toggle", measure, true); };
  }, [stage, canvasRef, slotRefs]);
  return <svg className="tg-bracket-lines" aria-hidden="true" focusable="false">
    {paths.map((path) => <path key={path.id} d={path.d} className={`tg-edge-${path.outcome}`}
      data-from-slot={path.fromSlotKey} data-to-slot={path.toSlotKey} />)}
  </svg>;
}

export function StageBracket({ stage, matches, runtime, copy = getMessages("ru") }) {
  const canvasRef = useRef(null);
  const slotRefs = useRef(new Map());
  const byMatch = new Map(matches.map((match) => [match.key, match]));
  const slotLabels = new Map(stage.rounds.flatMap((round) => round.slots.map((slot, index) =>
    [slot.slotKey, `${round.label} · ${copy.slot} ${index + 1}`])));
  const slotId = (key) => `tg-slot-${encodeURIComponent(stage.id)}-${encodeURIComponent(key)}`;
  const focusSlot = (key) => {
    const node = slotRefs.current.get(key);
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
    node?.focus({ preventScroll: true });
  };
  return <>
    {slotLabels.size > 1 && <p className="tg-source-state">{stage.edges.length ? copy.publishedEdges : copy.noEdges}</p>}
    {stage.edges.length > 0 && <div className="tg-bracket-legend">
      {["winner", "loser"].filter((outcome) => stage.edges.some((edge) => edge.outcome === outcome)).map((outcome) =>
        <span className={`tg-edge-${outcome}`} key={outcome}>{outcome === "winner" ? copy.winnerAdvance : copy.loserAdvance}</span>)}
    </div>}
    <div className="tg-bracket-scroll" role="region" aria-label={`${stage.title}. ${copy.bracketScroll}`} tabIndex={0}>
      <div className="tg-bracket-canvas" ref={canvasRef}>
        <BracketLines stage={stage} canvasRef={canvasRef} slotRefs={slotRefs} />
        <div className="tg-bracket-rounds" style={{ gridTemplateColumns: `repeat(${Math.max(1, stage.rounds.length)}, minmax(260px, 1fr))` }}>
          {stage.rounds.map((round) => <section className="tg-bracket-round" key={round.id} aria-label={round.label}>
            <h4>{round.label}</h4>
            {round.slots.length ? <ol>{round.slots.map((slot, index) => {
              const match = slot.kind === "match" ? byMatch.get(slot.matchKey) : null;
              return <li key={slot.slotKey} id={slotId(slot.slotKey)} data-slot-key={slot.slotKey} tabIndex={-1}
                ref={(node) => { if (node) slotRefs.current.set(slot.slotKey, node); else slotRefs.current.delete(slot.slotKey); }}>
                <span className="tg-slot-label">{copy.slot} {index + 1}</span>
                {match ? <MatchRow match={match} runtime={runtime} copy={copy} /> : <div className="tg-empty-slot">
                  <span>{copy.unknownTeam}</span><span>{copy.unknownTeam}</span><small>{copy.emptyPair}</small>
                </div>}
                {stage.edges.filter((edge) => edge.fromSlotKey === slot.slotKey && slotLabels.has(edge.toSlotKey)).map((edge, edgeIndex) =>
                  <button className={`tg-bracket-transition tg-edge-${edge.outcome}`} key={edgeIndex} type="button"
                    aria-controls={slotId(edge.toSlotKey)} onClick={() => focusSlot(edge.toSlotKey)}>
                    {edge.outcome === "winner" ? copy.winnerAdvance : copy.loserAdvance} → {slotLabels.get(edge.toSlotKey)}
                    {edge.targetSide !== null && ` · ${copy.targetSide} ${edge.targetSide}`}
                  </button>)}
              </li>;
            })}</ol> : <p className="tg-empty">{copy.roundEmpty}</p>}
          </section>)}
        </div>
      </div>
    </div>
  </>;
}

export function SwissSection({ model, runtime, copy = getMessages("ru") }) {
  const stages = model.stages.filter((stage) => stage.type === "swiss");
  return <section className="tg-section-content" aria-labelledby="swiss-title">
    <h2 id="swiss-title">{copy.swiss}</h2>
    {!stages.length && <p className="tg-empty">{copy.noSwissTable}</p>}
    {stages.map((stage) => <article className="tg-stage" key={stage.id}>
      <h3>{stage.title}</h3><StageNotes stage={stage} copy={copy} />
      {!stage.tables.length && <p className="tg-empty">{copy.noSwissTable}</p>}
      {stage.tables.map((table) => table.rows.length ? <SwissTable key={table.id} table={table} copy={copy} />
        : <div key={table.id}><h4>{table.title}</h4><p className="tg-empty">{copy.noSwissTable}</p></div>)}
      {stage.rounds.length > 0 &&
        <StageBracket stage={stage} matches={model.matches} runtime={runtime} copy={copy} />}
    </article>)}
  </section>;
}

export function PlayoffSection({ model, runtime, copy = getMessages("ru") }) {
  const stages = model.stages.filter((stage) => stage.type === "double_elimination" || stage.id === "playoffs");
  return <section className="tg-section-content" aria-labelledby="playoffs-title">
    <h2 id="playoffs-title">{copy.playoffs}</h2>
    {!stages.length && <p className="tg-empty">{copy.noPlayoffPairs}</p>}
    {stages.map((stage) => <article className="tg-stage" key={stage.id}>
      {stage.title !== copy.playoffs && <h3>{stage.title}</h3>}
      <StageNotes stage={stage} copy={copy} />
      {stage.availability === "empty" && <p className="tg-empty">{model.sections.find((section) => section.id === "playoffs")?.emptyText || copy.noPlayoffPairs}</p>}
      <StageBracket stage={stage} matches={model.matches} runtime={runtime} copy={copy} />
    </article>)}
  </section>;
}

export function StandingsSection({ model, copy = getMessages("ru") }) {
  return <section className="tg-section-content" aria-labelledby="standings-title">
    <h2 id="standings-title">{copy.standings}</h2>
    {model.stages.filter((stage) => stage.type === "round_robin").map((stage) => <article className="tg-stage" key={stage.id}>
      <h3>{stage.title}</h3><StageNotes stage={stage} copy={copy} />
      {stage.tables.map((table) => <SwissTable key={table.id} table={table} copy={copy} />)}
    </article>)}
  </section>;
}
