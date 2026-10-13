import { useEffect, useRef, useState } from 'react';
import { community } from '../data/community.js';
import { formatBuchholz, getPlayoffView } from '../lib/swiss-seeding.js';
import { getSwissRecordState } from '../lib/swiss-presentation.js';
import { TeamLink, MatchLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import '../swiss-playoffs.css';

function BracketLines({ canvas, rounds }) {
  const [paths, setPaths] = useState([]);
  useEffect(() => {
    const root = canvas.current;
    if (!root) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const cards = new Map([...root.querySelectorAll('[data-bracket-match]')].map((node) => [node.dataset.bracketMatch, node]));
      const next = [];
      for (const round of rounds) for (const match of round.matches) {
        for (const field of ['winnerTo', 'loserTo']) {
          const target = match[field];
          const from = cards.get(match.id), to = cards.get(target?.matchId);
          if (!from || !to) continue;
          const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
          const x1 = a.right - bounds.left, y1 = a.top + a.height / 2 - bounds.top;
          const x2 = b.left - bounds.left, y2 = b.top + b.height / 2 - bounds.top;
          const x = x2 > x1 ? (x1 + x2) / 2 : x1 + 12;
          const d = x2 > x1 ? `M${x1},${y1} H${x} V${y2} H${x2}`
            : `M${x1},${y1} H${x} V${b.top - bounds.top - 14} H${x2 - 12} V${y2} H${x2}`;
          next.push({ key: `${match.id}-${field}`, d, loser: field === 'loserTo' });
        }
      }
      setPaths(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    for (const card of root.querySelectorAll('[data-bracket-match]')) observer.observe(card);
    measure();
    return () => observer.disconnect();
  }, [canvas, rounds]);
  return <svg className="sp-lines" aria-hidden="true" focusable="false">{paths.map((path) => <path key={path.key} d={path.d} className={path.loser ? 'sp-line-loss' : undefined} />)}</svg>;
}

export function SwissPlayoffs({ stage, tournament }) {
  const view = getPlayoffView(tournament, stage);
  const canvas = useRef(null);
  const prefix = `${tournament.id}-${stage.id}`;
  const allMatches = view.rounds.flatMap((round) => round.matches);
  const byId = new Map(allMatches.map((match) => [match.id, match]));
  const jump = (id) => {
    const node = document.getElementById(`${prefix}-${id}`);
    node?.scrollIntoView({ block: 'nearest', inline: 'center' });
    node?.focus({ preventScroll: true });
  };
  const seedMatch = (seed) => allMatches.find((match) => [match.seed1, match.seed2].includes(seed));
  return <section className="swiss-playoffs" id={stage.id} aria-labelledby={`${prefix}-title`}>
    <header className="sp-intro">
      <div><p className="sp-eyebrow">{view.complete ? 'Swiss завершён' : 'Текущий посев · предварительно'}</p><h1 id={`${prefix}-title`}>Плей-офф</h1></div>
      <p className="sp-qualified"><strong>{view.qualifiedCount}<span> / {view.count}</span></strong>команд вышли в плей-офф</p>
    </header>
    <p className="sp-explanation">{view.complete
      ? 'Посев рассчитан по итогам Swiss. Пары матчей публикуются организатором.'
      : 'Если распределить места сейчас: ниже текущая восьмёрка и её пары. Состав и номера посева ещё могут измениться до завершения Swiss.'}</p>
    <div className="sp-table-scroll" role="region" aria-label="Текущий посев плей-офф" tabIndex={0}>
      <table className="sp-seeding">
        <caption>{view.complete ? 'Посев по итогам Swiss' : 'Текущий прогноз посева'}<span>Бухгольц обновляется после каждого подтверждённого результата</span></caption>
        <thead><tr><th scope="col">Посев</th><th scope="col">Команда</th><th scope="col">В : П</th><th scope="col">Бухгольц</th><th scope="col">Жребий</th><th scope="col">Статус</th><th scope="col">Пара в сетке</th></tr></thead>
        <tbody>{view.entrants.map((row) => {
          const match = seedMatch(row.seed);
          return <tr key={row.teamId} className={`sp-seed-row sp-seed-row--${getSwissRecordState(row.won, row.lost).kind}`}>
            <td className="sp-seed-number">{row.seed}</td>
            <th scope="row"><div className="sp-team"><TeamLogo team={community.getTeam(row.teamId)} logo={tournament.teamLogos?.[row.team]} /><TeamLink tournamentId={tournament.id} name={row.team} /></div></th>
            <td className="sp-numeric">{row.won} : {row.lost}</td><td className="sp-buchholz">{formatBuchholz(row.buchholz)}</td><td className="sp-numeric">{row.initialSeed ?? '—'}</td>
            <td className="sp-status">{row.qualified ? 'В плей-офф' : 'Прогноз'}</td>
            <td>{match && <button type="button" className="sp-jump" onClick={() => jump(match.id)}>{match.sourceLabel} · {match.seed1}–{match.seed2}<span aria-hidden="true"> ↗</span></button>}</td>
          </tr>;
        })}</tbody>
      </table>
      {!view.entrants.length && <p className="sp-empty">Для расчёта посева нужны участники и полный исходный жребий Swiss.</p>}
    </div>
    <p className="sp-tiebreak">Порядок: победы ↓, поражения ↑, Бухгольц ↓, номер первоначального жребия ↑. Бухгольц — сумма текущих разниц побед и поражений всех соперников по Swiss. Личная встреча не участвует в сравнении.</p>
    <div className="sp-bracket-heading"><div><h2>Путь к гранд-финалу</h2><p>14 матчей · BO3 · гранд-финал BO5 с 0:0, без переигровки</p></div><span>Сплошная линия — победитель<br />Пунктир — проигравший</span></div>
    <nav className="sp-bracket-nav" aria-label="Перейти к раунду">{[['upper', 'Четвертьфиналы'], ['lower', 'Нижняя сетка'], ['final', 'Гранд-финал']].map(([track, label]) => <button type="button" className="sp-jump" key={track} onClick={() => jump(view.rounds.find((round) => round.bracket === track)?.matches[0]?.id)}>{label} ↗</button>)}</nav>
    <p className="sp-scroll-hint">Сетку можно прокручивать по горизонтали. Нажмите номер матча, чтобы перейти к нему.</p>
    <div className="sp-bracket-scroll" role="region" aria-label="Сетка Double Elimination, горизонтальная прокрутка" tabIndex={0}>
      <div className="sp-canvas" ref={canvas}>
        <BracketLines canvas={canvas} rounds={view.rounds} />
        {['upper', 'lower', 'final'].map((track) => <section key={track} className={`sp-track sp-track--${track}`} aria-label={track === 'upper' ? 'Верхняя сетка' : track === 'lower' ? 'Нижняя сетка' : 'Гранд-финал'}>
          {view.rounds.filter((round) => round.bracket === track).map((round) => <div className="sp-round" key={round.id}>
            <h3>{round.label}</h3>
            <div className="sp-round-matches">{round.matches.map((match) => <article className="sp-match" id={`${prefix}-${match.id}`} data-bracket-match={match.id} tabIndex={-1} key={match.id} aria-label={`Матч ${match.sourceLabel}`}>
              <header><strong>{match.sourceLabel}</strong><span>{match.bestOf}</span></header>
              <ol>{match.slots.map((slot, index) => <li key={index} className={slot.projected && slot.team ? 'sp-slot-projected' : undefined}>
                {slot.seed && <span className="sp-slot-seed" aria-label={`Посев ${slot.seed}`}>{slot.seed}</span>}
                <div>{slot.team ? <><TeamLink tournamentId={tournament.id} name={slot.team} />{slot.projected && <small>{view.complete ? 'По итогам Swiss' : slot.qualified ? 'Вышли · посев предварительный' : 'Прогноз'}</small>}{slot.advanced && <small>{slot.label}</small>}</>
                  : slot.matchId ? <button type="button" className="sp-jump" onClick={() => jump(slot.matchId)}>{slot.label}</button> : <span>{slot.label}</span>}</div>
                {match.resultConfirmed === true && ['completed', 'walkover'].includes(match.status) && <b className="sp-match-score">{match[`score${index + 1}`] ?? '—'}</b>}
              </li>)}</ol>
              <footer>{['winnerTo', 'loserTo'].map((field) => match[field] && <button className={`sp-route ${field === 'loserTo' ? 'sp-route-loss' : ''}`} key={field} type="button" onClick={() => jump(match[field].matchId)}>{field === 'winnerTo' ? 'Победа' : 'Поражение'} → {byId.get(match[field].matchId)?.sourceLabel}</button>)}
                {round.bracket === 'lower' && <span>{match.id === 'lower-6' ? 'Поражение → 3-е место' : 'Поражение → вылет'}</span>}
                {round.bracket === 'final' && <span>Победитель — чемпион · проигравший — 2-е место</span>}
              </footer>
              {match.slots.every((slot) => slot.published) && <MatchLink tournamentId={tournament.id} matchId={match.id} />}
            </article>)}</div>
          </div>)}
        </section>)}
      </div>
    </div>
    <p className="sp-tiebreak">Перекрёстный переход: проигравший В6 попадает в Н3, проигравший В5 — в Н4. Это откладывает повторные встречи внутри плей-офф; встречи из Swiss могут повториться. Вылет — после второго поражения. Исключение: гранд-финал состоит из одной серии без сброса сетки; проигравший занимает 2-е место.</p>
  </section>;
}
