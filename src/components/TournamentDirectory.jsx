import { useEffect, useState } from 'react';
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { tournaments } from '../data/tournaments/index.js';
import { getChampionLabels, getTournamentModel, isArchive, participantCount } from '../lib/tournament.js';
import { filterTournamentDirectory } from '../lib/site-navigation.js';
import { InternalLink } from './CommunityLinks.jsx';

const emptyFilter = { query: '', discipline: 'all', status: 'all' };

export function TournamentDirectory({ archivedOnly = false }) {
  const [filters, setFilters] = useState(emptyFilter);
  const source = archivedOnly ? tournaments.filter(isArchive) : tournaments;
  const disciplines = [...new Set(source.map((item) => item.discipline))];
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setFilters({ query: params.get('q') || '', discipline: disciplines.includes(params.get('game')) ? params.get('game') : 'all', status: ['active', 'completed'].includes(params.get('status')) ? params.get('status') : 'all' });
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [archivedOnly]);
  const update = (patch, push = true) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const url = new URL(window.location.href);
    for (const [key, value] of [['q', next.query], ['game', next.discipline], ['status', next.status]]) {
      if (value && value !== 'all') url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history[push ? 'pushState' : 'replaceState']({}, '', `${url.pathname}${url.search}`);
  };
  const listed = filterTournamentDirectory(source, { ...filters, status: archivedOnly ? 'completed' : filters.status });
  return <main className="tournament-directory">
    <header className="directory-heading">
      <p className="directory-kicker">ЯрКиберСезон / {archivedOnly ? 'Архив турниров' : 'Все сезоны'}</p>
      <h1>{archivedOnly ? <>Каждый турнир<br />остаётся в сезоне</> : 'Турниры'}</h1>
      <p>{archivedOnly ? 'Результаты, команды и история матчей — в одном месте.' : 'Выберите турнир. Матчи, команды, сетка и итоги — внутри.'}</p>
      {archivedOnly && <InternalLink className="directory-back" href="/tournaments">Все турниры <ArrowRight aria-hidden="true" /></InternalLink>}
    </header>
    <section className="directory-workspace" aria-label="Каталог турниров">
      <div className="directory-tools">
        <label className="directory-search"><span>Поиск турнира</span><div><MagnifyingGlass aria-hidden="true" /><input type="search" value={filters.query} onChange={(event) => update({ query: event.target.value }, false)} placeholder="Название, сезон или дата" /></div></label>
        <label><span>Дисциплина</span><select value={filters.discipline} onChange={(event) => update({ discipline: event.target.value })}><option value="all">Все дисциплины</option>{disciplines.map((value) => <option key={value}>{value}</option>)}</select></label>
        {!archivedOnly && <label><span>Статус</span><select value={filters.status} onChange={(event) => update({ status: event.target.value })}><option value="all">Все турниры</option><option value="active">Текущие и будущие</option><option value="completed">Завершённые</option></select></label>}
      </div>
      <p className="directory-count" role="status">Турниров: {listed.length} из {source.length}</p>
      <div className="directory-list">{listed.map((tournament) => {
        const root = `/tournaments/${tournament.slug}`;
        const model = getTournamentModel(tournament);
        return <article className="directory-card" key={tournament.id}>
          <div className="directory-identity"><img src={tournament.discipline === 'Dota 2' ? '/assets/games/dota2.svg' : '/assets/games/counterstrike.svg'} alt="" /><span>{tournament.discipline}</span><span className="directory-status">{tournament.statusLabel || (isArchive(tournament) ? 'Архив' : 'Данные турнира')}</span></div>
          <div className="directory-card-content"><div><h2><InternalLink href={root}>{tournament.title}<ArrowRight aria-hidden="true" /></InternalLink></h2><p className="directory-season">{tournament.season}</p><p>{tournament.dates?.display || 'Даты уточняются'}</p><div className="directory-facts">{tournament.participants && <span>{participantCount(tournament)} команд</span>}<span>{model.matches.length ? `Матчей: ${model.matches.length}` : 'Расписание ещё не опубликовано'}</span></div></div>
          <div className="directory-outcome">{getChampionLabels(tournament).map((label) => <p key={label}>{label}</p>)}<InternalLink className={archivedOnly ? 'result-card' : 'directory-open'} href={root}>Открыть турнир <ArrowRight aria-hidden="true" /></InternalLink></div></div>
          <nav className="directory-shortcuts" aria-label={`Разделы ${tournament.title} ${tournament.season || tournament.dates?.display || ''}`}><InternalLink href={`${root}?section=matches&phase=all`}>Матчи</InternalLink>{tournament.participants && <InternalLink href={`${root}?section=participants`}>Команды</InternalLink>}{model.sections.some((section) => section.id === 'results') && <InternalLink href={`${root}?section=results`}>Итоги</InternalLink>}{tournament.discipline === 'Dota 2' && <InternalLink href={`${root}?section=mvp`}>MVP</InternalLink>}</nav>
        </article>;
      })}</div>
      {!listed.length && <div className="directory-empty"><h2>{filters.status === 'active' && !filters.query ? 'Новых турниров пока не объявлено' : 'Турниры не найдены'}</h2><p>В каталоге остаются завершённые сезоны с результатами и командами.</p><button type="button" onClick={() => update(emptyFilter)}>Сбросить фильтры</button></div>}
    </section>
  </main>;
}
