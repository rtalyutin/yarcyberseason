import React from 'react';
import { renderToString } from 'react-dom/server';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDirectory = path.join(root, 'dist/client');
const shellPath = path.join(clientDirectory, 'index.html');
const shell = readFileSync(shellPath, 'utf8');
const server = await createServer({
  configFile: path.join(root, 'vite.config.mjs'),
  root,
  appType: 'custom',
  server: { middlewareMode: true },
});
const { listPublicRoutes, normalizePublicPath, PUBLIC_ORIGIN } = await server.ssrLoadModule('/src/lib/public-routes.js');
const { getPageMetadata } = await server.ssrLoadModule('/src/lib/page-metadata.js');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function withMetadata(source, metadata) {
  const title = `<title>${escapeHtml(metadata.title)}</title>`;
  const description = `<meta name="description" content="${escapeHtml(metadata.description)}" />`;
  const canonical = `<link rel="canonical" href="${escapeHtml(`${PUBLIC_ORIGIN}${metadata.canonicalPath}`)}" />`;
  const openGraph = [
    ['og:title', metadata.title],
    ['og:description', metadata.description],
    ['og:url', `${PUBLIC_ORIGIN}${metadata.canonicalPath}`],
    ['og:image', metadata.image || `${PUBLIC_ORIGIN}/assets/ycs-logo.jpg`],
    ['og:type', 'website'],
  ].map(([key, value]) => `<meta property="${key}" content="${escapeHtml(value)}" />`).join('\n    ');
  const robots = metadata.noindex ? '<meta name="robots" content="noindex,follow" />' : '';
  return source
    .replace(/\s*<title>[\s\S]*?<\/title>/i, `\n    ${title}`)
    .replace(/\s*<meta name="description"[^>]*>/i, `\n    ${description}`)
    .replace(/\s*<link rel="canonical"[^>]*>/i, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<meta name="robots"[^>]*>/i, '')
    .replace('</head>', `    ${canonical}\n    ${openGraph}\n    ${robots}\n  </head>`);
}

function outputPath(pathname) {
  const normalized = normalizePublicPath(pathname);
  return normalized === '/'
    ? path.join(clientDirectory, 'index.html')
    : path.join(clientDirectory, normalized.slice(1), 'index.html');
}

try {
  const { App } = await server.ssrLoadModule('/src/App.jsx');
  const routes = listPublicRoutes();
  for (const item of routes) {
    const pathname = normalizePublicPath(item.pathname);
    const markup = renderToString(React.createElement(React.StrictMode, null,
      React.createElement(App, { initialPath: pathname })));
    const metadata = getPageMetadata(pathname);
    const html = withMetadata(shell, metadata).replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="true" data-prerender-path="${escapeHtml(pathname)}">${markup}</div>`,
    );
    if (!html.includes('data-prerendered="true"')) throw new Error(`Could not insert prerendered root for ${pathname}`);
    const target = outputPath(pathname);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, html);
  }

  // SPA-only routes use a clean, unrendered shell and hydrate with their own path.
  const spaShell = shell
    .replace(/\s*<link rel="canonical"[^>]*>/i, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '');
  writeFileSync(path.join(clientDirectory, 'spa-shell.html'), spaShell);

  const urls = [...new Set(routes.filter((item) => item.includeInSitemap).map((item) => `${PUBLIC_ORIGIN}${getPageMetadata(item.pathname).canonicalPath}`))];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  writeFileSync(path.join(clientDirectory, 'sitemap.xml'), xml);
  console.log(`Prerendered ${urls.length} canonical public URLs and ${routes.length - urls.length} aliases.`);
} finally {
  await server.close();
}
