import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import organizers from "../data/organizers.json";
import "../about.css";

function OrganizerCard({ person }) {
  return <article className="about-person">
    <div className={`about-person-photo${person.photo ? "" : " about-person-photo--empty"}`}>
      {person.photo
        ? <img src={person.photo} alt={person.name} loading="lazy" decoding="async" />
        : <span aria-hidden="true">{person.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</span>}
    </div>
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
        <p className="about-kicker">ЯрКиберСезон / Команда проекта</p>
        <h1 id="about-title">Люди,<br />которые<br /><span>делают ЯКС.</span></h1>
        <p className="about-intro">За каждым турниром — люди, которые собирают команды, готовят матчи и держат связь с игроками. Здесь знакомимся с организаторами ЯрКиберСезона.</p>
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
        <span className="about-section-caption">Лица. Имена. Истории.</span>
      </div>
      {people.length ? <div className="about-people-grid">
        {people.map((person) => <OrganizerCard key={person.id} person={person} />)}
      </div> : <div className="about-team-soon">
        <span className="about-soon-mark" aria-hidden="true">ЯКС</span>
        <div><h3>Скоро познакомимся.</h3><p>Здесь появятся фотографии и истории организаторов проекта.</p></div>
      </div>}
    </section>

    <section className="about-contact container" aria-labelledby="about-contact-title">
      <div><p className="about-kicker">Прямая связь</p><h2 id="about-contact-title">Написать организаторам</h2></div>
      <a href="mailto:info@ycs.bar">info@ycs.bar <ArrowUpRight aria-hidden="true" /></a>
    </section>

    <section className="container legal-requisites about-requisites" id="requisites" aria-labelledby="about-requisites-title">
      <h2 id="about-requisites-title">Контакты и реквизиты</h2>
      <p>Общество с ограниченной ответственностью «ЯрКиберСезон»</p>
      <dl><dt>Юридический адрес</dt><dd>150040, Ярославская область, г. Ярославль, ул. Володарского, д. 64, кв. 37</dd>
      <dt>ИНН / КПП</dt><dd>7606143578 / 760601001</dd><dt>ОГРН</dt><dd>1257600007500</dd>
      <dt>Электронная почта</dt><dd><a href="mailto:info@ycs.bar">info@ycs.bar</a></dd></dl>
    </section>
  </main>;
}
