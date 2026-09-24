import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import worker from '../worker/index.js';

const clientRoot = new URL('../dist/client/', import.meta.url);
const origin = 'https://xn--90aiaibl0ahlel5n.xn--p1ai';
const fileType = (pathname) => pathname.endsWith('.html') ? 'text/html; charset=utf-8'
  : pathname.endsWith('.xml') ? 'application/xml; charset=utf-8'
    : pathname.endsWith('.txt') ? 'text/plain; charset=utf-8'
      : pathname.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/octet-stream';

async function assetFromBuild(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const file = path.join(clientRoot.pathname, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
  try {
    const body = await readFile(file);
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: { 'content-type': fileType(pathname) } });
  } catch {
    return new Response('missing', { status: 404 });
  }
}

test('serves existing static assets without routing them through the app', async () => {
  const calls = [];
  const response = await worker.fetch(new Request(`${origin}/assets/app.js`), {
    ASSETS: { fetch: async (request) => { calls.push(new URL(request.url).pathname); return new Response('asset', { status: 200, headers: { 'content-type': 'text/javascript' } }); } },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ['/assets/app.js']);
});

test('serves the requested prerendered route and returns a useful 404 for unknown routes', async () => {
  const calls = [];
  const assets = { fetch: async (request) => {
    const url = new URL(request.url);
    calls.push(url.pathname + url.search);
    if (url.pathname === '/results/index.html') return new Response('<div id="root" data-prerendered="true" data-prerender-path="/results"><h1>Архив</h1></div>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    if (url.pathname.endsWith('/index.html')) return new Response('<div id="root" data-prerendered="true" data-prerender-path="/"><h1>Главная</h1></div>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    return new Response('missing', { status: 404 });
  } };

  const route = await worker.fetch(new Request(`${origin}/results?section=playoffs`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(route.status, 200);
  assert.match(await route.text(), /data-prerender-path="\/results"/);
  assert.deepEqual(calls, ['/results/index.html?section=playoffs']);

  calls.length = 0;
  const missing = await worker.fetch(new Request(`${origin}/teams/not-a-team`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(missing.status, 404);
  const missingBody = await missing.text();
  assert.match(missingBody, /<h1>Страница не найдена<\/h1>/);
  assert.match(missingBody, /href="\/"/);
  assert.deepEqual(calls, ['/teams/not-a-team/index.html']);
});

test('preserves client-only Mini App and Swiss simulator routes with the SPA shell', async () => {
  for (const pathname of ['/tg', '/tg/tournament', '/forMari']) {
    const calls = [];
    const response = await worker.fetch(new Request(`${origin}${pathname}`, { headers: { accept: 'text/html' } }), {
      ASSETS: { fetch: async (request) => {
        const url = new URL(request.url); calls.push(url.pathname);
        if (url.pathname === '/spa-shell.html') return new Response('<div id="root"></div>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
        return new Response('missing', { status: 404 });
      } },
    });
    assert.equal(response.status, 200, pathname);
    assert.equal(await response.text(), '<div id="root"></div>');
    assert.deepEqual(calls, [`${pathname}/index.html`, '/spa-shell.html']);
  }
});

test('missing API, asset, and write requests do not become app HTML', async () => {
  for (const request of [
    new Request(`${origin}/api/missing`, { headers: { accept: 'application/json' } }),
    new Request(`${origin}/flow`, { method: 'POST', headers: { accept: 'text/html' } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, { ASSETS: { fetch: async () => { calls += 1; return new Response('missing', { status: 404 }); } } });
    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
  const missingAsset = await worker.fetch(new Request(`${origin}/assets/unknown.js`, { headers: { accept: 'text/html' } }), {
    ASSETS: { fetch: async () => new Response('<h1>shell</h1>', { status: 200, headers: { 'content-type': 'text/html' } }) },
  });
  assert.equal(missingAsset.status, 404);

  for (const request of [
    new Request(`${origin}/api/missing`, { headers: { accept: 'application/json' } }),
    new Request(`${origin}/flow`, { method: 'POST', headers: { accept: 'text/html' } }),
  ]) {
    const response = await worker.fetch(request, {
      ASSETS: { fetch: async () => new Response('<div id="root" data-prerendered="true" data-prerender-path="/"></div>', { status: 200, headers: { 'content-type': 'text/html' } }) },
    });
    assert.equal(response.status, 404);
  }
});

test('built pages, metadata, robots, sitemap, and aliases match the public route inventory', async () => {
  await access(new URL('index.html', clientRoot));
  await access(new URL('../dist/server/index.js', import.meta.url));
  await access(new URL('../dist/.openai/hosting.json', import.meta.url));
  await access(new URL('assets/ycs-logo.jpg', clientRoot));

  const examples = [
    ['results/index.html', 'Каждый турнир', `${origin}/results`],
    ['tournaments/dota2-autumn-2026/index.html', 'Dota 2 / YCS', `${origin}/tournaments/dota2-autumn-2026`],
    ['teams/cs2-august-2026-pivnaya-kega/index.html', 'PIVNAYA KEGA', `${origin}/teams/cs2-august-2026-pivnaya-kega`],
    ['tournaments/cs2-august-2026/matches/cs2-aug-grand-final/index.html', 'bobr1ki — PIVNAYA KEGA', `${origin}/tournaments/cs2-august-2026/matches/cs2-aug-grand-final`],
  ];
  for (const [file, expectedText, canonical] of examples) {
    const html = await readFile(new URL(file, clientRoot), 'utf8');
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.ok(h1, `${file} must include an h1 before JavaScript`);
    const headingText = h1.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
    assert.ok(headingText.includes(expectedText), `${file} h1 should contain ${expectedText}; got ${headingText}`);
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1, `${file} canonical count`);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), `${file} canonical`);
    for (const name of ['description', 'og:title', 'og:description', 'og:url', 'og:image']) {
      const attr = name.startsWith('og:') ? `property="${name}"` : `name="${name}"`;
      assert.equal((html.match(new RegExp(`<meta ${attr}`, 'g')) || []).length, 1, `${file} ${name} count`);
    }
    const routePath = `/${file.slice(0, -'/index.html'.length)}`;
    assert.ok(html.includes(`data-prerender-path="${routePath}"`), `${file} prerender marker`);
  }

  const results = await readFile(new URL('results/index.html', clientRoot), 'utf8');
  assert.match(results, /<a class="result-card"[^>]+href="\/tournaments\//);
  assert.doesNotMatch(results, /<button[^>]+class="result-card"/);
  const resultLinks = [...results.matchAll(/<a class="result-card"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
  const tournamentFiles = readdirSync(new URL('../src/data/tournaments/', import.meta.url)).filter((name) => name.endsWith('.json'));
  const archivedPaths = tournamentFiles.map((name) => JSON.parse(readFileSync(new URL(`../src/data/tournaments/${name}`, import.meta.url), 'utf8')))
    .filter((tournament) => ['archive', 'completed'].includes(tournament.status))
    .map((tournament) => `/tournaments/${tournament.slug}`);
  assert.deepEqual(resultLinks.sort(), archivedPaths.sort());
  const archivedTournaments = tournamentFiles.map((name) => JSON.parse(readFileSync(new URL(`../src/data/tournaments/${name}`, import.meta.url), 'utf8')))
    .filter((tournament) => ['archive', 'completed'].includes(tournament.status));
  for (const tournament of archivedTournaments) assert.ok(results.includes(tournament.title), `${tournament.slug} title should be server rendered`);
  const home = await readFile(new URL('index.html', clientRoot), 'utf8');
  assert.match(home, /class="home-all-results" href="\/results"/);
  assert.match(home, /class="home-archive-row" href="\/tournaments\//);
  assert.match(results, /href="\/webmcp">Данные для ИИ<\/a>/);

  const autumn = JSON.parse(readFileSync(new URL('../src/data/tournaments/dota2-autumn-2026.json', import.meta.url), 'utf8'));
  const autumnHtml = await readFile(new URL('tournaments/dota2-autumn-2026/index.html', clientRoot), 'utf8');
  assert.ok(autumnHtml.includes(autumn.dates.display));
  assert.ok(autumnHtml.includes(autumn.facts[0]));
  assert.ok(autumnHtml.includes(autumn.statusLabel));

  const roster = JSON.parse(readFileSync(new URL('../src/data/team-rosters.json', import.meta.url), 'utf8'))
    .records.find((record) => record.teamId === 'cs2-august-2026-pivnaya-kega' && record.tournamentId === 'dota2-autumn-2026');
  assert.ok(roster);
  const teamHtml = await readFile(new URL('teams/cs2-august-2026-pivnaya-kega/index.html', clientRoot), 'utf8');
  for (const member of roster.members) {
    assert.ok(teamHtml.includes(member.name));
    assert.ok(teamHtml.includes(member.role));
  }

  const cs2 = JSON.parse(readFileSync(new URL('../src/data/tournaments/current-cs2-2026.json', import.meta.url), 'utf8'));
  const final = cs2.stages.flatMap((stage) => (stage.rounds || [{ matches: stage.matches || [] }]).flatMap((round) => round.matches || []))
    .find((match) => match.id === 'cs2-aug-grand-final');
  assert.ok(final);
  const matchHtml = await readFile(new URL('tournaments/cs2-august-2026/matches/cs2-aug-grand-final/index.html', clientRoot), 'utf8');
  assert.ok(matchHtml.includes(`${final.score1} : ${final.score2}`));

  const robots = await readFile(new URL('robots.txt', clientRoot), 'utf8');
  assert.equal(robots.trim(), `Sitemap: ${origin}/sitemap.xml`);
  const sitemap = await readFile(new URL('sitemap.xml', clientRoot), 'utf8');
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(sitemapUrls.includes(`${origin}/results`));
  assert.ok(sitemapUrls.includes(`${origin}/teams/cs2-august-2026-pivnaya-kega`));
  assert.ok(sitemapUrls.includes(`${origin}/tournaments/cs2-august-2026/matches/cs2-aug-grand-final`));
  assert.ok(!sitemapUrls.includes(`${origin}/tournaments/next`));
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length);
  assert.doesNotMatch(sitemap, /<lastmod>/);

  for (const url of sitemapUrls) {
    const pathname = new URL(url).pathname;
    const response = await worker.fetch(new Request(`${origin}${pathname}`, { headers: { accept: 'text/html' } }), { ASSETS: { fetch: assetFromBuild } });
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.ok(html.includes(`<link rel="canonical" href="${url}"`), `${pathname} should serve its own canonical page`);
  }
});

test('built routes and HEAD requests return page-specific status and canonical metadata', async () => {
  const assets = { fetch: assetFromBuild };
  const routes = [
    ['/results', 'Каждый турнир', `${origin}/results`],
    ['/tournaments/dota2-autumn-2026', 'Dota 2 / YCS', `${origin}/tournaments/dota2-autumn-2026`],
    ['/teams/cs2-august-2026-pivnaya-kega', 'PIVNAYA KEGA', `${origin}/teams/cs2-august-2026-pivnaya-kega`],
    ['/tournaments/cs2-august-2026/matches/cs2-aug-grand-final', 'bobr1ki — PIVNAYA KEGA', `${origin}/tournaments/cs2-august-2026/matches/cs2-aug-grand-final`],
  ];
  for (const [pathname, headingText, canonical] of routes) {
    const response = await worker.fetch(new Request(`${origin}${pathname}`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
    const html = await response.text();
    assert.equal(response.status, 200, pathname);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.ok(h1, pathname);
    assert.ok(h1.replace(/<[^>]+>/g, '').includes(headingText), pathname);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), pathname);

    const head = await worker.fetch(new Request(`${origin}${pathname}`, { method: 'HEAD', headers: { accept: 'text/html' } }), { ASSETS: assets });
    assert.equal(head.status, 200, `HEAD ${pathname}`);
    assert.equal(await head.text(), '');
  }
  for (const pathname of ['/teams/not-a-team', '/tournaments/no-such-tournament/matches/no-such-match', '/no-such-page']) {
    const response = await worker.fetch(new Request(`${origin}${pathname}`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
    assert.equal(response.status, 404, pathname);
    const head = await worker.fetch(new Request(`${origin}${pathname}`, { method: 'HEAD', headers: { accept: 'text/html' } }), { ASSETS: assets });
    assert.equal(head.status, 404, `HEAD ${pathname}`);
  }
  const robots = await worker.fetch(new Request(`${origin}/robots.txt`), { ASSETS: assets });
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get('content-type'), /text\/plain/);
  const sitemap = await worker.fetch(new Request(`${origin}/sitemap.xml`), { ASSETS: assets });
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /xml/);
  const badAsset = await worker.fetch(new Request(`${origin}/assets/unknown.js`), { ASSETS: assets });
  assert.equal(badAsset.status, 404);
  const telegram = await worker.fetch(new Request(`${origin}/tg`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(telegram.status, 200);
  const alias = await worker.fetch(new Request(`${origin}/tournaments/next`, { headers: { accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(alias.status, 200);
  assert.ok((await alias.text()).includes(`${origin}/tournaments/dota2-autumn-2026`));
});
