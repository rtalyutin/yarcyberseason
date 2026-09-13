// Serialize registrations per document. StrictMode/HMR may mount a second
// instance before the previous async registerTool call settles.
const queues = new WeakMap();
export function attachWebMcp(context, tools, onStatus = () => {}) {
  if (typeof context?.registerTool !== 'function') {
    onStatus({ state: 'unsupported', count: 0 });
    return () => {};
  }
  let cancelled = false;
  let registeredCount = 0;
  // The current Document API unregisters via the registration AbortSignal.
  // It does not expose an unregisterTool method.
  const controller = new AbortController();
  const cleanup = () => controller.abort();
  onStatus({ state: 'connecting', count: 0 });
  const previous = queues.get(context) || Promise.resolve();
  let release;
  const released = new Promise((resolve) => { release = resolve; });
  const ready = previous.catch(() => {}).then(async () => {
    try {
      for (const tool of tools) {
        if (cancelled) break;
        await context.registerTool(tool, { signal: controller.signal });
        registeredCount++;
      }
      if (cancelled) cleanup();
      else onStatus({ state: 'ready', count: registeredCount });
    } catch {
      cleanup();
      if (!cancelled) onStatus({ state: 'error', count: 0 });
    }
  });
  queues.set(context, ready.then(() => released).then(cleanup));
  return () => { cancelled = true; cleanup(); release(); };
}
