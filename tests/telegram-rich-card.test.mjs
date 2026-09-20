import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { richCardCases } from "../scripts/telegram/rich-card-cases.mjs";
import { executeProbe } from "../scripts/telegram/rich-card-probe.mjs";
import { buildRichCard, cardFacts, publicAsset, PUBLIC_ORIGIN } from "../src/telegram/rich-card/model.js";
import { createCardRequest, toPlainMessage, toRichMessage } from "../src/telegram/rich-card/messages.js";
import { renderPreviewCard } from "../src/telegram/rich-card/preview.js";
import { loadMiniAppModel } from "../src/telegram/data/load.js";

const { cases, current } = await richCardCases();
const archive = loadMiniAppModel("cs2-august-2026");
const finalKey = "cs2-august-2026/cs2-aug-grand-final";
const provenance = cases.published.provenance;

test("cards keep published final and demo separate from the empty current tournament", () => {
  assert.equal(current.matches.length, 0); assert.equal(current.participants.length, 16);
  assert.equal(cases.published.provenance.kind, "published");
  assert.match(provenance.revision, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(cases.published.teams.map((team) => team.name), ["bobr1ki", "PIVNAYA KEGA"]);
  assert.deepEqual(cases.published.score, [2, 3]); assert.equal(cases.published.bestOf, "BO5");
  assert.equal(cases.published.currentMap, null); assert.match(cases.published.dateText, /часовой пояс не указан/);
  for (const key of ["planned", "live", "zero"]) assert.equal(cases[key].provenance.kind, "demo");
  assert.equal(loadMiniAppModel().matches.length, 0);
  assert.throws(() => buildRichCard(current, finalKey, provenance), /does not belong/);
  assert.throws(() => buildRichCard(archive, finalKey, { kind: "published" }), /provenance/);
});

test("unknown scores never turn into zero; confirmed zero remains meaningful", () => {
  assert.equal(cases.planned.score, null); assert.equal(cases.live.score, null);
  assert.equal(cases.planned.scoreText, "Подтверждённого счёта пока нет");
  assert.deepEqual(cases.zero.score, [2, 0]); assert.equal(cases.zero.scoreText, "2:0");
  const noScore = structuredClone(archive);
  const match = noScore.matches.find((value) => value.key === finalKey);
  Object.assign(match.result, { confirmed: true, known: false, score: null });
  const card = buildRichCard(noScore, finalKey, provenance);
  assert.equal(card.score, null); assert.match(card.scoreText, /не опубликован/);
});

test("RichCard does not mutate source DTOs or retain mutable score aliases", () => {
  const before = JSON.stringify(archive);
  const card = buildRichCard(archive, finalKey, provenance);
  card.score[0] = 99; card.teams[0].name = "mutated";
  assert.equal(JSON.stringify(archive), before);
});

test("current-map evidence must be explicit, live and dated; stored maps are not inferred as live", () => {
  assert.equal(cases.live.currentMap.number, 1); assert.match(cases.live.currentMap.source, /Тестовый/);
  const model = structuredClone(archive);
  const match = model.matches.find((value) => value.key === finalKey);
  match.currentMap = { ...cases.live.currentMap, confirmed: true };
  assert.throws(() => buildRichCard(model, finalKey, provenance), /live evidence/);
  match.status = "live";
  for (const patch of [{ confirmed: false }, { observedAt: "tomorrow" }, { observedAt: "2026-09-20" }, { source: "" }, { number: 0 }]) {
    match.currentMap = { ...cases.live.currentMap, confirmed: true, ...patch };
    assert.throws(() => buildRichCard(model, finalKey, provenance), /live evidence/);
  }
});

test("all-matches destinations preserve source tournament and use existing Mini App routes", () => {
  for (const card of Object.values(cases)) {
    const url = new URL(card.actions.find((action) => action.id === "matches").url);
    assert.equal(url.origin, PUBLIC_ORIGIN); assert.equal(url.pathname, "/tg/tournament");
    assert.equal(url.searchParams.get("section"), "matches");
    assert.equal(url.searchParams.get("tournament") || "dota2-autumn-2026", card.tournament.slug);
    assert.equal(card.actions.filter((action) => action.kind === "demo").length, 3);
  }
});

test("plain and rich messages carry the same facts, pending notices, dates and demo disclosures", () => {
  for (const card of Object.values(cases)) {
    const plain = toPlainMessage(card); const rich = toRichMessage(card);
    const richText = rich.rich_message.blocks.filter((block) => typeof block.text === "string").map((block) => block.text);
    assert.deepEqual(richText, cardFacts(card));
    for (const fact of cardFacts(card)) assert.ok(plain.text.includes(fact));
    assert.equal(plain.parse_mode, undefined); assert.equal(plain.entities, undefined);
    assert.equal(plain.link_preview_options.is_disabled, true);
    assert.equal(plain.reply_markup.inline_keyboard[0][0].url, card.actions.at(-1).url);
  }
});

test("Bot API 10.3 representation uses one blocks variant, typed media and explicit disabled actions", () => {
  const payload = toRichMessage(cases.published).rich_message;
  assert.deepEqual(Object.keys(payload).sort(), ["blocks", "skip_entity_detection"]);
  assert.equal(payload.skip_entity_detection, true);
  const media = payload.blocks.find((block) => block.type === "collage").blocks;
  assert.equal(media.length, 3);
  for (const block of media) {
    assert.equal(block.type, "photo"); assert.equal(block.photo.type, "photo");
    assert.ok(block.photo.media.startsWith(PUBLIC_ORIGIN + "/assets/")); assert.equal(typeof block.caption.text, "string");
  }
  const rows = payload.blocks.filter((block) => block.type === "buttons");
  assert.equal(rows[0].buttons.length, 3);
  for (const button of rows[0].buttons) {
    assert.deepEqual(Object.keys(button).sort(), ["disabled", "text"]); assert.deepEqual(button.disabled, {}); assert.match(button.text, /демо/);
  }
  assert.equal(rows[1].buttons[0].url, cases.published.actions.at(-1).url);
  assert.equal(rows[1].buttons[0].web_app, undefined);
});

test("send and edit select exact methods and never mix rich and plain representations", () => {
  for (const format of ["rich", "plain"]) {
    const send = createCardRequest(cases.published, { format, chatId: "-100123" });
    assert.equal(send.method, format === "rich" ? "sendRichMessage" : "sendMessage");
    assert.equal(send.body.chat_id, "-100123"); assert.equal(send.body.message_id, undefined);
    const edit = createCardRequest(cases.zero, { format, chatId: "123", messageId: 17 });
    assert.equal(edit.method, "editMessageText"); assert.equal(edit.body.message_id, 17);
    assert.equal(Boolean(edit.body.rich_message), format === "rich"); assert.equal(Boolean(edit.body.text), format === "plain");
  }
  assert.throws(() => createCardRequest(cases.published, { format: "automatic" }));
  assert.throws(() => createCardRequest(cases.published, { chatId: "@public_channel" }));
  assert.throws(() => createCardRequest(cases.published, { messageId: 0 }));
});

test("untrusted markup stays literal; hostile media or tournament links are rejected", () => {
  const card = structuredClone(cases.published);
  card.teams[0].name = '<img src=x onerror="alert(1)"> @everyone';
  const html = renderPreviewCard(card, { id: "test" });
  assert.doesNotMatch(html, /<img src=x/); assert.match(html, /&lt;img src=x/);
  assert.ok(toPlainMessage(card).text.includes(card.teams[0].name));
  assert.equal(toRichMessage(card).rich_message.skip_entity_detection, true);
  for (const url of ["javascript:alert(1)", "https://evil.test/a.jpg", "https://user:pass@xn--90aiaibl0ahlel5n.xn--p1ai/assets/a.jpg"]) {
    card.teams[0].logoUrl = url; assert.throws(() => toRichMessage(card));
  }
  for (const path of ["https://evil.test/a", "/assets/../secret", "/assets/x.svg?token=secret", "/x.jpg"]) assert.equal(publicAsset(path), null);
  const crossed = structuredClone(cases.published); crossed.actions.at(-1).url = cases.planned.actions.at(-1).url;
  assert.throws(() => toPlainMessage(crossed), /destination/);
});

test("oversize fallback fails explicitly instead of dropping facts or silently truncating", () => {
  const card = structuredClone(cases.published); card.teams[0].name = "X".repeat(4097);
  assert.throws(() => toPlainMessage(card), /text limit/);
});

const request = createCardRequest(cases.planned, { chatId: "123" });
const token = "123:FAKE_TEST_ONLY";
test("one authorized probe records Telegram delivery evidence without exposing credentials", async () => {
  let calls = 0;
  const result = await executeProbe(request, { token, allowedChatId: "123", fetchImpl: async (url, options) => {
    calls++; assert.equal(url, `https://api.telegram.org/bot${token}/sendRichMessage`);
    assert.equal(options.redirect, "error"); assert.deepEqual(JSON.parse(options.body), request.body);
    return { status: 200, json: async () => ({ ok: true, result: { message_id: 42, chat: { id: 123 } } }) };
  } });
  assert.equal(calls, 1); assert.deepEqual(result, { status: "SUCCEEDED", chatId: "123", messageId: 42 });
  assert.ok(!JSON.stringify(result).includes(token));
});

test("editing must confirm the requested message; invalid delivery IDs remain UNKNOWN", async () => {
  const edit = createCardRequest(cases.zero, { chatId: "123", messageId: 17 });
  for (const messageId of [42, 0, -1]) {
    let calls = 0;
    const result = await executeProbe(edit, { token, allowedChatId: "123", fetchImpl: async () => {
      calls++; return { status: 200, json: async () => ({ ok: true, result: { message_id: messageId, chat: { id: 123 } } }) };
    } });
    assert.equal(result.status, "UNKNOWN"); assert.equal(calls, 1);
  }
  const success = await executeProbe(edit, { token, allowedChatId: "123", fetchImpl: async () => ({ status: 200, json: async () => ({ ok: true, result: { message_id: 17, chat: { id: 123 } } }) }) });
  assert.equal(success.status, "SUCCEEDED"); assert.equal(success.messageId, 17);
  const invalidSend = await executeProbe(request, { token, allowedChatId: "123", fetchImpl: async () => ({ status: 200, json: async () => ({ ok: true, result: { message_id: 0, chat: { id: 123 } } }) }) });
  assert.equal(invalidSend.status, "UNKNOWN");
});

test("timeouts, malformed replies and server errors stay UNKNOWN with no fallback or retry", async () => {
  const responses = [
    async () => { throw new Error(`timeout ${token}`); },
    async () => ({ status: 200, json: async () => { throw new Error(token); } }),
    async () => ({ status: 500, json: async () => ({ ok: false, error_code: 500, description: token }) }),
    async () => ({ status: 200, json: async () => ({ ok: true, result: { message_id: 4, chat: { id: 999 } } }) }),
  ];
  for (const respond of responses) {
    let calls = 0;
    const result = await executeProbe(request, { token, allowedChatId: "123", fetchImpl: async () => { calls++; return respond(); } });
    assert.equal(result.status, "UNKNOWN"); assert.equal(calls, 1); assert.ok(!JSON.stringify(result).includes(token));
  }
});

test("rejection is FAILED; unauthorized targets fail before any request", async () => {
  const result = await executeProbe(request, { token, allowedChatId: "123", fetchImpl: async () => ({ status: 400, json: async () => ({ ok: false, error_code: 400, description: token }) }) });
  assert.equal(result.status, "FAILED"); assert.equal(result.errorCode, 400); assert.ok(!JSON.stringify(result).includes(token));
  let calls = 0;
  await assert.rejects(executeProbe(request, { token, allowedChatId: "999", fetchImpl: async () => { calls++; } }), /explicitly allowed/);
  assert.equal(calls, 0);
});

test("CLI defaults to dry-run even with a configured token and prints no credential", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `globalThis.fetch=()=>{throw Error('NETWORK_MUST_NOT_BE_CALLED')}; const {main}=await import('./scripts/telegram/rich-card-probe.mjs'); await main(['--case','published','--format','plain']);`], { cwd: new URL("../", import.meta.url), env: { ...process.env, YCS_TELEGRAM_BOT_TOKEN: token }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "PREPARED"); assert.equal(output.network, false); assert.equal(output.body.chat_id, undefined);
  assert.ok(!result.stdout.includes(token));
});

test("self-contained preview preserves all states, labels and original logo bytes", async () => {
  const html = await readFile(new URL("../docs/telegram-miniapp/rich-card-prototype.html", import.meta.url), "utf8");
  assert.match(html, /Не отправлено в Telegram/); assert.match(html, /Матчи ещё не опубликованы/);
  for (const id of ["published", "planned", "live", "zero"]) assert.ok(html.includes(`id="${id}"`));
  assert.equal((html.match(/<article class="scenario"/g) || []).length, 4);
  const logo = await readFile(new URL("../public/assets/ycs-logo.jpg", import.meta.url));
  assert.ok(html.includes(logo.toString("base64"))); assert.match(html, /@media\(max-width:760px\)/);
  assert.match(html, /data-notice=/); assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /api\.telegram\.org|YCS_TELEGRAM_BOT_TOKEN/);
});
