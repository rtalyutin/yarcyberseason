import { ArrowRight, ArrowUpRight, EnvelopeSimple, TelegramLogo, TwitchLogo } from '@phosphor-icons/react';
import { currentTournament, getTournament } from '../data/tournaments/index.js';
import { getConfirmedPartners, getMatchPartners, getPartnerScopeLabel, projectContent } from '../data/project-content.js';
import { audienceSourceIsStale, partnershipMailto, teamParticipationCount, useAudienceSnapshot, usePartnerProject } from '../lib/audience-client.js';
import { partnerDisciplineVisuals, partnerLogo } from '../data/partner-visuals.js';
import twitchAnalytics from '../data/twitch-analytics.json';
import telegramAnalytics from '../data/telegram-analytics.json';
import '../partners-content.css';

const number = (value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value) : null;
const date = (value, time = false) => value ? new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Moscow',
  ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
}).format(new Date(value)) : null;

function Metric({ label, value, detail }) {
  const formatted = number(value);
  return <div className="partner-metric">
    <dt>{label}</dt><dd className={formatted === null ? 'partner-metric-empty' : undefined}>{formatted ?? 'Нет данных'}</dd>
    {detail && <small>{detail}</small>}
  </div>;
}

function TelegramAudience() {
  const { overview, totals, period, importedOn, channelUrl } = telegramAnalytics;
  return <article className="partner-audience-source" data-audience-platform="telegram">
    <div className="partner-source-heading"><TelegramLogo size={28} aria-hidden="true" /><h3>Telegram @dota2yar</h3><span className="partner-source-status">Выгрузка Telegram · обновлено {date(importedOn)}</span></div>
    <p className="partner-source-date">По сводке выгрузки</p>
    <dl className="partner-metrics">
      <Metric label="Подписчики канала" value={overview.followers} detail={`На ${date(importedOn)}`} />
      <Metric label="Просмотры на пост" value={overview.viewsPerPost} />
      <Metric label="Реакции на пост" value={overview.reactionsPerPost} />
      <Metric label="Пересылки на пост" value={overview.sharesPerPost} />
    </dl>
    <p className="partner-source-note">Период показателей на пост в сводке не указан.</p>
    <h4>Итоги по дням</h4>
    <p className="partner-source-date">{date(period.from)} — {date(period.to)}</p>
    <dl className="partner-metrics">
      <Metric label="Просмотры публикаций" value={totals.views} detail="За указанный период" />
      <Metric label="Пересылки публикаций" value={totals.shares} detail="За указанный период" />
      <Metric label="Подписались" value={totals.joined} />
      <Metric label="Отписались" value={totals.left} />
    </dl>
    <details className="partner-source-method">
      <summary>Источник и методика</summary>
      <div>
        <a href={channelUrl} target="_blank" rel="noopener noreferrer">Открыть канал <ArrowUpRight aria-hidden="true" /></a>
        <p>Источник — выгрузка аналитики Telegram, предоставленная организатором {date(importedOn)}. Последний день — неполный на момент выгрузки.</p>
        <p>Подписчики и показатели на пост взяты из сводки Overview. Период сводки не указан, поэтому показатели на пост не считаются средними за весь период дневной статистики.</p>
        <p>Просмотры и пересылки суммируются по дням из Interactions; подписки и отписки — из Followers. Это количество просмотров и действий, а не уникальный охват. Размер канала по дням не суммируется.</p>
      </div>
    </details>
  </article>;
}

function TwitchAudience({ source, availability }) {
  const { totals, final, period, importedOn, channelUrl } = twitchAnalytics;
  const stale = audienceSourceIsStale(source, availability);
  return <article className="partner-audience-source" data-audience-platform="twitch">
    <div className="partner-source-heading"><TwitchLogo size={28} aria-hidden="true" /><h3>Twitch YarCyberSeason</h3><span className="partner-source-status">Выгрузка Twitch · обновлено {date(importedOn)}</span></div>
    <p className="partner-source-date">{date(period.from)} — {date(period.to)} · {number(totals.broadcastDays)} дня с эфиром</p>
    <dl className="partner-metrics">
      <Metric label="Просмотры прямых трансляций" value={totals.liveViews} detail="За указанный период" />
      <Metric label="Зритель-часы" value={totals.minutesWatched / 60} />
      <Metric label="Часы эфира" value={totals.minutesStreamed / 60} />
      <Metric label="Новые фолловеры" value={totals.newFollowers} detail="За период, не общий размер канала" />
      <Metric label="Средний онлайн" value={totals.minutesWatched / totals.minutesStreamed} detail="С учётом длительности эфиров" />
      <Metric label="Пиковый онлайн" value={totals.peakViewers} />
    </dl>
    <h4>Гранд-финал · {date(final.date)}</h4>
    <dl className="partner-metrics">
      <Metric label="Просмотры трансляции" value={final.liveViews} />
      <Metric label="Уникальные зрители за день" value={final.uniqueViewers} />
      <Metric label="Средний онлайн" value={final.averageViewers} />
      <Metric label="Пиковый онлайн" value={final.peakViewers} />
    </dl>
    <p className="partner-source-note">{Math.floor(final.minutesStreamed / 60)} ч {final.minutesStreamed % 60} мин эфира · {number(final.chatMessages)} сообщения в чате · {number(final.newFollowers)} новых фолловера.</p>
    {source?.metrics.followers != null && <>
      <dl className="partner-metrics partner-metrics--single"><Metric label="Подписчики канала (followers)" value={source.metrics.followers} /></dl>
      <p className="partner-source-date">{stale ? 'Последний доступный срез' : 'Внешний источник'} · получено {date(source.fetchedAt, true)} МСК</p>
    </>}
    <details className="partner-source-method">
      <summary>Источник и методика</summary>
      <div>
        <a href={channelUrl} target="_blank" rel="noopener noreferrer">Открыть канал <ArrowUpRight aria-hidden="true" /></a>
        <p>Источник — дневная выгрузка аналитики Twitch, предоставленная организатором {date(importedOn)}. Период и дата финала соответствуют датам в CSV. 26 октября — неполный день на момент выгрузки.</p>
        <p>Просмотры, минуты просмотра и эфира, новые фолловеры суммируются по дням. Зритель-часы и часы эфира — минуты, делённые на 60. Средний онлайн за период — все минуты просмотра, делённые на все минуты эфира; пик — максимум дневных пиков.</p>
        <p>Просмотры включают повторные заходы. Дневных уникальных зрителей не складываем: {number(final.uniqueViewers)} — значение только за {date(final.date)}. Итоги финала уже входят в общий период. Статистика других Twitch-каналов в выгрузку не входит.</p>
        <p>За период: {number(totals.chatMessages)} сообщений в чате, {number(totals.clipsCreated)} созданных клипов и {number(totals.clipViews)} просмотров клипов. Финал: {number(final.chatParticipants)} участника чата.</p>
        {source?.method && <p>Текущие фолловеры: {source.method}</p>}
      </div>
    </details>
  </article>;
}

function AudienceSource({ source, availability, platform }) {
  const telegram = platform === 'telegram';
  const metrics = source?.metrics || {};
  const unavailable = !source || ['unavailable', 'not_configured'].includes(source.status);
  const stale = audienceSourceIsStale(source, availability);
  const loading = !source && availability === 'loading';
  const status = loading ? 'Загрузка' : stale ? 'Последний доступный срез' : unavailable ? 'Источник пока недоступен' : 'Внешний источник';
  const name = source?.name || (telegram ? 'Telegram @dota2yar' : 'Twitch YarCyberSeason');
  const url = source?.url || (telegram ? projectContent.telegramUrl : 'https://www.twitch.tv/yarcyberseason');
  return <article className="partner-audience-source" data-audience-platform={platform}>
    <div className="partner-source-heading">{telegram ? <TelegramLogo size={28} aria-hidden="true" /> : <TwitchLogo size={28} aria-hidden="true" />}<h3>{name}</h3><span className={`partner-source-status${stale ? ' is-stale' : ''}`}>{status}</span></div>
    <dl className={`partner-metrics${telegram ? '' : ' partner-metrics--single'}`}>
      <Metric label={telegram ? 'Подписчики канала' : 'Подписчики канала (followers)'} value={metrics.followers} />
      {telegram && <>
        <Metric label="Медиана просмотров поста" value={metrics.medianViews} detail="По публикациям выборки" />
        <Metric label="Реакции на публикации" value={metrics.totalReactions} detail="Сумма по полной выборке" />
        <Metric label="Пересылки публикаций" value={metrics.totalForwards} detail="Сумма по полной выборке" />
      </>}
    </dl>
    {unavailable && !loading && <p className="partner-source-note">{telegram
      ? 'Статистика появится после успешного получения данных канала.'
      : 'Открытый источник статистики пока не подключён. Исторические зритель-часы и онлайн не подтверждены.'}</p>}
    {stale && <p className="partner-source-note">Обновление задерживается. Показан последний успешно полученный срез.</p>}
    <p className="partner-source-date">{source?.fetchedAt ? `Получено ${date(source.fetchedAt, true)} МСК` : 'Дата получения ещё не установлена'}</p>
    <details className="partner-source-method">
      <summary>Источник и методика</summary>
      <div>
        <a href={url} target="_blank" rel="noopener noreferrer">{source ? 'Открыть источник' : 'Открыть канал'} <ArrowUpRight aria-hidden="true" /></a>
        {source?.method && <p>{source.method}</p>}
        {source?.period && <p>Публикации: {date(source.period.from)} — {date(source.period.to)}. Даты по Москве.</p>}
        {metrics.sampleSize != null && <p>В выборке: {number(metrics.sampleSize)} публикаций. Сумма просмотров: {number(metrics.totalViews) ?? 'нет данных'}.</p>}
        {!source && <p>Числа публикуются после проверенного получения данных. Отсутствующие значения не заменяются нулём.</p>}
        {!!source?.sample?.length && <ol className="partner-source-sample">{source.sample.map((post) => <li key={post.id}>
          <a href={post.url} target="_blank" rel="noopener noreferrer">Пост {post.id} <ArrowUpRight aria-hidden="true" /></a>
          <span>{date(post.publishedAt)} · {number(post.views) ?? 'неизвестно'} просмотров</span>
        </li>)}</ol>}
      </div>
    </details>
  </article>;
}

function PartnerCard({ partner }) {
  const logo = partnerLogo(partner);
  const url = partner.url || partner.homeUrl;
  return <article className="partner-registry-card" data-partner-id={partner.id}>
    <span className="partner-registry-scope">{getPartnerScopeLabel(partner)}</span>
    {logo ? <><h3 className="partner-sr-only">{partner.name}</h3><div className={`partner-registry-logo${logo.inverse ? ' partner-registry-logo--inverse' : ''}`}><img src={logo.src} alt={partner.name} loading="lazy" decoding="async" /></div></> : <h3>{partner.name}</h3>}
    {partner.description && <p>{partner.description}</p>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer">Страница партнёра <ArrowUpRight aria-hidden="true" /></a>}
  </article>;
}

function DisciplineTile({ initiative }) {
  const visual = partnerDisciplineVisuals[initiative.id];
  return <a className="partner-discipline-tile" data-discipline={initiative.id}
    href={partnershipMailto(projectContent.contactEmail, initiative)}
    aria-label={`Обсудить поддержку: ${initiative.discipline}`}>
    {visual && <img className="partner-discipline-art" src={visual.art} alt="" aria-hidden="true" decoding="async" />}
    <div className="partner-discipline-content">
      {visual ? <img className="partner-discipline-logo" src={visual.logo} alt={initiative.discipline} decoding="async" /> : <strong>{initiative.discipline}</strong>}
      <span className="partner-discipline-count">{initiative.tournaments} {initiative.tournaments === 1 ? 'турнир' : 'турнира'}</span>
      <span className="partner-discipline-action">Обсудить поддержку <ArrowRight size={18} aria-hidden="true" /></span>
    </div>
  </a>;
}

function PartnerStrip({ partners }) {
  return <div className="partner-quick-brands"><span>С нами в текущем турнире</span>
    <div>{partners.map((partner) => {
      const logo = partnerLogo(partner);
      if (!logo) return null;
      return <a key={partner.id} href="#partners-registry" aria-label={`${partner.name}: вклад в турнир`}>
        <img src={logo.src} alt={partner.name} decoding="async" />
      </a>;
    })}</div>
  </div>;
}

function SectionHeading({ number: index, eyebrow, id, title, children }) {
  return <div className="partner-section-heading">
    <div><p className="eyebrow">{index} / {eyebrow}</p><h2 id={id}>{title}</h2></div>
    {children && <div className="partner-section-copy">{children}</div>}
  </div>;
}

function ProjectEmpty({ availability }) {
  return <p className="partner-source-note">{availability === 'loading' ? 'Загружаем данные проекта…' : 'Данные проекта временно недоступны. Попробуйте обновить страницу.'}</p>;
}

export function PartnersPage({ tournament = currentTournament }) {
  const { snapshot, availability: audienceAvailability } = useAudienceSnapshot();
  const { project, availability: projectAvailability } = usePartnerProject();
  const partners = getConfirmedPartners(tournament);
  const finalAssigned = getMatchPartners(tournament, 'final-1').length > 0;
  const groups = [
    { scope: 'tournament', title: 'Партнёры турнира', description: 'Поддержка всего турнира.' },
    { scope: 'official', title: 'При поддержке', description: 'Официальная поддержка турнира.' },
    { scope: 'match', title: 'Партнёры матчей', description: 'Поддержка привязана к конкретной встрече; назначение указано в карточке партнёра.' },
    { scope: 'final', title: 'Партнёры финала', description: finalAssigned ? 'Партнёры опубликованного гранд-финала.' : 'Поддержка финала согласована. Назначение появится у конкретного матча после публикации его участников.' },
    { scope: 'unassigned', title: 'Матч пока не назначен', description: 'Участие подтверждено; конкретные встречи ещё не назначены.' },
  ];
  const registryGroup = (group) => {
    const entries = partners.filter((partner) => partner.scope === group.scope);
    if (!entries.length) return null;
    return <div className="partner-registry-group" key={group.scope}>
      <div className="partner-registry-heading"><h3>{group.title}</h3><p>{group.description}</p></div>
      <div className="partner-registry-grid">{entries.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}</div>
    </div>;
  };
  const cs2 = getTournament('cs2-august-2026');
  const final = cs2?.stages?.flatMap((stage) => stage.rounds ? stage.rounds.flatMap((round) => round.matches || []) : stage.matches || []).find((match) => match.id === cs2.results?.finalMatchId && match.resultConfirmed && match.published !== false);
  const twitchSources = snapshot?.sources.filter((source) => source.platform === 'twitch') || [];
  const primaryTwitch = twitchSources.find((source) => {
    const url = new URL(source.url);
    return url.hostname.replace(/^www\./, '') === 'twitch.tv' && url.pathname.toLowerCase().replace(/\/$/, '') === `/${twitchAnalytics.channel}`;
  });
  const totalPlanned = project?.initiatives.reduce((sum, item) => sum + item.tournaments, 0);
  const contactHref = partnershipMailto(projectContent.contactEmail);

  return <main className="partners-page">
    <section className="partner-hero" aria-labelledby="partners-title">
      <div className="partner-hero-inner container"><div>
        <p className="partner-kicker">ЯрКиберСезон / Партнёрам</p>
        <h1 id="partners-title">Какой турнир<br /><span>проведём вместе?</span></h1>
        <p className="partner-hero-copy">{project ? <>Программа {project.planYear}: {totalPlanned} турниров по {project.initiatives.length} дисциплинам. <a href="#next-season">План сезона.</a></> : 'Турниры, трансляции и сообщество ЯрКиберСезона.'}</p>
      </div><a className="partner-primary-action" href={contactHref}>Обсудить партнёрство <ArrowRight size={20} aria-hidden="true" /></a></div>
    </section>

    <section className="partner-season-desk container" aria-label="Выберите дисциплину следующего сезона">
      {project ? <div className="partner-discipline-grid">{project.initiatives.map((initiative) => <DisciplineTile key={initiative.id} initiative={initiative} />)}</div> : <ProjectEmpty availability={projectAvailability} />}
      <div className="partner-quick-view">
        <div className="partner-quick-history"><span className="partner-kicker">Уже провели</span><div>{project && <strong>{number(teamParticipationCount(project))}</strong>}<p>{project ? <>командных участия<br />в исторической выборке</> : 'Загружаем историю проекта…'}</p></div><small>{project?.sourceLabel}</small></div>
        <div className="partner-quick-links"><a href="#history">История проекта <ArrowRight size={18} aria-hidden="true" /></a><a href="#audience">Аудитория и источники <ArrowRight size={18} aria-hidden="true" /></a></div>
        <PartnerStrip partners={partners.filter((partner) => partner.scope === 'tournament')} />
      </div>
    </section>

    <nav className="partner-section-nav container" aria-label="Разделы страницы партнёрам">
      <a href="#audience">Аудитория</a><a href="#history">История</a><a href="#cs2-case">Кейс CS2</a><a href="#partners-registry">Партнёры</a><a href="#next-season">Следующий сезон</a><a href="#partner-contact">Связаться</a>
    </nav>

    <section className="container partner-project-section" id="audience" aria-labelledby="audience-title">
      <SectionHeading number="01" eyebrow="Люди и внимание" id="audience-title" title="Аудитория, которую можно измерить"><p>Подписчики, просмотры и действия — отдельные показатели. Общий охват в уникальных людях не складываем из разных площадок.</p></SectionHeading>
      <p className="partner-data-status" role="status">{audienceAvailability === 'loading' ? 'Получаем статистику из внешнего источника…' : audienceAvailability === 'stale' ? 'Источник не обновился. Последний полученный срез сохранён.' : 'У каждого показателя — источник, дата и способ расчёта.'}</p>
      <div className="partner-audience-grid">
        <TelegramAudience />
        <TwitchAudience source={primaryTwitch} availability={audienceAvailability} />
        {twitchSources.filter((source) => source !== primaryTwitch).map((source) => <AudienceSource key={source.id} source={source} availability={audienceAvailability} platform="twitch" />)}
      </div>
    </section>

    <section className="container partner-project-section" id="history" aria-labelledby="history-title">
      <SectionHeading number="02" eyebrow="История проекта" id="history-title" title="Уже выходили на арену"><p>От внутренних соревнований до открытых турниров. История ниже — по данным организатора.</p></SectionHeading>
      {project ? <>
        <div className="partner-history-layout"><div className="partner-history-total"><strong>{number(teamParticipationCount(project))}</strong><span>командных участия</span><p>{project.historyNote}</p></div>
          <ol className="partner-history-list">{project.history.map((event) => <li key={event.id}><span className="partner-history-period">{event.period}</span><div><h3>{event.title}</h3><p>{event.disciplines.map((discipline) => `${discipline.name} — ${discipline.teams} команд`).join(' · ')}</p></div></li>)}</ol>
        </div><p className="partner-provenance">{project.sourceLabel}</p>
      </> : <ProjectEmpty availability={projectAvailability} />}
    </section>

    <section className="container partner-project-section" id="cs2-case" aria-labelledby="cs2-case-title">
      <SectionHeading number="03" eyebrow="Завершённый кейс" id="cs2-case-title" title="CS2: от первого матча до финала"><p>{cs2?.dates?.display}. Результаты опубликованы в архиве турнира.</p></SectionHeading>
      {cs2?.results ? <div className="partner-case-layout"><div>
        <p className="partner-source-date">Паспорт турнира</p>
        <ul className="partner-case-facts">{cs2.facts?.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        <p className="partner-case-summary">{cs2.summary}</p>
        {final && <div className="partner-case-final"><span>Гранд-финал · счёт серии</span><strong>{final.team1} <b>{final.score1}:{final.score2}</b> {final.team2}</strong></div>}
        <a className="partner-text-action" href={`/tournaments/${cs2.slug}?section=results`}>Результаты и история матчей <ArrowUpRight aria-hidden="true" /></a>
      </div><ol className="partner-case-podium">{cs2.results.placements.map((place) => <li key={place.position}><span>{place.position}</span><div><small>{place.position === 1 ? 'Победитель' : `${place.position}-е место`}</small><strong>{place.team}</strong></div></li>)}</ol></div> : <p className="partner-source-note">Результаты кейса пока недоступны.</p>}
    </section>

    <section className="container partner-project-section" id="partners-registry" aria-labelledby="partners-registry-title">
      <SectionHeading number="04" eyebrow="Совместная работа" id="partners-registry-title" title="Бренды уже участвуют"><p>Подтверждённые партнёры текущего турнира: {tournament.title}, {tournament.dates?.display}. Области поддержки сохраняются у каждого партнёра.</p></SectionHeading>
      {groups.slice(0, 2).map(registryGroup)}
      {partners.some((partner) => ['match', 'final', 'unassigned'].includes(partner.scope)) && <details className="partner-registry-expand"><summary>Партнёры матчей, финала и будущих назначений</summary><div>{groups.slice(2).map(registryGroup)}</div></details>}
      {!partners.length && <p className="partner-source-note">Партнёры этого турнира пока не опубликованы.</p>}
      {project?.example && <article className="partner-example"><p className="eyebrow">Один из форматов участия</p><h3>{project.example.title}</h3><p>{project.example.copy}</p><small>{project.example.sourceLabel}</small></article>}
    </section>

    <section className="container partner-project-section" id="next-season" aria-labelledby="next-season-title">
      <SectionHeading number="05" eyebrow={project ? `План / ${project.planYear}` : 'План следующего сезона'} id="next-season-title" title="Какую арену соберём вместе?"><p>Выберите дисциплину — письмо организатору откроется с этой темой. Вклад и формат участия обсудим для конкретного события.</p></SectionHeading>
      {project ? <>
        <p className="partner-plan-summary"><strong>{totalPlanned} турниров · {project.initiatives.length} дисциплины</strong><span>План на {project.planYear} год. Даты пока не назначены.</span></p>
        <div className="partner-initiative-grid">{project.initiatives.map((initiative) => <article className="partner-initiative" key={initiative.id} data-initiative-id={initiative.id}>
          <p className="eyebrow">Планируется · {initiative.tournaments} {initiative.tournaments === 1 ? 'турнир' : 'турнира'}</p><h3>{partnerDisciplineVisuals[initiative.id] ? <><span className="partner-sr-only">{initiative.discipline}</span><img className="partner-plan-logo" src={partnerDisciplineVisuals[initiative.id].logo} alt={initiative.discipline} loading="lazy" decoding="async" /></> : initiative.discipline}</h3><p>{initiative.description}</p>
          <a className="partner-text-action" href={partnershipMailto(projectContent.contactEmail, initiative)}>Обсудить поддержку <ArrowUpRight aria-hidden="true" /></a>
        </article>)}</div>
        <div className="partner-media-plan"><h3>Больше историй — за пределами наших каналов</h3><p>{project.mediaPlan}</p></div>
        <p className="partner-provenance">{project.sourceLabel}</p>
      </> : <ProjectEmpty availability={projectAvailability} />}
    </section>

    <section className="container partner-project-section" aria-labelledby="partner-formats-title">
      <SectionHeading number="06" eyebrow="Формат и результат" id="partner-formats-title" title="Вклад может быть разным"><p>Сначала согласуем задачу партнёра, затем — участие и способ проверки результата.</p></SectionHeading>
      <div className="partner-format-grid">
        <article><h3>Финансовый</h3><p>Поддержка турнира или направления. Интеграции, сроки и отчётность согласуем отдельно.</p></article>
        <article><h3>Призовой</h3><p>Товары, услуги и сертификаты. Обсудим представление партнёра и вручение участникам.</p></article>
        <article><h3>Медийный</h3><p>Освещение соревнований и истории команд. Подготовим материалы под согласованный формат.</p></article>
      </div>
      <div className="partner-evidence"><h3>Результат с доказательствами</h3><p>Размещения — ссылки, записи и таймкоды. Внимание — статистика просмотров. Переходы — размеченные ссылки. Использование предложения — данные партнёра по промокодам или сертификатам. Состав отчёта согласуется до события.</p></div>
    </section>

    <section className="container partner-contact" id="partner-contact" aria-labelledby="partner-contact-title">
      <div><p className="eyebrow">Роман Талютин / основатель</p><h2 id="partner-contact-title">Следующий шаг<br /><span>сделаем вместе</span></h2></div>
      <div className="partner-contact-links"><a href={`mailto:${projectContent.contactEmail}`}>{projectContent.contactEmail}</a><a href={projectContent.contactPhoneUrl}>{projectContent.contactPhone}</a><a href={projectContent.contactTelegramUrl} target="_blank" rel="noopener noreferrer">{projectContent.contactTelegramLabel}</a><a href={projectContent.contactVkUrl} target="_blank" rel="noopener noreferrer">{projectContent.contactVkLabel}</a></div>
      <a className="button button--secondary" href={contactHref}>Обсудить участие <EnvelopeSimple aria-hidden="true" /></a>
    </section>
  </main>;
}
