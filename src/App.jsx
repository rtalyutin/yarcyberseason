import { lazy, Suspense, useEffect } from "react";
import { Prototype } from "./Prototype.jsx";
import WebMcpPage from "./components/WebMcpPage.jsx";
import { applyPageMetadata } from "./lib/page-metadata.js";
const ForMari = lazy(() => import("./components/ForMari.jsx"));
import { normalizePublicPath } from "./lib/public-routes.js";

export function App({ initialPath }) {
  const path = normalizePublicPath(initialPath ?? (typeof window === "undefined" ? "/" : window.location.pathname));
  useEffect(() => { applyPageMetadata(path); }, [path]);
  if (path === "/webmcp") return <WebMcpPage />;
  if (path === "/forMari") {
    return <Suspense fallback={<p role="status">Загружаем схему…</p>}><ForMari /></Suspense>;
  }
  return <Prototype initialPath={path} />;
}
