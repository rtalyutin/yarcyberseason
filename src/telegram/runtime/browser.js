import { assertRuntimePort, isUiAction, routeFromStartTarget } from "../contracts.js";

export function createBrowserRuntime(windowObject = globalThis.window) {
  const resumeCleanups = new Set();
  let disposed = false;

  const port = {
    kind: "browser",
    async init() {},
    ready() {},
    readLaunchTarget() {
      if (disposed || !windowObject?.location) return null;
      const params = new URLSearchParams(windowObject.location.search || "");
      return routeFromStartTarget(params.get("startapp") || params.get("tgWebAppStartParam"));
    },
    setBackHandler() {},
    openExternal(action) {
      if (disposed || !isUiAction(action) || action.kind !== "external") return;
      windowObject.open(action.url, "_blank", "noopener,noreferrer");
    },
    onResume(handler) {
      if (disposed || typeof handler !== "function") return () => {};
      const documentObject = windowObject.document;
      const onVisible = () => { if (documentObject.visibilityState === "visible") handler(); };
      documentObject.addEventListener("visibilitychange", onVisible);
      const cleanup = () => {
        documentObject.removeEventListener("visibilitychange", onVisible);
        resumeCleanups.delete(cleanup);
      };
      resumeCleanups.add(cleanup);
      return cleanup;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of [...resumeCleanups]) cleanup();
    },
  };
  return assertRuntimePort(port);
}
