import { assertRuntimePort, isUiAction, routeFromStartTarget } from "../contracts.js";

const px = (value) => Number.isFinite(value) ? `${value}px` : "0px";

export function createTelegramRuntime(webApp, windowObject = globalThis.window) {
  if (!webApp || typeof webApp !== "object") throw new TypeError("Telegram WebApp bridge is required");
  const cleanups = new Set();
  let backHandler = null;
  let disposed = false;

  const setViewportVariables = () => {
    const style = windowObject?.document?.documentElement?.style;
    if (!style) return;
    if (Number.isFinite(webApp.viewportHeight)) style.setProperty("--tg-viewport-height", px(webApp.viewportHeight));
    for (const [name, value] of Object.entries({
      "--tg-safe-area-top": webApp.safeAreaInset?.top,
      "--tg-safe-area-right": webApp.safeAreaInset?.right,
      "--tg-safe-area-bottom": webApp.safeAreaInset?.bottom,
      "--tg-safe-area-left": webApp.safeAreaInset?.left,
      "--tg-content-safe-area-top": webApp.contentSafeAreaInset?.top,
      "--tg-content-safe-area-right": webApp.contentSafeAreaInset?.right,
      "--tg-content-safe-area-bottom": webApp.contentSafeAreaInset?.bottom,
      "--tg-content-safe-area-left": webApp.contentSafeAreaInset?.left,
    })) style.setProperty(name, px(value));
  };

  const addWebAppEvent = (name, handler) => {
    if (typeof webApp.onEvent !== "function") return () => {};
    webApp.onEvent(name, handler);
    const cleanup = () => {
      webApp.offEvent?.(name, handler);
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    return cleanup;
  };

  const port = {
    kind: "telegram",
    async init() {
      if (disposed) return;
      webApp.expand?.();
      setViewportVariables();
      addWebAppEvent("viewportChanged", setViewportVariables);
      addWebAppEvent("safeAreaChanged", setViewportVariables);
      addWebAppEvent("contentSafeAreaChanged", setViewportVariables);
    },
    ready() { if (!disposed) webApp.ready?.(); },
    readLaunchTarget() {
      if (disposed) return null;
      return routeFromStartTarget(webApp.initDataUnsafe?.start_param);
    },
    setBackHandler(handler) {
      if (backHandler) webApp.BackButton?.offClick?.(backHandler);
      backHandler = typeof handler === "function" ? handler : null;
      if (backHandler) {
        webApp.BackButton?.onClick?.(backHandler);
        webApp.BackButton?.show?.();
      } else webApp.BackButton?.hide?.();
    },
    openExternal(action) {
      if (disposed || !isUiAction(action) || action.kind !== "external") return;
      const url = new URL(action.url);
      if (url.hostname === "t.me" || url.hostname.endsWith(".t.me")) webApp.openTelegramLink?.(url.href);
      else webApp.openLink?.(url.href);
    },
    onResume(handler) {
      if (disposed || typeof handler !== "function") return () => {};
      const removeActivated = addWebAppEvent("activated", handler);
      const documentObject = windowObject.document;
      const onVisible = () => { if (documentObject.visibilityState === "visible") handler(); };
      documentObject.addEventListener("visibilitychange", onVisible);
      const cleanup = () => {
        removeActivated();
        documentObject.removeEventListener("visibilitychange", onVisible);
        cleanups.delete(cleanup);
      };
      cleanups.add(cleanup);
      return cleanup;
    },
    dispose() {
      if (disposed) return;
      port.setBackHandler(null);
      for (const cleanup of [...cleanups]) cleanup();
      disposed = true;
    },
  };
  return assertRuntimePort(port);
}
