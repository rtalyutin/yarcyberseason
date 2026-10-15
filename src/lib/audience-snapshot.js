// Public contract only. Never accept/pass through session data or raw messages.
export const AUDIENCE_SNAPSHOT_URL = "https://e9dc5ea4-6dc9267d-85ca-4ae9-a41f-2895e9542a04.s3.twcstorage.ru/results/audience.json";
export const AUDIENCE_METRICS = ['followers', 'sampleSize', 'medianViews', 'totalViews', 'totalReactions', 'totalForwards'];
export const AUDIENCE_REASONS = ['credentials_missing', 'session_missing', 'session_invalid', 'auth_required', 'rate_limited', 'channel_unavailable', 'invalid_response', 'source_unavailable', 'external_feed_missing', 'dependency_missing', 'timeout', 'configuration_invalid', 'feed_stale'];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
function invalid() { const error = new Error('Invalid audience snapshot'); error.code = 'invalid_response'; throw error; }
const keys = (value, allowed) => object(value) && Object.keys(value).length === allowed.length && Object.keys(value).every((key) => allowed.includes(key));
const iso = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const counter = (value) => value === null || Number.isSafeInteger(value) && value >= 0;
const text = (value, maximum) => typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f]/.test(value);
function publicUrl(value) {
  if (typeof value !== 'string' || value.length > 512) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}

export function validateAudienceSnapshot(value) {
  if (!keys(value, ['schemaVersion', 'generatedAt', 'sources']) || value.schemaVersion !== 1 || !iso(value.generatedAt) || !Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 8) invalid();
  const ids = new Set();
  const sources = value.sources.map((source) => {
    if (!keys(source, ['id', 'platform', 'name', 'url', 'status', 'fetchedAt', 'lastAttemptAt', 'period', 'metrics', 'method', 'sample', 'reason']) ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(source.id) || ids.has(source.id) || !['telegram', 'twitch'].includes(source.platform) ||
      !text(source.name, 128) || !publicUrl(source.url) || !text(source.method, 400) ||
      !['current', 'stale', 'unavailable', 'not_configured'].includes(source.status) ||
      source.reason !== null && !AUDIENCE_REASONS.includes(source.reason) ||
      source.fetchedAt !== null && !iso(source.fetchedAt) || source.lastAttemptAt !== null && !iso(source.lastAttemptAt) ||
      !keys(source.metrics, AUDIENCE_METRICS) || !Array.isArray(source.sample) || source.sample.length > 20) invalid();
    ids.add(source.id);
    for (const key of AUDIENCE_METRICS) {
      const metric = source.metrics[key];
      if (key === 'medianViews' ? metric !== null && (!Number.isFinite(metric) || metric < 0 || metric > Number.MAX_SAFE_INTEGER || !Number.isInteger(metric * 2)) : !counter(metric)) invalid();
    }
    if (source.fetchedAt && source.fetchedAt > value.generatedAt || source.lastAttemptAt && source.lastAttemptAt > value.generatedAt ||
      source.fetchedAt && source.lastAttemptAt && source.fetchedAt > source.lastAttemptAt) invalid();
    if (source.status === 'current' && (!source.fetchedAt || !source.lastAttemptAt || source.reason !== null) ||
      source.status === 'stale' && (!source.fetchedAt || !source.lastAttemptAt || !source.reason)) invalid();
    if (['unavailable', 'not_configured'].includes(source.status) && (source.fetchedAt !== null || source.period !== null || source.sample.length || AUDIENCE_METRICS.some((key) => source.metrics[key] !== null))) invalid();
    if (source.period !== null && (!keys(source.period, ['from', 'to']) || !iso(source.period.from) || !iso(source.period.to) || source.period.from > source.period.to || !source.fetchedAt || source.period.to > source.fetchedAt)) invalid();
    const postIds = new Set();
    const sample = source.sample.map((post) => {
      if (!keys(post, ['id', 'url', 'publishedAt', 'views', 'reactions', 'forwards']) || !Number.isSafeInteger(post.id) || post.id < 1 || postIds.has(post.id) || !publicUrl(post.url) || !iso(post.publishedAt) ||
        !counter(post.views) || !counter(post.reactions) || !counter(post.forwards) || !source.period || post.publishedAt < source.period.from || post.publishedAt > source.period.to) invalid();
      postIds.add(post.id);
      if (source.platform === 'telegram' && post.url !== `${source.url}/${post.id}`) invalid();
      return { ...post };
    });
    if (source.platform === 'telegram' && source.metrics.sampleSize !== null && source.metrics.sampleSize !== sample.length) invalid();
    if (source.platform === 'telegram' && sample.length && source.metrics.sampleSize === null) invalid();
    if (source.platform === 'telegram' && source.metrics.sampleSize !== null) {
      const sum = (field) => sample.length && sample.every((post) => post[field] !== null) ? sample.reduce((total, post) => total + post[field], 0) : null;
      if (source.metrics.totalViews !== sum('views') || source.metrics.totalReactions !== sum('reactions') || source.metrics.totalForwards !== sum('forwards')) invalid();
      const views = sample.map((post) => post.views).sort((a, b) => a - b); const count = views.length;
      const median = count && sample.every((post) => post.views !== null) ? count % 2 ? views[(count - 1) / 2] : views[count / 2 - 1] + (views[count / 2] - views[count / 2 - 1]) / 2 : null;
      if (source.metrics.medianViews !== median) invalid();
      const dates = sample.map((post) => post.publishedAt).sort();
      if (dates.length ? source.period?.from !== dates[0] || source.period?.to !== dates.at(-1) : source.period !== null) invalid();
    }
    return { ...source, metrics: { ...source.metrics }, period: source.period ? { ...source.period } : null, sample };
  });
  return { schemaVersion: 1, generatedAt: value.generatedAt, sources };
}
