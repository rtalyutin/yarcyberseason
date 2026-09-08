import { matchDateLabel, matchPath } from './community.js';

const image = (src) => new Promise((resolve) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
});
function lines(ctx, text, width) {
  const result = []; let line = '';
  for (const char of String(text)) {
    if (ctx.measureText(line + char).width > width && line) { result.push(line.trim()); line = ''; }
    line += char;
  }
  if (line) result.push(line.trim());
  return result;
}
function fit(ctx, text, x, y, width, height, maxSize = 34, align = 'left') {
  let size = maxSize, wrapped;
  do { ctx.font = `700 ${size}px YcsCard, sans-serif`; wrapped = lines(ctx, text, width); if (wrapped.length * size * 1.25 <= height) break; size--; } while (size > 10);
  ctx.textAlign = align;
  wrapped.forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.25));
}

export async function renderResultCard(match, origin) {
  if (!match.result.canDownload) throw new Error('Result is not confirmed');
  const font = new FontFace('YcsCard', 'url(/assets/fonts/DejaVuSans-Bold.ttf)');
  try { document.fonts.add(await font.load()); } catch { /* System font remains usable. */ }
  const logo = await image('/assets/ycs-logo.jpg');
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#080f1e'; ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = '#1654ff'; ctx.fillRect(0, 0, 14, 630);
  if (logo) ctx.drawImage(logo, 48, 34, 64, 64);
  ctx.fillStyle = '#fff'; fit(ctx, 'ЯРКИБЕРСЕЗОН', 132, 64, 990, 40, 28);
  ctx.fillStyle = '#a6b6d0'; fit(ctx, `${match.discipline} · ${match.tournamentTitle} · ${match.roundTitle}`, 48, 136, 1104, 75, 24);
  ctx.fillStyle = '#fff';
  fit(ctx, match.team1 || 'Участник уточняется', 48, 240, 380, 160, 38);
  fit(ctx, match.team2 || 'Участник уточняется', 1152, 240, 380, 160, 38, 'right');
  ctx.textAlign = 'center'; ctx.font = '700 84px YcsCard, sans-serif'; ctx.fillText(match.result.score.join(' : '), 600, 308);
  ctx.fillStyle = '#a6b6d0'; fit(ctx, match.result.label, 600, 355, 310, 55, 20, 'center');
  const mapSummary = match.result.maps.map((map) => `${map.name}${map.score ? ' ' + map.score.join(':') : ''}`).join(' · ');
  ctx.fillStyle = '#a6b6d0'; fit(ctx, mapSummary || (match.result.technical ? 'Техническое решение' : 'Счёт отдельных карт не опубликован'), 48, 405, 1104, 40, 18);
  ctx.fillStyle = '#fff'; fit(ctx, matchDateLabel(match), 48, 465, 1104, 30, 20);
  ctx.fillStyle = '#3f6eff'; ctx.fillRect(48, 490, 1104, 2);
  ctx.fillStyle = '#b5c8ef'; fit(ctx, `${origin.replace(/^https?:\/\//, '')}${matchPath(match)}`, 48, 534, 1104, 75, 19);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png'));
}

export async function downloadResultCard(match, origin) {
  const blob = await renderResultCard(match, origin);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `YCS-${match.tournamentId}-${match.id}.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
