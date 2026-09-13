import { lazy, Suspense } from "react";
import { Prototype } from "./Prototype.jsx";
const ForMari = lazy(() => import("./components/ForMari.jsx"));
const WebMcpPage = lazy(() => import("./components/WebMcpPage.jsx"));
export function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/webmcp") {
    return <Suspense fallback={<p role="status">Загружаем данные ЯКС…</p>}><WebMcpPage /></Suspense>;
  }
  if (window.location.pathname.replace(/\/$/, "") === "/forMari") {
    return <Suspense fallback={<p role="status">Загружаем схему…</p>}><ForMari /></Suspense>;
  }
  return <Prototype />;
}
