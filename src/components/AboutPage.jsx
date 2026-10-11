import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import organizers from "../data/organizers.json";
import { projectContent, projectLegal } from "../data/project-content.js";
import "../about.css";
import "../about-content.css";

function OrganizerCard({ person }) {
  return <article className={`about-person${person.photo ? '' : ' about-person--text'}`}>
    {person.photo && <div className="about-person-photo">
      <img src={person.photo} alt={person.name} loading="lazy" decoding="async" />
    </div>}
    <div className="about-person-copy">
      {person.role && <p className="about-kicker">{person.role}</p>}
      <h3>{person.name}</h3>
      {person.nickname && <p className="about-person-nick">{person.nickname}</p>}
      {person.bio && <p className="about-person-bio">{person.bio}</p>}
    </div>
  </article>;
}

export function AboutPage({ people = organizers }) {
  return <main className="about-page">
    <section className="about-hero container" aria-labelledby="about-title">
      <div className="about-hero-copy">
        <p className="about-kicker">ЯрКиберСезон / О проекте</p>
        <h1 id="about-title">Ярославль<br /><span>играет.</span></h1>
        <p className="about-intro">ЯрКиберСезон — проект киберспортивных турниров по Dota 2 и CS2 в Ярославле. Здесь собраны расписание, команды, турнирные сетки, результаты и трансляции.</p>
        <a className="about-jump" href="#organizers">Организаторы <ArrowDownRight aria-hidden="true" /></a>
      </div>
      <div className="about-manifesto" aria-hidden="true">
        <span className="about-manifesto-label">По другую сторону матча</span>
        <span className="about-manifesto-title">ЗА<br />КАДРОМ<span className="about-manifesto-dot">.</span></span>
        <span className="about-manifesto-bottom">В центре игры <ArrowUpRight /></span>
      </div>
    </section>

    <section className="about-organizers container" id="organizers" aria-labelledby="organizers-title">
      <div className="about-section-heading">
        <h2 id="organizers-title">Организаторы</h2>
        <span className="about-section-caption">Основатель проекта</span>
      </div>
      {people.length ? <div className="about-people-grid">
        {people.map((person) => <OrganizerCard key={person.id} person={person} />)}
      </div> : <p className="about-intro">Связь с организатором — по контактам проекта ниже.</p>}
    </section>

    <section className="about-contact container" aria-labelledby="about-contact-title">
      <div><p className="about-kicker">Прямая связь</p><h2 id="about-contact-title">Связь с проектом</h2></div>
      <div className="about-contact-links">
        <a href={`mailto:${projectContent.contactEmail}`}>{projectContent.contactEmail} <ArrowUpRight aria-hidden="true" /></a>
        <a href={projectContent.telegramUrl} target="_blank" rel="noreferrer">{projectContent.telegramLabel} <ArrowUpRight aria-hidden="true" /></a>
      </div>
    </section>

    <section className="container legal-requisites about-requisites" id="requisites" aria-labelledby="about-requisites-title">
      <h2 id="about-requisites-title">Контакты и реквизиты</h2>
      <p>{projectLegal.companyName}</p>
      <dl><dt>Юридический адрес</dt><dd>150040, Ярославская область, г. Ярославль, ул. Володарского, д. 64, кв. 37</dd>
      <dt>ИНН / КПП</dt><dd>7606143578 / 760601001</dd><dt>ОГРН</dt><dd>1257600007500</dd>
      <dt>Электронная почта</dt><dd><a href={`mailto:${projectContent.contactEmail}`}>{projectContent.contactEmail}</a></dd></dl>
    </section>
  </main>;
}
