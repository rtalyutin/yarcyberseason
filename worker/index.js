export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/calendars/') && !['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    const response = await env.ASSETS.fetch(request);
    // A subscription URL must never become an HTML app shell, even if opened
    // in a browser. Revalidate so future calendar refreshes can see changes.
    if (new URL(request.url).pathname.startsWith('/calendars/')) {
      if (response.status !== 200) return response;
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/calendar; charset=utf-8');
      headers.set('cache-control', 'no-cache');
      return new Response(response.body, { status: response.status, headers });
    }
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
