import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('profile direct route has a shared site frame, private metadata and no personal prerender data', async () => {
  const server = await createServer({ configFile: false, define: { __YCS_DATA_VERSION__: '"test"', __YCS_BUILD_GENERATED_AT__: '"2026-10-18T00:00:00Z"' },
    esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  try {
    const { App } = await server.ssrLoadModule('/src/App.jsx');
    const { getPageMetadata } = await server.ssrLoadModule('/src/lib/page-metadata.js');
    const { listPublicRoutes } = await server.ssrLoadModule('/src/lib/public-routes.js');
    const html = renderToStaticMarkup(React.createElement(App, { initialPath: '/player/profile/' }));
    assert.match(html, /Карточка/); assert.match(html, /ycs-header-brand/);
    assert.match(html, /Лига цифровой экономики/);
    assert.match(html, /aria-label="Хлебные крошки"/);
    assert.match(html, /Политика обработки персональных данных/);
    assert.match(html, /Контакты организатора/);
    assert.doesNotMatch(html, /ООО «ЯрКиберСезон»|Твоя карточка ЯКС|YCS \/ PLAYER/);
    assert.match(getPageMetadata('/player/profile').title, /Лига цифровой экономики/);
    assert.doesNotMatch(html, /Маршрут<br\/>не найден/);
    assert.equal(getPageMetadata('/player/profile').noindex, true);
    assert.equal(listPublicRoutes().find((item) => item.pathname === '/player/profile').includeInSitemap, false);
    assert.doesNotMatch(html, /csrfToken|photoAssetId|ownerId|Authorization/);
  } finally { await server.close(); }
});
