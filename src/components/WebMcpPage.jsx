import { useEffect, useState } from 'react';
import { tournaments } from '../data/tournaments/index.js';
import { community } from '../data/community.js';
import { createWebMcpTools } from '../lib/webmcp.js';
import { attachWebMcp } from '../lib/webmcp-registration.js';
import '../webmcp.css';

const dataVersion = __YCS_DATA_VERSION__;
const tools = createWebMcpTools({ tournaments, community, dataVersion });
const stateLabels = {
  connecting: 'Подключаем инструменты…',
  ready: '6 инструментов доступны для чтения',
  unsupported: 'Этот браузер не поддерживает подключение WebMCP',
  error: 'Не удалось подключить инструменты. Попробуйте обновить страницу.',
};

export default function WebMcpPage() {
  const [status, setStatus] = useState({ state: 'connecting', count: 0 });
  useEffect(() => {
    const title = document.title;
    document.title = 'Турниры, матчи и команды · WebMCP — ЯрКиберСезон';
    const detach = attachWebMcp(document.modelContext, tools, setStatus);
    return () => { detach(); document.title = title; };
  }, []);
  return <main className="webmcp-page">
    <header className="webmcp-header"><a href="/" aria-label="ЯрКиберСезон — главная"><img src="/assets/ycs-logo.jpg" alt="YAR CYBER SEASON" width="101" height="46" /></a><a href="/">На сайт ↗</a></header>
    <p className="webmcp-eyebrow">ЯРКИБЕРСЕЗОН / WEBMCP</p>
    <h1>Турниры.<br />Матчи. Команды.</h1>
    <p className="webmcp-intro">Открытые данные ЯКС для работы с ИИ. Здесь доступны те же сведения, что и на страницах сайта: расписание, опубликованные результаты и история команд.</p>
    <p className={`webmcp-status webmcp-status--${status.state}`} role="status">{stateLabels[status.state]}</p>
    <div className="webmcp-counts" aria-label="Содержание этой версии"><div><strong>{tournaments.length}</strong><span>турниров</span></div><div><strong>{community.matches.size}</strong><span>матчей</span></div><div><strong>{community.teams.size}</strong><span>команд</span></div></div>
    <section aria-labelledby="webmcp-how"><h2 id="webmcp-how">Как пользоваться</h2><p>Откройте эту страницу во встроенном браузере совместимого ИИ-клиента и попросите найти нужные данные. Например: «Покажи матчи PIVNAYA KEGA в последнем турнире CS2».</p><p>Держите страницу открытой во время работы с инструментами. Они читают опубликованную версию сайта. Неполные даты и неподтверждённые результаты сохраняются как есть.</p></section>
    <section aria-labelledby="webmcp-catalog"><h2 id="webmcp-catalog">Что можно узнать</h2><div className="webmcp-catalog">{[
      ['Турниры', 'Список, даты, правила, регистрация, этапы и итоги.', 'ycs_list_tournaments · ycs_get_tournament'],
      ['Матчи', 'Участники, статусы, счёт, карты и связи в сетке.', 'ycs_list_matches · ycs_get_match'],
      ['Команды', 'Названия, участия и статистика по дисциплинам.', 'ycs_list_teams · ycs_get_team'],
    ].map(([title, text, names]) => <article key={title}><h3>{title}</h3><p>{text}</p><code>{names}</code></article>)}</div></section>
    <footer><span>Только чтение · данные из JSON этой сборки</span><details><summary>Версия данных</summary><code>{dataVersion}</code></details></footer>
  </main>;
}
