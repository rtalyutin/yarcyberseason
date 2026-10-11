import { ArrowUpRight } from '@phosphor-icons/react';
import { currentTournament } from '../data/tournaments/index.js';
import { getConfirmedPartners, getMatchPartners, getPartnerScopeLabel, projectContent } from '../data/project-content.js';
import '../partners-content.css';

function PartnerCard({ partner }) {
  return <article className="partner-registry-card" data-partner-id={partner.id}>
    <span className="partner-registry-scope">{getPartnerScopeLabel(partner)}</span>
    {partner.logoUrl && <div className="partner-registry-logo"><img src={partner.logoUrl} alt={partner.name} loading="lazy" decoding="async" /></div>}
    <h3>{partner.name}</h3>
    {partner.description && <p>{partner.description}</p>}
    {partner.url && <a href={partner.url} target="_blank" rel="noreferrer">Страница партнёра <ArrowUpRight aria-hidden="true" /></a>}
  </article>;
}

export function PartnersPage({ tournament = currentTournament }) {
  const partners = getConfirmedPartners(tournament);
  const openingMatchId = partners.find((partner) => partner.scope === 'match')?.matchId;
  const opening = (tournament.stages || []).flatMap((stage) => stage.rounds ? stage.rounds.flatMap((round) => round.matches || []) : stage.matches || []).find((match) => match.id === openingMatchId);
  const finalAssigned = getMatchPartners(tournament, 'final-1').length > 0;
  const groups = [
    { scope: 'tournament', title: 'Партнёры турнира', description: 'Поддержка всего турнира.' },
    { scope: 'official', title: 'При поддержке', description: 'Официальная поддержка турнира.' },
    { scope: 'match', title: 'Матч открытия', description: opening?.team1 && opening?.team2 ? `Партнёры встречи ${opening.team1} — ${opening.team2}. Назначение привязано к этому матчу.` : 'Партнёры назначенного матча открытия.' },
    { scope: 'final', title: 'Партнёры финала', description: finalAssigned ? 'Партнёры опубликованного гранд-финала.' : 'Поддержка финала согласована. Назначение появится у конкретного матча после публикации его участников.' },
    { scope: 'unassigned', title: 'Матч пока не назначен', description: 'Участие подтверждено; конкретные встречи ещё не назначены.' },
  ];
  return <main className="partners-page">
    <section className="page-intro container" aria-labelledby="partners-title">
      <div><p className="eyebrow">Партнёры / {tournament.discipline}</p><h1 id="partners-title">Партнёры<br /><span>ЯрКиберСезона</span></h1></div>
      <p className="intro-copy">{tournament.title}<br />{tournament.dates?.display}<br />Подтверждённые партнёры и области поддержки.</p>
    </section>
    {groups.map((group) => {
      const entries = partners.filter((partner) => partner.scope === group.scope);
      if (!entries.length) return null;
      return <section className="container partner-registry-section" key={group.scope} aria-labelledby={`partners-${group.scope}`}>
        <div className="partner-registry-heading"><h2 id={`partners-${group.scope}`}>{group.title}</h2><p>{group.description}</p></div>
        <div className="partner-registry-grid">{entries.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}</div>
      </section>;
    })}
    {!partners.length && <section className="container partner-registry-section"><p>Партнёры этого турнира пока не опубликованы.</p></section>}
    <section className="container partner-contact">
      <div><p className="eyebrow">Новая коллаборация</p><h2>Ваш бренд<br /><span>в следующем матче</span></h2></div>
      <p>Если хотите поддержать турнир или трансляцию — напишите организатору. Обсудим формат участия.</p>
      <a className="button button--secondary" href={`mailto:${projectContent.contactEmail}?subject=Партнёрство%20с%20ЯрКиберСезоном`}>Связаться с проектом <ArrowUpRight aria-hidden="true" /></a>
    </section>
  </main>;
}
