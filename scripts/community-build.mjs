import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommunityModel, validateCommunity } from '../src/lib/community.js';
import { reconcilePublications, teamCalendar } from '../src/lib/calendar.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
const tournaments = readdirSync(resolve(root, 'src/data/tournaments')).filter((f) => f.endsWith('.json')).map((f) => read('src/data/tournaments/' + f));
const registry = read('src/data/teams.json');
const errors = validateCommunity(tournaments, registry);
if (errors.length) throw new Error(errors.join('\n'));
const model = buildCommunityModel(tournaments, registry);
const previous = read('src/data/calendar-publications.json');
const next = reconcilePublications([...model.matches.values()], previous, new Date().toISOString());
if (process.argv.includes('--sync')) {
  writeFileSync(resolve(root, 'src/data/calendar-publications.json'), JSON.stringify(next, null, 2) + '\n');
  console.log('Updated public calendar publication records. Include this file in the schedule change.');
} else {
  if (JSON.stringify(next) !== JSON.stringify(previous)) throw new Error('Schedule changed: run npm run calendar:sync and commit its publication records with the schedule.');
  if (!process.argv.includes('--check')) {
    const target = resolve(root, 'dist/client/calendars/teams');
    mkdirSync(target, { recursive: true });
    for (const team of model.teams.values()) writeFileSync(resolve(target, `${team.id}.ics`), teamCalendar(team, previous, 'https://ycs.bar'));
    for (const [oldId, teamId] of model.teamAliases) writeFileSync(resolve(target, `${oldId}.ics`), teamCalendar(model.getTeam(teamId), previous, 'https://ycs.bar'));
  }
  console.log(`Validated ${model.teams.size} team records and ${model.matches.size} matches; calendars ready.`);
}
