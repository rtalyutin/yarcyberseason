import { calendarPath, exactStart, matchPath, matchKey } from './community.js';

const utc = (date) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escapeText = (text) => String(text).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
// RFC 5545 limits content lines by UTF-8 octets, not JavaScript characters.
export function foldLine(line) {
  const encoder = new TextEncoder();
  let output = '', length = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (length + size > 75) { output += '\r\n '; length = 1; }
    output += char; length += size;
  }
  return output;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function reconcilePublications(matches, previous, now) {
  if (!exactStart(now)) throw new Error('A timestamp with timezone is required');
  const existing = new Map(previous.records.map((record) => [record.matchKey, record]));
  const source = new Map(matches.map((match) => [matchKey(match.tournamentId, match.id), match]));
  const records = [];
  for (const key of new Set([...existing.keys(), ...source.keys()])) {
    const old = existing.get(key), match = source.get(key);
    const time = match && exactStart(match.scheduledAt);
    const currentTeamIds = match ? [...new Set([match.team1Id, match.team2Id].filter(Boolean))].sort() : [];
    const active = Boolean(match && time && currentTeamIds.length && ['scheduled', 'live', 'completed'].includes(match.status));
    if (!old && !active) continue;
    const state = {
      start: time || old.start,
      currentTeamIds: active ? currentTeamIds : [],
      publishedTeamIds: [...new Set([...(old?.publishedTeamIds || []), ...(active ? currentTeamIds : [])])].sort(),
      summary: match ? `${match.team1 || 'Участник уточняется'} — ${match.team2 || 'Участник уточняется'} · ${match.tournamentTitle}` : old.summary,
      path: match ? matchPath(match) : old.path,
      cancelled: !active,
      description: !active ? match?.status === 'postponed' || (match && !time) ? 'Прежнее время отменено, новое уточняется.' : 'Матч отменён или больше не назначен этой команде.' : match.status === 'completed' ? 'Матч завершён. Результат — на странице матча.' : 'Время матча указано на сайте в МСК. Проверьте расписание перед началом.',
    };
    const oldState = old && Object.fromEntries(Object.keys(state).map((field) => [field, old[field]]));
    const changed = !same(state, oldState);
    records.push({ matchKey: key, uid: old?.uid || `${encodeURIComponent(key)}@ycs.bar`, ...state,
      revision: old ? old.revision + Number(changed) : 0,
      updatedAt: changed ? now : old.updatedAt,
    });
  }
  return { schemaVersion: 1, records: records.sort((a, b) => a.matchKey.localeCompare(b.matchKey)) };
}

export function teamCalendar(team, publications, origin) {
  const ids = new Set([team.id, ...(team.legacyIds || [])]);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//YAR CYBER SEASON//Team calendar//RU', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(team.name + ' · ЯрКиберСезон')}`];
  for (const record of publications.records.filter((r) => r.publishedTeamIds.some((id) => ids.has(id)))) {
    const cancelled = record.cancelled || !record.currentTeamIds.some((id) => ids.has(id));
    lines.push('BEGIN:VEVENT', `UID:${record.uid}`, `DTSTAMP:${utc(record.updatedAt)}`, `LAST-MODIFIED:${utc(record.updatedAt)}`,
      `SEQUENCE:${record.revision}`, `DTSTART:${utc(record.start)}`, `SUMMARY:${escapeText(record.summary)}`,
      `DESCRIPTION:${escapeText(cancelled && !record.cancelled ? 'Участие этой команды в матче отменено.' : record.description)}`,
      `URL:${origin}${record.path}`, `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
export function calendarUrl(teamId, origin) { return `${origin}${calendarPath(teamId)}`; }
