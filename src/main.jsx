import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { isMiniAppPath } from "./telegram/contracts.js";

const rootNode = document.getElementById("root");
const prerendered = rootNode.hasAttribute("data-prerendered");
let root;
if (!prerendered) {
  root = createRoot(rootNode);
  root.render(<p role="status">Загружаем ЯрКиберСезон…</p>);
}
async function boot() {
  try {
    if (isMiniAppPath(window.location.pathname)) {
      const { mountMiniApp } = await import("./telegram/entry.jsx");
      root ||= createRoot(rootNode);
      await mountMiniApp(root);
    } else {
      const [{ App }] = await Promise.all([import("./App.jsx"), import("./styles.css")]);
      const app = <React.StrictMode><App initialPath={window.location.pathname} /></React.StrictMode>;
      if (prerendered) root = hydrateRoot(rootNode, app);
      else root.render(app);
    }
  } catch {
    const fallback = <main><p role="alert">Не удалось загрузить приложение.</p><button onClick={() => window.location.reload()}>Попробовать ещё раз</button></main>;
    if (root) root.render(fallback);
    else { root = createRoot(rootNode); root.render(fallback); }
  }
}
boot();
