import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { agreementOutcomeMessage, captainMessageInput, createCaptainClient, moscowInput, moscowToIso, formatMoscow, reconcileCaptainChat, recoverCaptainCommand } from "../src/telegram/captain-client.js";
import { resolveMiniAppLocation, serializeMiniAppRoute, tournamentRoute } from "../src/telegram/contracts.js";
import { loadMiniAppModel, loadArchivedModels } from "../src/telegram/data/load.js";

test("Moscow picker uses explicit +03 regardless of process/browser timezone", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(moscowToIso("2026-10-12", "19:30"), "2026-10-12T16:30:00.000Z");
      assert.deepEqual(moscowInput("2026-10-12T16:30:00.000Z"), { date: "2026-10-12", time: "19:30" });
      assert.deepEqual(moscowInput("2026-10-12T23:30:00.000Z"), { date: "2026-10-13", time: "02:30" });
      assert.match(formatMoscow("2026-10-12T16:30:00Z"), /19:30.*МСК/);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  for (const [date, time] of [["2026-02-30", "12:00"], ["2026-10-12", "24:00"], ["2026-10-12", "12:99"], ["", ""], ["bad", "12:00"]]) assert.equal(moscowToIso(date, time), null);
});

test("retried agreement reports current consent only for the submitted time and viewer", () => {
  const startsAt = "2026-10-12T16:30:00.000Z";
  const detail = (confirmedTeamIds, time = startsAt) => ({ viewerTeamId: "team-a", proposal: { startsAt: time, confirmedTeamIds } });
  assert.match(agreementOutcomeMessage(detail(["team-a"]), startsAt), /Ваше подтверждение сохранено/);
  assert.match(agreementOutcomeMessage(detail(["team-a", "team-b"], "2026-10-12T19:30:00+03:00"), startsAt), /Оба капитана подтвердили/);
  for (const current of [detail(["team-b"]), detail(["team-a", "team-b"], "2026-10-12T17:30:00.000Z"), { viewerTeamId: "team-a", proposal: null }]) {
    assert.equal(agreementOutcomeMessage(current, startsAt), "Запрос обработан. Предложение уже изменилось — проверьте актуальное время.");
  }
});

test("browser without raw Telegram launch data cannot create authenticated requests", async () => {
  for (const webApp of [null, {}, { initDataUnsafe: { user: { username: "captain" } }, Serverless: { call() { assert.fail("must not call"); } } }]) {
    const client = createCaptainClient(webApp);
    assert.equal(client.available, false);
    await assert.rejects(client.call("access"), { code: "unavailable" });
  }
});

test("bridge uses only Serverless endpoint and raw signed initData, never client-supplied override", async () => {
  let captured;
  const client = createCaptainClient({ initData: "signed-raw", Serverless: { call(name, input, callback) { captured = { name, input }; callback(null, { authorized: false }); } } });
  assert.deepEqual(await client.call("access", { initData: "forged", action: "result" }), { authorized: false });
  assert.deepEqual(captured, { name: "captain", input: { initData: "signed-raw", action: "access" } });
});

test("endpoint conflict/revocation stay definitive; storage uncertainty retains retry semantics", async () => {
  for (const code of ["conflict", "chat_reset", "match_closed", "forbidden", "window_unavailable", "too_late", "storage_unavailable"]) {
    const client = createCaptainClient({ initData: "signed", Serverless: { call(_name, _input, callback) { callback({ type: "ENDPOINT_ERROR", parameters: { code } }); } } });
    await assert.rejects(client.call("agree"), (error) => error.code === code && error.uncertain === (code === "storage_unavailable"));
  }
});

test("message carries the current chat epoch through the bridge", async () => {
  const chatEpoch = "a".repeat(64);
  let captured;
  const client = createCaptainClient({ initData: "signed", Serverless: { call(_name, input, callback) { captured = input; callback(null, { chatEpoch, messages: [] }); } } });
  const message = captainMessageInput({ chatEpoch }, "  Удобно вечером?  ");
  await client.call("message", { ...message, matchId: "match-1", requestId: "fresh-request" });
  assert.equal(captured.expectedChatEpoch, chatEpoch);
  assert.equal(captured.text, "Удобно вечером?");
  assert.equal(captured.requestId, "fresh-request");
});

test("chat reset drops the old retry, keeps its draft, and waits for refreshed detail", () => {
  const oldDetail = { chatEpoch: "a".repeat(64) };
  const command = { action: "message", input: { ...captainMessageInput(oldDetail, "Мой текст"), matchId: "match-1", requestId: "old-id" } };
  const uncertain = recoverCaptainCommand(command, { code: "timeout", uncertain: true });
  assert.equal(uncertain.pending.input.requestId, "old-id");
  assert.equal(uncertain.awaitingChatRefresh, false);
  const reset = recoverCaptainCommand(command, { code: "chat_reset", uncertain: true });
  assert.deepEqual(reset, { pending: null, draft: "Мой текст", awaitingChatRefresh: true });
  assert.throws(() => captainMessageInput(oldDetail, reset.draft, reset.awaitingChatRefresh), { code: "chat_reset" });
  for (const detail of [null, {}, { chatEpoch: "broken" }]) assert.throws(() => captainMessageInput(detail, reset.draft), { code: "chat_reset" });
  const refreshed = captainMessageInput({ chatEpoch: "b".repeat(64) }, reset.draft);
  assert.deepEqual(refreshed, { text: "Мой текст", expectedChatEpoch: "b".repeat(64) });
  assert.equal(Object.hasOwn(refreshed, "requestId"), false, "new intentional send gets a new request identity");
});

test("official closure removes chat text and pending sends, rejects stale retries, preserves result claims", async () => {
  const calls = [];
  const client = createCaptainClient({ initData: "signed", Serverless: { call(_name, input, callback) { calls.push(input); callback(null, { accepted: true }); } } });
  const matchId = "match-1";
  const command = { action: "message", input: { matchId, requestId: "old-message", text: "Old chat text", expectedChatEpoch: "a".repeat(64) } };
  client.pendingCommands.set(matchId, command);
  client.messageDrafts.set(matchId, command.input.text);
  const response = { chatClosed: true, chatEpoch: "a".repeat(64), messages: [{ text: "Old chat text" }], resultClaims: [{ score: [1, 0] }], agreed: { startsAt: "2026-10-12T16:30:00Z" } };
  const closed = reconcileCaptainChat(client, matchId, response);
  assert.deepEqual(closed.messages, []);
  assert.equal(closed.chatEpoch, null);
  assert.equal(client.pendingCommands.has(matchId), false);
  assert.equal(client.messageDrafts.has(matchId), false);
  assert.deepEqual(closed.resultClaims, response.resultClaims);
  assert.deepEqual(closed.agreed, response.agreed);
  const stale = reconcileCaptainChat(client, matchId, { ...response, chatClosed: false });
  assert.equal(stale.chatClosed, true);
  assert.deepEqual(stale.messages, []);
  assert.throws(() => captainMessageInput(stale, "Another send", true), { code: "match_closed" });
  await assert.rejects(client.call("message", command.input), { code: "match_closed", uncertain: false });
  assert.equal(calls.length, 0, "known closed chat never forwards the old retry");
  const resultCommand = { action: "result", input: { matchId, requestId: "result-1", score: [1, 0], comment: "" } };
  client.pendingCommands.set(matchId, resultCommand);
  reconcileCaptainChat(client, matchId, closed);
  assert.equal(client.pendingCommands.get(matchId), resultCommand);
  assert.deepEqual(await client.call("result", resultCommand.input), { accepted: true });
  assert.equal(calls[0].action, "result");
});

test("match_closed definitively cancels a message without recovering a resend draft", () => {
  const command = { action: "message", input: { text: "Do not resend" } };
  assert.deepEqual(recoverCaptainCommand(command, { code: "match_closed", uncertain: true }), {
    pending: null, draft: null, awaitingChatRefresh: false,
  });
});

test("timeout does not accept late callback and repeat preserves full request identity", async () => {
  const inputs = [];
  let late;
  const client = createCaptainClient({ initData: "signed", Serverless: { call(_name, input, callback) { inputs.push(input); if (inputs.length === 1) late = callback; else callback(null, { scheduleVersion: 2 }); } } }, { timeoutMs: 5 });
  const command = { matchId: "match-1", requestId: "original-id", startsAt: "2026-10-12T16:30:00.000Z", expectedScheduleVersion: 1 };
  await assert.rejects(client.call("agree", command), (error) => error.code === "timeout" && error.uncertain);
  late(null, { scheduleVersion: 0 });
  assert.deepEqual(await client.call("agree", command), { scheduleVersion: 2 });
  assert.deepEqual(inputs[0], inputs[1]);
});

test("private section keeps existing path and is omitted when tournament does not allow it", () => {
  assert.equal(serializeMiniAppRoute(tournamentRoute("captain")), "/tg/tournament?section=captain");
  assert.equal(resolveMiniAppLocation({ pathname: "/tg/tournament", search: "?section=captain", availableSections: ["overview", "captain"] }).route.section, "captain");
  assert.equal(resolveMiniAppLocation({ pathname: "/tg/tournament", search: "?section=captain", availableSections: ["overview"] }).route.section, "overview");
});

const bundle = await build({ entryPoints: ["src/telegram/MiniApp.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const module = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { HomeScreen, TournamentScreen } = module.exports;
const current = loadMiniAppModel();

test("cabinet entry is absent without verified access and absent in archives", () => {
  const home = (captainAvailable) => renderToStaticMarkup(React.createElement(HomeScreen, { model: current, captainAvailable, navigate() {} }));
  assert.doesNotMatch(home(false), /Кабинет капитана/);
  assert.match(home(true), /Кабинет капитана/);
  const archive = loadArchivedModels()[0];
  const html = renderToStaticMarkup(React.createElement(TournamentScreen, { model: archive, runtime: {}, route: tournamentRoute("overview", archive.tournament.slug), captainAccess: { authorized: true }, navigate() {} }));
  assert.doesNotMatch(html, /Кабинет капитана/);
});
