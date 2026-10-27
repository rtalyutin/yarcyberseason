import { lazy, Suspense, useEffect } from "react";
import { ThemedUtilityShell } from "./components/ThemedUtilityShell.jsx";
import { Prototype } from "./Prototype.jsx";
import WebMcpPage from "./components/WebMcpPage.jsx";
import OrganizerPage from "./components/OrganizerPage.jsx";
import { applyPageMetadata } from "./lib/page-metadata.js";
const ForMari = lazy(() => import("./components/ForMari.jsx"));
import { normalizePublicPath } from "./lib/public-routes.js";
import "./atlas.css";

export function App({ initialPath }) {
  const path = normalizePublicPath(initialPath ?? (typeof window === "undefined" ? "/" : window.location.pathname));
  useEffect(() => { applyPageMetadata(path); }, [path]);
  if (path === "/org" || path === "/orgs") return <ThemedUtilityShell><OrganizerPage /></ThemedUtilityShell>;
  if (path === "/webmcp") return <ThemedUtilityShell><WebMcpPage /></ThemedUtilityShell>;
  if (path === "/forMari") {
    return <ThemedUtilityShell><Suspense fallback={<p role="status">Загружаем схему…</p>}><ForMari /></Suspense></ThemedUtilityShell>;
  }
  return <Prototype initialPath={path} />;
}
