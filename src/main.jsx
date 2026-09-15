import React from "react";
import { createRoot } from "react-dom/client";
import { isMiniAppPath } from "./telegram/contracts.js";

const root = createRoot(document.getElementById("root"));
async function boot() {
  try {
    if (isMiniAppPath(window.location.pathname)) {
      const { mountMiniApp } = await import("./telegram/entry.jsx");
      await mountMiniApp(root);
    } else {
      const [{ App }] = await Promise.all([import("./App.jsx"), import("./styles.css")]);
      root.render(<React.StrictMode><App /></React.StrictMode>);
    }
  } catch {
    root.render(<main><p role="alert">Не удалось загрузить приложение.</p><button onClick={() => window.location.reload()}>Попробовать ещё раз</button></main>);
  }
}
root.render(<p role="status">Загружаем ЯрКиберСезон…</p>);
boot();
