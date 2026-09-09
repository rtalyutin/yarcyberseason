import { lazy, Suspense } from "react";
import { Prototype } from "./Prototype.jsx";
const ForMari = lazy(() => import("./components/ForMari.jsx"));
export function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/forMari") {
    return <Suspense fallback={<p role="status">Загружаем схему…</p>}><ForMari /></Suspense>;
  }
  return <Prototype />;
}
