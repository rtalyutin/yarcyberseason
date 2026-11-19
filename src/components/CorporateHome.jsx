import { useRef } from 'react';
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { projectContent } from '../data/project-content.js';
import { getTournament } from '../data/tournaments/index.js';
import { getTournamentModel, getTournamentOutcome, participantCount } from '../lib/tournament.js';
import { InternalLink } from './CommunityLinks.jsx';

// Editorial selection. Dates, participants, fixtures and outcomes stay with the tournament.
const cases = [
  { slug: 'cs2-lce-november-2026', title: 'Лига цифровой экономики' },
  { slug: 'dota2-autumn-2026', title: 'ЯрКиберСезон · Осень' },
];
const pluralRules = new Intl.PluralRules('ru');
const teamForms = { one: 'команда', few: 'команды', many: 'команд' };
const matchForms = { one: 'матч', few: 'матча', many: 'матчей' };

function quantity(value, forms) {
  return `${value} ${forms[pluralRules.select(value)]}`;
}

function TournamentCase({ tournament, title }) {
  const root = `/tournaments/${tournament.slug}`;
  const matches = getTournamentModel(tournament).matches;
  const final = getTournamentOutcome(tournament)?.final;
  return <li className="operator-case">
    <InternalLink className="operator-case-link" href={root}>
      <span className="operator-date">{tournament.dates.display}</span>
      <strong>{title}</strong>
      <span className="operator-game">{tournament.discipline === 'Counter-Strike 2' ? 'CS2' : tournament.discipline}</span>
      <span className="operator-count">{quantity(participantCount(tournament), teamForms)} · {quantity(matches.length, matchForms)}</span>
      <ArrowUpRight aria-hidden="true" />
    </InternalLink>
    {final && <details className="operator-case-detail">
      <summary>Результат финала</summary>
      <InternalLink href={`${root}/matches/${final.id}`}>{final.team1} <b aria-label={`Счёт серии ${final.score1}:${final.score2}`}>{final.score1}:{final.score2}</b> {final.team2} · Страница матча</InternalLink>
    </details>}
  </li>;
}

export function CorporateHome({ children }) {
  const dialog = useRef(null);
  function openContact(event) {
    if (!dialog.current?.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.current.showModal();
  }

  return <main className="operator-home">
    <section className="operator-hero" aria-labelledby="home-title">
      <div className="operator-copy">
        <p className="operator-kicker">Турнирный оператор · Ярославль</p>
        <h1 id="home-title">Проводим<br />турниры<span>.</span></h1>
        <p className="operator-intro">Организуем турниры по Dota 2 и CS2 для компаний и сообщества. Собираем команды, составляем расписание и ведём трансляции.</p>
        <div className="operator-actions">
          <a className="operator-primary" href={projectContent.contactTelegramUrl} onClick={openContact} aria-haspopup="dialog">Обсудить свой турнир</a>
          <InternalLink className="operator-link" href="/tournaments">Смотреть турниры</InternalLink>
        </div>
      </div>
      <img className="operator-stage" src="/assets/corporate-tournament-stage.webp" width="931" height="576"
        alt="Турнир в разрезе. Команды за игровыми столами, комментаторы у микрофонов и режиссёр за пультом трансляции." fetchPriority="high" />
    </section>
    <div className="operator-announcements">
      <h2>Анонсы следующих турниров</h2>
      <a href={projectContent.telegramUrl} target="_blank" rel="noopener noreferrer">Канал ЯКС в Telegram <ArrowUpRight aria-hidden="true" /></a>
    </div>
    <section className="operator-cases" aria-labelledby="operator-cases-title">
      <header><h2 id="operator-cases-title">Проведённые турниры</h2><InternalLink className="operator-link" href="/results">Весь архив</InternalLink></header>
      <ul>{cases.map(({ slug, title }) => <TournamentCase key={slug} title={title} tournament={getTournament(slug)} />)}</ul>
    </section>
    <div className="atlas-home operator-partners">{children}</div>
    <dialog className="operator-contact" ref={dialog} aria-labelledby="operator-contact-title">
      <form method="dialog"><button aria-label="Закрыть" type="submit"><X size={22} aria-hidden="true" /></button></form>
      <p className="operator-kicker">ЯрКиберСезон</p>
      <h2 id="operator-contact-title">Обсудить свой турнир</h2>
      <p>Роман Талютин, организатор ЯКС. Расскажите, для кого вы хотите провести турнир, какую игру выбрали и сколько команд планируете собрать.</p>
      <div className="operator-actions"><a className="operator-primary" href={projectContent.contactTelegramUrl} target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
        <a className="operator-link" href={`mailto:${projectContent.contactEmail}`}>{projectContent.contactEmail}</a></div>
      <p className="operator-sponsors">Для спонсоров — <InternalLink href="/partners">партнёрство с ЯКС</InternalLink>.</p>
    </dialog>
  </main>;
}
