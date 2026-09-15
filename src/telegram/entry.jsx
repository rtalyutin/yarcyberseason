import React from "react";
import MiniApp from "./MiniApp.jsx";
import { loadTelegramBridge } from "./runtime/load-bridge.js";
import { createRuntime } from "./runtime/create-runtime.js";
import { createBrowserRuntime } from "./runtime/browser.js";
import "./styles/miniapp.css";

export async function mountMiniApp(root) {
  root.render(<main className="tg-app"><p role="status">Загружаем турнир…</p></main>);
  await loadTelegramBridge();
  // The official SDK also exposes WebApp in a normal browser (platform=unknown).
  const runtimeFactory = () => window.Telegram?.WebApp?.platform === "unknown"
    ? createBrowserRuntime(window) : createRuntime(window);
  root.render(<React.StrictMode><MiniApp runtimeFactory={runtimeFactory} /></React.StrictMode>);
}
