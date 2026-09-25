import { homeRoute, isMiniAppRoute, resolveMiniAppLocation, serializeMiniAppRoute } from "./contracts.js";

// A retry/remount must not replay the SDK's still-present start_param.
// Store only a consumed flag, never Telegram launch data.
const launchConsumed = new WeakSet();

/** URL is the source of truth. Sections replace history; explicit back never leaves miniapp. */
export function createMiniAppRouter(windowObject, runtime, availableSections, tournamentSlugs, availableTeams) {
  const listeners = new Set();
  let disposed = false;
  const resolve = () => resolveMiniAppLocation({ ...windowObject.location,
    pathname: windowObject.location.pathname, search: windowObject.location.search, availableSections, tournamentSlugs, availableTeams });
  let state = resolve();
  const launch = launchConsumed.has(windowObject) || windowObject.history.state?.ycsLaunchConsumed === true
    ? null : runtime.readLaunchTarget();
  launchConsumed.add(windowObject);
  if (launch) {
    const url = new URL(serializeMiniAppRoute(launch), "https://miniapp.invalid");
    state = resolveMiniAppLocation({ pathname: url.pathname, search: url.search, availableSections, tournamentSlugs, availableTeams });
  }
  state ||= { route: homeRoute(), canonicalUrl: "/tg", notice: null };
  const historyState = () => ({ ycsMiniApp: true, ycsLaunchConsumed: true });
  windowObject.history.replaceState(historyState(), "", state.canonicalUrl);
  const emit = () => listeners.forEach((listener) => listener());
  const onPopState = () => {
    const next = resolve();
    if (!next) { windowObject.location.reload(); return; }
    state = next;
    if (next.needsReplace) windowObject.history.replaceState(historyState(), "", next.canonicalUrl);
    emit();
  };
  windowObject.addEventListener("popstate", onPopState);
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    navigate(route) {
      if (disposed || !isMiniAppRoute(route)) return;
      const url = new URL(serializeMiniAppRoute(route), "https://miniapp.invalid");
      const next = resolveMiniAppLocation({ pathname: url.pathname, search: url.search, availableSections, tournamentSlugs, availableTeams });
      if (next.canonicalUrl === state.canonicalUrl) return;
      const method = state.route.screen === "home" && next.route.screen === "tournament" ? "pushState" : "replaceState";
      windowObject.history[method](historyState(), "", next.canonicalUrl);
      state = next;
      emit();
    },
    dispose() { disposed = true; windowObject.removeEventListener("popstate", onPopState); listeners.clear(); },
  };
}
