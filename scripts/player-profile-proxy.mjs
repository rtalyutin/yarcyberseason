import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const PREFIX = '/api/player/v1';
const MAX_BYTES = 10 * 1024 * 1024 + 64 * 1024;
const REQUEST_HEADERS = ['origin', 'x-csrf-token', 'content-type', 'accept'];
const RESPONSE_HEADERS = ['content-type', 'content-disposition', 'content-encoding', 'set-cookie', 'location', 'allow', 'retry-after',
  'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers', 'vary', 'content-security-policy'];

export function playerUpstream(value) {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
    return url;
  } catch { return null; }
}

class ProxyFailure extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}
async function limitedBody(stream, max, signal, input = false) {
  const declared = stream.headers['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > max)) throw new ProxyFailure(input ? 'file_too_large' : 'upstream_response_too_large', input ? 413 : 502);
  const abort = () => { if (!stream.complete) stream.destroy(new Error('aborted')); };
  signal.addEventListener('abort', abort, { once: true });
  const chunks = []; let size = 0;
  try {
    if (signal.aborted) abort();
    for await (const chunk of stream.iterator({ destroyOnReturn: !input })) {
      size += chunk.length;
      if (size > max) throw new ProxyFailure(input ? 'file_too_large' : 'upstream_response_too_large', input ? 413 : 502);
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } finally { signal.removeEventListener('abort', abort); }
}

// This adapter is deliberately limited to the player API. Host/destination are
// operator configuration; forwarding/Authorization headers supplied by visitors
// never influence the target. Native HTTP does not follow upstream redirects.
export function createPlayerProfileProxy({ env = process.env, timeoutMs = 25_000,
  maxRequestBytes = MAX_BYTES, maxResponseBytes = MAX_BYTES, maxActive = 8 } = {}) {
  const upstream = playerUpstream(env.YCS_PLAYER_UPSTREAM);
  let active = 0;
  return async (incoming, outgoing, url) => {
    if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return false;
    const sendError = (status, error) => {
      if (outgoing.destroyed || outgoing.writableEnded) return;
      outgoing.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff', 'connection': 'close' });
      outgoing.end(incoming.method === 'HEAD' ? undefined : JSON.stringify({ error }));
    };
    if (!upstream) { sendError(503, 'player_not_configured'); return true; }
    if (active >= maxActive) { sendError(429, 'rate_limited'); return true; }
    active++;
    const controller = new AbortController(); let timedOut = false; let request;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs); timer.unref();
    const disconnected = () => { if (!outgoing.writableEnded) controller.abort(); };
    incoming.once('aborted', disconnected); outgoing.once('close', disconnected);
    try {
      const body = await limitedBody(incoming, maxRequestBytes, controller.signal, true);
      const headers = Object.fromEntries(REQUEST_HEADERS.filter((key) => incoming.headers[key] !== undefined).map((key) => [key, incoming.headers[key]]));
      // Only this feature's opaque signed session is needed by the upstream.
      const cookie = String(incoming.headers.cookie || '').split(';').map((part) => part.trim())
        .filter((part) => part.startsWith('ycs_player_session=')).join('; ');
      if (cookie) headers.cookie = cookie;
      if (body.length || incoming.headers['content-length'] !== undefined) headers['content-length'] = String(body.length);
      const target = new URL(url.pathname + url.search, upstream);
      const response = await new Promise((resolve, reject) => {
        request = (upstream.protocol === 'https:' ? httpsRequest : httpRequest)(target, { method: incoming.method,
          headers, signal: controller.signal, agent: false, maxHeaderSize: 16 * 1024 }, resolve);
        request.once('error', reject); request.end(body.length ? body : undefined);
      });
      let result;
      try { result = await limitedBody(response, maxResponseBytes, controller.signal); }
      finally { if (!response.complete) response.destroy(); }
      if (controller.signal.aborted || outgoing.destroyed) throw Error('aborted');
      const responseHeaders = Object.fromEntries(RESPONSE_HEADERS.filter((key) => response.headers[key] !== undefined).map((key) => [key, response.headers[key]]));
      outgoing.writeHead(response.statusCode, { ...responseHeaders, 'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
        ...(incoming.method !== 'HEAD' && ![204, 304].includes(response.statusCode) ? { 'content-length': result.length } : {}) });
      outgoing.end(incoming.method === 'HEAD' ? undefined : result);
    } catch (error) {
      request?.destroy();
      sendError(timedOut ? 504 : error instanceof ProxyFailure ? error.status : 502,
        timedOut ? 'upstream_timeout' : error instanceof ProxyFailure ? error.code : 'dependency_unavailable');
    } finally {
      clearTimeout(timer); incoming.removeListener('aborted', disconnected); outgoing.removeListener('close', disconnected); active--;
    }
    return true;
  };
}
