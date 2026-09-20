import { cardFacts } from "./model.js";
import { toPlainMessage, toRichMessage } from "./messages.js";

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const e = escapeHtml;

export function renderPreviewCard(card, { id, hidden = false, asset = (url) => url } = {}) {
  const facts = cardFacts(card);
  const plain = toPlainMessage(card);
  const rich = toRichMessage(card);
  const image = (url, alt, className) => url ? `<img class="${className}" src="${e(asset(url))}" alt="${e(alt)}">` : "";
  const team = (value) => `<div class="team">${value.logoUrl ? image(value.logoUrl, "Логотип " + value.name, "team-logo") : `<span class="team-logo initials" aria-hidden="true">${e((value.name || "?").split(" ").slice(-1)[0].slice(0, 2).toUpperCase())}</span>`}<h3>${e(value.name || "Соперник ещё не определён")}</h3></div>`;
  const allMatches = card.actions.find((action) => action.id === "matches");
  return `<article class="scenario" id="${e(id)}"${hidden ? " hidden" : ""}>
    <div class="match-card">
      <div class="card-brand">${image(card.brand.logoUrl, card.brand.name, "brand-logo")}<span>${e(card.brand.name)}</span><span class="source ${card.provenance.kind === "demo" ? "demo" : ""}">${card.provenance.kind === "demo" ? "ДЕМО" : "АРХИВ"}</span></div>
      <p class="eyebrow">${e(card.tournament.discipline)} <span>· ${e(card.bestOf || "Формат не опубликован")}</span></p>
      <h2>${e(card.tournament.title)}</h2>
      <p class="status ${card.status === "live" ? "live" : ""}">${e(card.statusLabel)}</p>
      ${card.provenance.kind === "demo" ? '<p class="demo-note">Тестовые команды и результаты. Не данные турнира.</p>' : ""}
      <div class="match-pair">${team(card.teams[0])}<div class="score"><strong aria-label="${e(card.scoreText)}">${card.score ? e(card.score.join(":")) : "—"}</strong><span>${e(card.score ? card.scoreLabel : card.scoreText)}</span></div>${team(card.teams[1])}</div>
      ${card.technical ? '<p class="card-note">Технический результат — без сыгранных карт.</p>' : ""}
      <p class="date">${e(card.dateText)}</p>
      ${card.currentMap ? `<div class="map"><span>ТЕКУЩАЯ КАРТА${card.currentMap.number === null ? "" : " · " + card.currentMap.number}</span><strong>${e(card.currentMap.name)}</strong><small>Снимок: ${e(card.currentMap.observedAt)}<br>${e(card.currentMap.source)}</small></div>` : ""}
      <div class="demo-actions">${card.actions.filter((action) => action.kind === "demo").map((action) => `<button type="button" data-notice="${e(action.notice)}">${e(action.label)}<small>демо</small></button>`).join("")}</div>
      <output class="action-notice" aria-live="polite">Драфт, статистика и AI-анализ ещё не подключены.</output>
      <a class="all-matches" href="${e(allMatches.url)}" target="_blank" rel="noopener">Все матчи <span aria-hidden="true">↗</span></a>
      ${card.provenance.kind === "demo" ? '<p class="link-note">Откроет текущий Dota-турнир. Тестовых матчей в нём нет.</p>' : ""}
    </div>
    <details><summary>Обычное текстовое сообщение</summary><pre>${e(plain.text)}</pre></details>
    <details><summary>Источник и представление для Telegram</summary><p>${e(facts[0])}</p><p class="source-path">${e(card.provenance.source)}<br>${e(card.provenance.revision)}</p><pre>${e(JSON.stringify(rich, null, 2))}</pre></details>
  </article>`;
}
