import React, { useState } from "react";
import rosters from "../data/rosters.js";
import { tournamentRoute } from "./contracts.js";
import { MatchRow } from "./MatchesSection.jsx";

function ProfileMark({ participant }) {
  const [failed, setFailed] = useState(false);
  return <div className="tg-profile-mark-frame">
    {participant.logoUrl && !failed ? <img src={participant.logoUrl} alt="" onError={() => setFailed(true)} />
      : <span aria-hidden="true">{participant.displayName.slice(0, 1).toUpperCase()}</span>}
  </div>;
}

const playerLabel = (member) => member.name.match(/«([^»]+)»/)?.[1] || member.name;

export function TeamProfile({ model, teamId, runtime, copy, navigate, headingRef }) {
  const participant = model.participants.find((item) => item.teamId === teamId);
  if (!participant) return null; // URL validation normally redirects unknown team IDs.
  const members = rosters.records.find((item) => item.tournamentId === model.tournament.id && item.teamId === teamId)?.members || [];
  const matches = model.matches.filter((match) => match.team1Id === teamId || match.team2Id === teamId);
  const back = () => navigate(tournamentRoute("participants", model.tournament.slug));
  const archived = ["archive", "completed"].includes(model.tournament.status);
  return <div className="tg-team-profile">
    <div className="tg-profile-left">
      <section className="tg-profile-hero" aria-labelledby="team-profile-title">
        <span className="tg-profile-fracture tg-profile-fracture-cyan" aria-hidden="true" />
        <span className="tg-profile-fracture tg-profile-fracture-red" aria-hidden="true" />
        <span className="tg-profile-fracture tg-profile-fracture-vertical" aria-hidden="true" />
        <p className="tg-profile-eyebrow">КОМАНДА&nbsp; / &nbsp;{model.tournament.discipline.toUpperCase()}</p>
        <ProfileMark participant={participant} />
        <h1 id="team-profile-title" className={participant.displayName.length > 19 ? "tg-profile-title-long" : undefined} ref={headingRef} tabIndex={-1}>{participant.displayName}</h1>
        <p className="tg-profile-status"><span aria-hidden="true">●</span> {archived ? copy.played : participant.status === "registered" ? copy.teamApplied : copy.unknownStatus}</p>
      </section>
      <div className="tg-profile-meta">
        <strong>{model.tournament.season.replace(/\s+(VER\.\d+)$/u, "  /  $1")}</strong>
        <span>{model.tournament.dates.display || copy.noDates}</span>
      </div>
      <div className="tg-profile-return"><button type="button" onClick={back}>←&nbsp; {copy.allTeams.toUpperCase()}</button></div>
    </div>
    <div className="tg-profile-right">
      <section className="tg-profile-roster" aria-labelledby="team-roster-title">
        <div className="tg-profile-section-title"><h2 id="team-roster-title">{copy.roster.toUpperCase()}</h2><span>{String(members.length).padStart(2, "0")}</span></div>
        {members.length ? <ol>{members.map((member, index) => <li key={`${index}-${member.name}`}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{playerLabel(member)}</strong>
        </li>)}</ol> : <p className="tg-profile-empty">{copy.noRoster}</p>}
      </section>
      <section className="tg-profile-matches" aria-labelledby="team-matches-title">
        <h2 id="team-matches-title">{copy.matches.toUpperCase()}</h2>
        {matches.length ? <div className="tg-match-list">{matches.map((match) =>
          <MatchRow key={match.key} match={match} runtime={runtime} copy={copy} />)}</div>
          : <div className="tg-profile-empty-match"><span aria-hidden="true" />
            <strong>{copy.noMatches}</strong><p>{archived ? copy.archiveMatchesMissing : copy.teamMatchesPending}</p>
          </div>}
      </section>
    </div>
  </div>;
}
