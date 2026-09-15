export const BRIDGE_URL = "https://telegram.org/js/telegram-web-app.js?63";
export const BRIDGE_TIMEOUT_MS = 4000;
let bridgePromise;

// Load only in the miniapp entry, before creating the runtime. Failure stays readable in browser mode.
export function loadTelegramBridge(windowObject = window, timeoutMs = BRIDGE_TIMEOUT_MS) {
  if (windowObject.Telegram?.WebApp) return Promise.resolve(true);
  if (bridgePromise) return bridgePromise;
  bridgePromise = new Promise((resolve) => {
    const script = windowObject.document.createElement("script");
    script.src = BRIDGE_URL;
    script.async = true;
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      windowObject.clearTimeout(timer);
      script.onload = script.onerror = null;
      if (!ok) script.remove();
      resolve(ok);
    };
    const timer = windowObject.setTimeout(() => finish(false), timeoutMs);
    script.onload = () => finish(Boolean(windowObject.Telegram?.WebApp));
    script.onerror = () => finish(false);
    windowObject.document.head.appendChild(script);
  });
  return bridgePromise;
}
