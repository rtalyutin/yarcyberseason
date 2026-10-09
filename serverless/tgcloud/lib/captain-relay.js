// The platform authenticates ctx.initData; the service independently verifies
// the original Telegram signature. Never forward a client-asserted identity.
const actions = new Set(['access', 'match', 'message', 'agree', 'result']);
const fields = ['matchId', 'requestId', 'text', 'expectedChatEpoch', 'expectedScheduleVersion', 'startsAt', 'score', 'comment'];
const errors = new Set(['unauthorized', 'forbidden', 'not_found', 'invalid_request',
  'conflict', 'chat_reset', 'idempotency_conflict', 'captain_not_configured', 'window_unavailable',
  'outside_window', 'too_late', 'match_closed', 'storage_unavailable', 'capacity_reached',
  'storage_full', 'too_many_requests']);

export function createCaptainRelay({ fetcher, EndpointError, serviceUrl }) {
  const fail = (code) => { throw new EndpointError('Не удалось выполнить действие.', { code }); };
  return async (input, ctx) => {
    // Only ECMAScript built-ins here: Serverless documents SDK fetch, not the
    // browser's URL/URLSearchParams globals. The deployment script also validates.
    if (typeof serviceUrl !== 'string' || !/^https:\/\/[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?\/api\/captain$/i.test(serviceUrl)) {
      return fail('captain_not_configured');
    }
    if (!input || !actions.has(input.action) || typeof input.initData !== 'string' ||
        input.initData.length > 16384) return fail('invalid_request');
    let provided;
    try {
      const users = input.initData.split('&').map((part) => {
        const at = part.indexOf('=');
        const decode = (value) => decodeURIComponent(value.replace(/\+/g, ' '));
        return [decode(at < 0 ? part : part.slice(0, at)), decode(at < 0 ? '' : part.slice(at + 1))];
      }).filter(([key]) => key === 'user');
      if (users.length !== 1) return fail('unauthorized');
      provided = JSON.parse(users[0][1]);
    }
    catch { return fail('unauthorized'); }
    if (!ctx?.initData?.user?.id || provided?.id !== ctx.initData.user.id) return fail('unauthorized');
    const payload = { initData: input.initData, action: input.action };
    for (const field of fields) if (Object.hasOwn(input, field)) payload[field] = input[field];
    let response, result;
    try {
      response = await fetcher(serviceUrl, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      result = await response.json();
    } catch { return fail('storage_unavailable'); }
    if (!response.ok) return fail(errors.has(result?.error) ? result.error : 'storage_unavailable');
    return result;
  };
}
