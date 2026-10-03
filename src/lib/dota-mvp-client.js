import { useEffect, useState } from "react";
import { DOTA_RESULTS_URL } from "./dota-results.js";
import { validateMvpSnapshot } from "./dota-mvp.js";
import springSnapshot from "../data/mvp/dota2-main-2026.json" with { type: "json" };

export function dotaMvpUrl(tournamentId) {
  if (typeof tournamentId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tournamentId)) throw new Error("Invalid tournament ID");
  return new URL(`${tournamentId}-mvp.json`, DOTA_RESULTS_URL).href;
}

// One retained confirmed snapshot per tournament. Failed reads never replace it.
export function createDotaMvpClient(tournament, { initialSnapshot = null } = {}) {
  let currentTournament = tournament;
  let state = initialSnapshot ? { snapshot: validateMvpSnapshot(initialSnapshot, tournament), availability: "bundled" } : { snapshot: null, availability: "pending" };
  let hasRemoteSnapshot = false;
  let inflight = null;
  const listeners = new Set();
  const emit = (next) => { state = next; for (const listener of listeners) listener(next); return state; };
  const refresh = (fetcher = fetch) => {
    if (inflight) return inflight;
    if (!state.snapshot) emit({ ...state, availability: "loading" });
    inflight = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const response = await fetcher(dotaMvpUrl(tournament.id), { cache: "no-store", signal: controller.signal });
        if (response.status === 404 && !hasRemoteSnapshot) return state.snapshot ? state : emit({ ...state, availability: "pending" });
        if (!response.ok) throw new Error(`MVP HTTP ${response.status}`);
        const snapshot = validateMvpSnapshot(await response.json(), currentTournament);
        if (state.snapshot && snapshot.revision < state.snapshot.revision) return hasRemoteSnapshot ? emit({ ...state, availability: "stale" }) : state;
        if (state.snapshot && !hasRemoteSnapshot && snapshot.revision === state.snapshot.revision && Date.parse(snapshot.updatedAt) < Date.parse(state.snapshot.updatedAt)) return state;
        if (hasRemoteSnapshot && snapshot.revision === state.snapshot.revision && JSON.stringify(snapshot) !== JSON.stringify(state.snapshot)) throw new Error("Conflicting MVP revision");
        hasRemoteSnapshot = true;
        return emit({ snapshot, availability: "current" });
      } catch {
        if (state.snapshot && !hasRemoteSnapshot) return state;
        return emit({ ...state, availability: "unavailable" });
      } finally {
        clearTimeout(timer);
      }
    })().finally(() => { inflight = null; });
    return inflight;
  };
  return { getState: () => state, refresh, updateTournament: (next) => {
    if (next.id !== tournament.id || next.leagueId !== tournament.leagueId) throw new Error("Wrong MVP tournament update");
    currentTournament = next;
  }, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } };
}

const clients = new Map();
function clientFor(tournament) {
  const key = `${tournament.id}:${tournament.leagueId ?? "unknown"}`;
  if (!clients.has(key)) clients.set(key, createDotaMvpClient(tournament, { initialSnapshot: springSnapshot.tournamentId === tournament.id ? springSnapshot : null }));
  const client = clients.get(key);
  client.updateTournament(tournament);
  return client;
}

export function useDotaMvp(tournament) {
  const client = clientFor(tournament);
  const [current, setCurrent] = useState(client.getState);
  useEffect(() => {
    setCurrent(client.getState());
    const unsubscribe = client.subscribe(setCurrent);
    client.refresh();
    const timer = window.setInterval(() => client.refresh(), 60_000);
    const onFocus = () => client.refresh();
    const onVisible = () => { if (document.visibilityState === "visible") client.refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => { unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisible); };
  }, [client]);
  return current;
}
