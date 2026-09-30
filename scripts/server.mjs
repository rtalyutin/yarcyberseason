import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import site from "../worker/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm" };

export function createAssetBinding(directory) {
  const base = realpath(directory);
  return {
    async fetch(request) {
      if (!["GET", "HEAD"].includes(request.method)) {
        return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      let pathname;
      try { pathname = decodeURIComponent(new URL(request.url).pathname); }
      catch { return new Response("Bad request", { status: 400 }); }
      if (pathname.split(/[\\/]/).some((part) => part.startsWith(".")) || pathname.includes("\0")) {
        return new Response("Not found", { status: 404 });
      }
      try {
        const resolvedBase = await base;
        const file = await realpath(path.join(resolvedBase, pathname));
        if (!file.startsWith(resolvedBase + path.sep) || !(await stat(file)).isFile()) {
          return new Response("Not found", { status: 404 });
        }
        const extension = path.extname(file).toLowerCase();
        const headers = { "content-type": types[extension] || "application/octet-stream",
          "cache-control": pathname.startsWith("/assets/") ? "public, max-age=3600" : "no-cache",
          "x-content-type-options": "nosniff" };
        return new Response(request.method === "HEAD" ? null : await readFile(file), { headers });
      } catch (error) {
        if (["ENOENT", "ENOTDIR"].includes(error.code)) return new Response("Not found", { status: 404 });
        throw error;
      }
    },
  };
}

export function createAppServer({ directory = path.join(root, "dist/client"), logger = console } = {}) {
  const env = { ASSETS: createAssetBinding(directory) };
  return createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, "http://localhost");
      const request = new Request(url, { method: incoming.method, headers: incoming.headers });
      const response = url.pathname === "/healthz" && ["GET", "HEAD"].includes(request.method)
        ? new Response(request.method === "HEAD" ? null : '{"status":"ok"}',
          { headers: { "content-type": "application/json", "cache-control": "no-store" } })
        : await site.fetch(request, env);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (incoming.method === "HEAD" || !response.body) outgoing.end();
      else await pipeline(Readable.fromWeb(response.body), outgoing);
    } catch (error) {
      logger.error(`HTTP request failed: ${error.message}`);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "text/plain" });
      outgoing.end("Internal server error");
    }
  });
}

export async function startApp({ port = Number(process.env.PORT || 8080), host = "0.0.0.0",
  directory = path.join(root, "dist/client"), logger = console } = {}) {
  // Fail before accepting traffic if the site build is missing.
  await stat(path.join(directory, "index.html"));
  const server = createAppServer({ directory, logger });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  logger.log(`YCS frontend listening on ${host}:${server.address().port}`);
  return { server, async stop() {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startApp().then((app) => {
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      app.stop().catch((error) => { console.error(error.message); process.exitCode = 1; });
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
