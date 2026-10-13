import { Circle, ArrowRight } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { getSwissRecordState, sortSwissRows } from '../lib/swiss-presentation.js';
import { getSwissStandings, formatBuchholz } from '../lib/swiss-seeding.js';
import { TeamLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import '../dota-swiss.css';

const paths = [
  { round: 3, score: '3 : 0', art: 'emerald-portal.webp' },
  { round: 4, score: '3 : 1', art: 'blue-portal.webp' },
  { round: 5, score: '3 : 2', art: 'violet-portal.webp' },
];

export function SwissWins({ wins }) {
  if (wins === null) return <span aria-label="Число побед уточняется">—</span>;
  return <span className="ds-wins" aria-label={`Победы: ${wins} из 3`}>
    {[0, 1, 2].map((index) => <Circle key={index} aria-hidden="true" weight={index < wins ? 'fill' : 'regular'} className={index < wins ? 'is-filled' : undefined} />)}
  </span>;
}

export function DotaSwissTable({ group, tournament }) {
  const rows = sortSwissRows(group.rows || []);
  const hasBuchholz = rows.some((row) => Number.isSafeInteger(row.buchholz));
  return <div className="ds-table-frame">
    <table className={`ds-table${hasBuchholz ? ' ds-table--buchholz' : ''}`}>
      <caption>{group.title || 'Текущие результаты Swiss'}</caption>
      <thead><tr><th scope="col" className="ds-index">№</th><th scope="col">Команда</th><th scope="col">Счёт</th><th scope="col">Победы</th>{hasBuchholz && <th scope="col" className="ds-buchholz-heading">Бухгольц</th>}<th scope="col" className="ds-status-heading">Статус</th></tr></thead>
      <tbody>{rows.map((row, index) => {
        const state = getSwissRecordState(row.won, row.lost);
        const team = community.resolveTeam(tournament.id, row.team);
        return <tr key={row.teamId || row.team} className={`ds-row ds-row--${state.kind}`} data-record={state.score}>
          <td className="ds-index">{index + 1}</td>
          <th scope="row" className="ds-team"><div><TeamLogo team={team} logo={tournament.teamLogos?.[row.team]} /><TeamLink tournamentId={tournament.id} name={row.team} /></div></th>
          <td className="ds-score">{state.score}</td>
          <td className="ds-wins-cell"><SwissWins wins={state.wins} /></td>
          {hasBuchholz && <td className="ds-buchholz" aria-label={`Бухгольц: ${formatBuchholz(row.buchholz)}`}>{formatBuchholz(row.buchholz)}</td>}
          <td className="ds-status">{state.label}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export function DotaSwissStandings({ stage, tournament }) {
  const groups = (stage.ranking === 'buchholz' ? [{ id: 'current-swiss', title: 'Текущие результаты Swiss', rows: getSwissStandings(tournament, stage) }] : stage.groups || []).filter((group) => group.rows?.length > 0);
  const format = stage.rules?.find((rule) => rule.label === 'Формат матчей');
  return <section className="dota-swiss" id={stage.id} aria-labelledby="ds-title">
    <header className="ds-intro">
      <h1 id="ds-title">{stage.title}</h1>
      {stage.notice && <p>{stage.notice}</p>}
    </header>
    <ol className="ds-paths" aria-label="Выход в плей-офф: цвет строки зависит от тура">
      {paths.map(({ round, score, art }, index) => <li key={round} className={`ds-path ds-path--${round}`}>
        <img className="ds-portal" src={`/assets/swiss/${art}`} alt="" width="256" height="384" />
        <div className="ds-path-copy"><span>{round}-й тур</span><strong>{score}</strong><p>Выход в плей-офф<br />в {round}-м туре</p></div>
        {index < 2 && <ArrowRight className="ds-path-arrow" aria-hidden="true" />}
      </li>)}
    </ol>
    <div className="ds-tables">
      {groups.length ? groups.map((group) => <DotaSwissTable key={group.id} group={group} tournament={tournament} />) : <div className="ds-empty" role="status"><h2>Таблица ещё не опубликована</h2><p>Результаты появятся после подтверждения организатором.</p></div>}
    </div>
    <footer className="ds-footnote"><p>Кружки показывают число побед. Три поражения — вылет.</p>{format && <p>{format.value}</p>}<p>Учтены только подтверждённые результаты.</p>{stage.ranking === 'buchholz' && <p>При равном счёте: Бухгольц по убыванию, затем первоначальный жребий по возрастанию. Бухгольц — сумма текущих разниц побед и поражений соперников.</p>}</footer>
  </section>;
}
