import { createBrowserRuntime } from "./browser.js";
import { createTelegramRuntime } from "./telegram.js";

export function createRuntime(windowObject = globalThis.window) {
  const webApp = windowObject?.Telegram?.WebApp;
  return webApp && typeof webApp === "object"
    ? createTelegramRuntime(webApp, windowObject)
    : createBrowserRuntime(windowObject);
}
