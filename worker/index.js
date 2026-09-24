const isMethod = (request, method) => request.method === method;
const isRead = (request) => isMethod(request, 'GET') || isMethod(request, 'HEAD');
const hasFileExtension = (pathname) => /\.[a-z0-9]{1,12}$/i.test(pathname);

function notFound(request) {
  const body = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена — ЯрКиберСезон</title><meta name="robots" content="noindex,follow"></head><body><main><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь на главную страницу ЯрКиберСезона.</p><a href="/">На главную</a></main></body></html>';
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function assetRequest(request, pathname, method = 'GET') {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, { method, headers: request.headers, redirect: request.redirect });
}

async function verifiedPrerenderedPage(request, env, pathname) {
  const filePath = pathname === '/' ? '/index.html' : `${pathname}/index.html`;
  const response = await env.ASSETS.fetch(assetRequest(request, filePath));
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return null;
  const marker = `data-prerender-path="${pathname}"`;
  if (!(await response.clone().text()).includes(marker)) return null;
  if (request.method === 'HEAD') return new Response(null, { status: response.status, headers: response.headers });
  return response;
}

async function spaShell(request, env) {
  const response = await env.ASSETS.fetch(assetRequest(request, '/spa-shell.html'));
  if (response.status !== 200) return null;
  if ((await response.clone().text()).includes('data-prerendered="true"')) return null;
  if (request.method === 'HEAD') return new Response(null, { status: response.status, headers: response.headers });
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/calendars/') && !isRead(request)) {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    // Calendar subscriptions remain files and never fall through to HTML.
    if (url.pathname.startsWith('/calendars/')) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 200) return response;
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/calendar; charset=utf-8');
      headers.set('cache-control', 'no-cache');
      return new Response(response.body, { status: response.status, headers });
    }

    // API routes are not page routes and must preserve their own 404s.
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 200 && response.headers.get('content-type')?.includes('text/html')) return notFound(request);
      return response;
    }

    if (isRead(request) && !hasFileExtension(url.pathname)) {
      const pathname = url.pathname.replace(/\/+$/, '') || '/';
      const page = await verifiedPrerenderedPage(request, env, pathname);
      if (page) return page;

      // Mini App and the internal Swiss simulator are client-only routes.
      if (pathname === '/forMari' || pathname === '/tg' || pathname.startsWith('/tg/')) {
        const shell = await spaShell(request, env);
        if (shell) return shell;
      }
      return notFound(request);
    }

    const response = await env.ASSETS.fetch(request);
    // Some static hosts return the SPA shell for missing asset files. Keep
    // missing scripts, styles and images as real 404s in that case.
    if (response.status === 200 && hasFileExtension(url.pathname) && response.headers.get('content-type')?.includes('text/html')) {
      const expectedPath = url.pathname === '/index.html' ? '/' : url.pathname.endsWith('/index.html') ? url.pathname.slice(0, -'/index.html'.length) || '/' : null;
      const markerResponse = request.method === 'HEAD' && expectedPath ? await env.ASSETS.fetch(assetRequest(request, url.pathname)) : response;
      const hasExpectedPath = expectedPath && (await markerResponse.clone().text()).includes(`data-prerender-path="${expectedPath}"`);
      if (!hasExpectedPath) return notFound(request);
      if (request.method === 'HEAD') return new Response(null, { status: response.status, headers: response.headers });
    }
    if (!isRead(request) && response.status === 200 && response.headers.get('content-type')?.includes('text/html')) return notFound(request);
    return response;
  },
};
