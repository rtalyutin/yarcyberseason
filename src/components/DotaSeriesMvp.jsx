import { Crown } from '@phosphor-icons/react';
import { formatMvpScore } from '../lib/dota-mvp.js';
import { DotaHero } from './DotaHero.jsx';

const scoreText = (exact) => formatMvpScore(exact).replace('.', ',');

/** Stable series award; intentionally receives no selected-map state. */
export function DotaSeriesMvp({ mvp, match }) {
  const leaders = mvp.leaders, series = match.bestOf !== 'BO1';
  const noPlay = mvp.status === 'not-played';
  const title = leaders.length && mvp.preliminary ? 'Предварительный лидер' : series ? 'MVP серии' : 'MVP матча';
  return <section className="mc-series-award" aria-labelledby="mc-series-mvp-title">
    <div className="mc-series-award-heading">
      <span className="mc-series-emblem" aria-hidden="true"><Crown weight="duotone" /></span>
      <div><h2 id="mc-series-mvp-title">{title}{leaders.length > 1 && ' · равные баллы'}</h2>
        <p>{series ? 'Сумма баллов по сыгранным картам' : 'По статистике сыгранной карты'}{mvp.countedMapNumbers.length > 0 && ` · Учтены: ${mvp.countedMapNumbers.join(', ')}`}</p>
      </div>
    </div>
    {leaders.length ? <div className="mc-series-leaders">{leaders.map((player) => <article className="mc-series-leader" key={player.accountId}>
      <div className="mc-series-identity"><h3>{player.nickname}</h3><p>{player.teamNames.join(' / ')} · Карт: {player.countedMaps}</p></div>
      <p className="mc-series-total"><strong>{scoreText(player.ratingExact)}</strong><span>Баллы {series ? 'за серию' : 'за матч'}</span></p>
      <ol className="mc-series-picks" aria-label={`Пики и вклад игрока ${player.nickname}`}>
        {player.records.map((record) => <li key={record.matchId}>
          <span className="mc-series-map-label">Карта {record.mapNumber}</span>
          <DotaHero heroId={record.heroId} className="mc-series-pick" />
          <span className="mc-series-contribution">{scoreText(record.scoreExact)} <small>балла{record.estimated && ' · расчётная оценка'}</small></span>
        </li>)}
      </ol>
    </article>)}</div> : <div className="mc-series-empty" role="status"><h3>{noPlay ? 'Без сыгранных карт' : mvp.availability === 'loading' ? 'Загружаем статистику…' : 'MVP ещё не определён'}</h3><p>{noPlay ? 'За технический результат MVP не начисляется.' : 'Появится после подтверждения статистики игроков.'}</p></div>}
    {leaders.length > 1 && <p className="mc-series-note">Баллы равны точно. Единственный MVP не выбран.</p>}
    {mvp.pendingMapNumbers.length > 0 && <p className="mc-notice">Ожидаем статистику карт: {mvp.pendingMapNumbers.join(', ')}. {leaders.length > 0 && 'Показана сумма только по доступным картам.'}</p>}
    {mvp.estimatedMapIds.length > 0 && <p className="mc-notice">В сумме есть расчётные оценки по принятому правилу турнира. После получения статистики они заменятся фактическими баллами.</p>}
    {mvp.correctionPendingMatchIds.length > 0 && <p className="mc-notice">Статистика перепроверяется. Показан предыдущий подтверждённый расчёт.</p>}
    {mvp.stale && leaders.length > 0 && <p className="mc-notice">Обновление задерживается. Показаны последние подтверждённые данные.</p>}
    {mvp.availability === 'unavailable' && !leaders.length && !noPlay && <p className="mc-notice">Не удалось загрузить статистику. Повторим автоматически.</p>}
    {!noPlay && match.status !== 'completed' && leaders.length > 0 && <p className="mc-series-note">Серия ещё не завершена. Лидер может измениться.</p>}
  </section>;
}
