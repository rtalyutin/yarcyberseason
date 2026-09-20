import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { richCardCases } from "./rich-card-cases.mjs";
import { createCardRequest } from "../../src/telegram/rich-card/messages.js";

// Server-only. One request per invocation, no retries or fallback sends.
export async function executeProbe(request, { token, allowedChatId, fetchImpl = fetch, signal } = {}) {
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new TypeError("Configure the server token");
  if (!request.body.chat_id || request.body.chat_id !== allowedChatId || !/^-?[1-9]\d*$/.test(allowedChatId)) throw new TypeError("Test chat was not explicitly allowed");
  if (!["sendRichMessage", "sendMessage", "editMessageText"].includes(request.method)) throw new TypeError("Unsupported test operation");
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/${request.method}`, {
      method: "POST", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body), signal: signal || AbortSignal.timeout(15000),
    });
    let body;
    try { body = await response.json(); } catch { return { status: "UNKNOWN", reason: "Response was not readable. Verify the chat before any retry." }; }
    if (response.status >= 500) return { status: "UNKNOWN", reason: "Server outcome is uncertain. Verify the chat before any retry." };
    if (body.ok === true && Number.isSafeInteger(body.result?.message_id) && body.result.message_id > 0 &&
      String(body.result?.chat?.id) === request.body.chat_id &&
      (request.method !== "editMessageText" || body.result.message_id === request.body.message_id)) {
      return { status: "SUCCEEDED", chatId: request.body.chat_id, messageId: body.result.message_id };
    }
    if (body.ok === false && Number.isInteger(body.error_code) && body.error_code >= 400 && body.error_code < 500) {
      return { status: "FAILED", errorCode: body.error_code, reason: "Telegram rejected this request. No automatic fallback or retry." };
    }
    return { status: "UNKNOWN", reason: "Missing or mismatched delivery evidence. Verify the chat before any retry." };
  } catch { return { status: "UNKNOWN", reason: "Network or timeout. Verify the chat before any retry." }; }
}

function options(args) {
  const parsed = { execute: false };
  const names = new Set(["case", "format", "chat", "allow-chat", "message-id", "receipt"]);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--execute") { parsed.execute = true; continue; }
    const name = args[i].slice(2);
    if (!args[i].startsWith("--") || !names.has(name) || !args[i + 1] || args[i + 1].startsWith("--")) throw new TypeError("Invalid probe arguments");
    parsed[name] = args[++i];
  }
  return parsed;
}
export async function main(args = process.argv.slice(2)) {
  const opts = options(args);
  const { cases } = await richCardCases();
  const card = cases[opts.case || "planned"];
  if (!card) throw new TypeError("Choose planned, live, zero or published");
  const request = createCardRequest(card, { format: opts.format || "rich", chatId: opts.chat, messageId: opts["message-id"] === undefined ? undefined : Number(opts["message-id"]) });
  if (!opts.execute) { process.stdout.write(JSON.stringify({ status: "PREPARED", network: false, provenance: card.provenance, ...request }, null, 2) + "\n"); return; }
  if (!opts.receipt || !opts.chat || opts.chat !== opts["allow-chat"]) throw new TypeError("Execution requires --chat, identical --allow-chat and a fresh --receipt outside the repository");
  const path = resolve(opts.receipt);
  const repository = resolve(new URL("../../", import.meta.url).pathname);
  if (path === repository || path.startsWith(repository + "/")) throw new TypeError("Delivery receipt must stay outside the public repository");
  const token = process.env.YCS_TELEGRAM_BOT_TOKEN;
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new TypeError("Configure YCS_TELEGRAM_BOT_TOKEN on the server; do not put it in arguments");
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "wx", 0o600); // Existing attempt must be examined, never replayed implicitly.
  const receipt = { method: request.method, chatId: opts.chat, source: card.provenance, requestHash: createHash("sha256").update(JSON.stringify(request)).digest("hex"), attemptedAt: new Date().toISOString(), status: "IN_PROGRESS" };
  try {
    await handle.writeFile(JSON.stringify(receipt, null, 2)); await handle.sync();
    const result = await executeProbe(request, { token, allowedChatId: opts["allow-chat"] });
    await handle.truncate(0);
    await handle.write(JSON.stringify({ ...receipt, ...result }, null, 2), 0, "utf8"); await handle.sync();
    process.stdout.write(JSON.stringify(result) + "\n");
    if (result.status !== "SUCCEEDED") process.exitCode = 2;
  } finally { await handle.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { process.stderr.write("Probe stopped. Check explicit test arguments, server configuration and existing receipt. No automatic retry.\n"); process.exitCode = 1; });
}
