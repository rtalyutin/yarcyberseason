import { useEffect, useState } from "react";
import baseline from "../data/tournaments/dota2-autumn-2026.json";
import { updateDotaTournament } from "../data/tournaments/index.js";
import { rebuildCommunity } from "../data/community.js";
import { applyDotaSnapshot, DOTA_RESULTS_URL, validateDotaSnapshot } from "./dota-results.js";

let latest = null;
let state = { revision: 0, availability: "pending" };
const listeners = new Set();
const emit = (next) => { state = next; for (const listener of listeners) listener(next); };

export async function refreshDotaResults(fetcher = fetch) {
  try {
    const response = await fetcher(DOTA_RESULTS_URL, { cache: "no-store" });
    if (response.status === 404 && !latest) { emit({ ...state, availability: "pending" }); return state; }
    if (!response.ok) throw new Error(`S3 HTTP ${response.status}`);
    const snapshot = validateDotaSnapshot(await response.json(), baseline);
    if (latest && snapshot.revision < latest.revision) return state;
    if (latest && snapshot.revision === latest.revision) {
      if (JSON.stringify(snapshot) !== JSON.stringify(latest)) throw new Error("Conflicting S3 revision");
      emit({ ...state, availability: "current" });
      return state;
    }
    const updated = applyDotaSnapshot(baseline, snapshot);
    updateDotaTournament(updated);
    rebuildCommunity();
    latest = snapshot;
    emit({ revision: snapshot.revision, availability: "current" });
  } catch {
    emit({ ...state, availability: "unavailable" });
  }
  return state;
}

export function useDotaResults() {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    refreshDotaResults();
    const timer = window.setInterval(() => refreshDotaResults(), 60_000);
    const onFocus = () => refreshDotaResults();
    const onVisible = () => { if (document.visibilityState === "visible") refreshDotaResults(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => { listeners.delete(setCurrent); window.clearInterval(timer);
      window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return current;
}
