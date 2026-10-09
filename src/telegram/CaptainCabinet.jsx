import React, { useEffect, useRef, useState } from "react";
import { agreementOutcomeMessage, captainErrorMessage, captainMessageInput, formatMoscow, hasCaptainChatEpoch, moscowInput, moscowToIso, newCaptainRequestId, reconcileCaptainChat, recoverCaptainCommand } from "./captain-client.js";

const chatClosedMessage = "Матч завершён. Переписка удалена, отправка сообщений закрыта.";

export function CaptainCabinet({ client, access, runtime, onAccessLost, onRules }) {
  const [selected, setSelected] = useState("");
  const matches = access?.matches || [];
  const matchId = matches.some((match) => match.id === selected) ? selected : matches[0]?.id;
  if (!client?.available || !access?.authorized) return <section className="tg-section-content"><h2>Кабинет капитана</h2><p role="status">Кабинет доступен назначенным капитанам после входа через Telegram.</p></section>;
  return <section className="tg-captain" aria-labelledby="captain-title">
    <div className="tg-captain-heading"><div><p className="tg-kicker">{access.team.name}</p><h2 id="captain-title">Кабинет капитана</h2></div><span>Переписка и подготовка матча</span></div>
    {!matches.length ? <p className="tg-empty">Матчи вашей команды пока не назначены.</p> : <>
      <label className="tg-captain-select">Матч<select value={matchId} onChange={(event) => setSelected(event.target.value)}>{matches.map((match) => <option key={match.id} value={match.id}>{match.team1.name} — {match.team2.name} · {match.round}</option>)}</select></label>
      <CaptainMatch key={matchId} client={client} matchId={matchId} runtime={runtime} onAccessLost={onAccessLost} onRules={onRules} />
    </>}
  </section>;
}

function CaptainMatch({ client, matchId, runtime, onAccessLost, onRules }) {
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(() => client.pendingCommands.get(matchId) || null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(() => client.messageDrafts.get(matchId) || "");
  const [chatRefreshing, setChatRefreshing] = useState(true);
  const [picker, setPicker] = useState({ date: "", time: "" });
  const [editingVersion, setEditingVersion] = useState(null);
  const [score, setScore] = useState(["", ""]);
  const [comment, setComment] = useState("");
  const serial = useRef(0);
  const mounted = useRef(true);
  const mutating = useRef(false);
  const reading = useRef(false);
  const textInput = useRef(null);
  const focusMessage = useRef(false);
  const scroller = useRef(null);
  const nearBottom = useRef(true);
  const lost = useRef(onAccessLost);
  lost.current = onAccessLost;

  async function reload() {
    if (mutating.current || reading.current) return;
    reading.current = true;
    const version = ++serial.current;
    try {
      const response = await client.call("match", { matchId });
      const hadPendingMessage = client.pendingCommands.get(matchId)?.action === "message";
      const wasChatClosed = client.closedChats.has(matchId);
      const next = reconcileCaptainChat(client, matchId, response);
      if (mounted.current && version === serial.current) {
        const previous = client.pendingCommands.get(matchId);
        if (next.chatClosed) {
          setPending((current) => current?.action === "message" ? null : current);
          setText(""); if (hadPendingMessage || !wasChatClosed) setNotice(chatClosedMessage);
        } else if (hasCaptainChatEpoch(next) && previous?.action === "message" && previous.input.expectedChatEpoch !== next.chatEpoch) {
          client.pendingCommands.delete(matchId);
          client.messageDrafts.set(matchId, previous.input.text);
          setPending(null); setText(previous.input.text);
          setNotice("Переписка обновилась. Повтор прежнего запроса отменён. Текст остался в черновике — отправьте его заново, если нужно.");
        }
        setDetail(next); setLoadError(""); setChatRefreshing(!next.chatClosed && !hasCaptainChatEpoch(next));
      }
    } catch (error) {
      if (mounted.current && version === serial.current) {
        if (["forbidden", "unauthorized"].includes(error.code)) lost.current?.();
        setLoadError(captainErrorMessage(error));
      }
    } finally { reading.current = false; }
  }

  useEffect(() => {
    mounted.current = true;
    reload();
    const timer = setInterval(() => { if (document.visibilityState === "visible") reload(); }, 5000);
    const stopResume = runtime.onResume(reload);
    return () => { mounted.current = false; ++serial.current; clearInterval(timer); stopResume(); };
  }, [client, matchId, runtime]);

  useEffect(() => {
    if (detail && editingVersion === null) setPicker(moscowInput(detail.proposal?.startsAt || detail.agreed?.startsAt || detail.match.scheduledAt));
  }, [detail?.scheduleVersion, editingVersion, detail?.match.scheduledAt]);

  useEffect(() => {
    if (nearBottom.current && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [detail?.messages.length]);

  useEffect(() => {
    if (!busy && !pending && focusMessage.current) { focusMessage.current = false; textInput.current?.focus(); }
  }, [busy, pending]);

  async function submit(action, input) {
    if (mutating.current || pending) return;
    let requestId;
    try {
      if (action === "message") input = captainMessageInput(detail, input.text, chatRefreshing);
      requestId = newCaptainRequestId();
    } catch (error) { setNotice(captainErrorMessage(error)); return; }
    await runCommand({ action, input: { ...input, matchId, requestId }, uncertain: false });
  }

  async function runCommand(command) {
    if (mutating.current) return;
    mutating.current = true;
    const version = ++serial.current;
    client.pendingCommands.set(matchId, command);
    setPending(command); setBusy(true); setNotice("");
    try {
      const next = reconcileCaptainChat(client, matchId, await client.call(command.action, command.input));
      client.pendingCommands.delete(matchId);
      if (command.action === "message") client.messageDrafts.delete(matchId);
      if (!mounted.current || version !== serial.current) return;
      setDetail(next); setPending(null); setLoadError(""); setChatRefreshing(!next.chatClosed && !hasCaptainChatEpoch(next));
      if (next.chatClosed) setText("");
      if (command.action === "message") { setText(""); nearBottom.current = true; focusMessage.current = !next.chatClosed; setNotice(next.chatClosed ? chatClosedMessage : "Сообщение отправлено."); }
      if (command.action === "agree") { setEditingVersion(null); setPicker(moscowInput(next.proposal?.startsAt || next.agreed?.startsAt)); setNotice(agreementOutcomeMessage(next, command.input.startsAt)); }
      if (command.action === "result") { setScore(["", ""]); setComment(""); setNotice("Заявка о результате сохранена для организатора."); }
    } catch (error) {
      const recovery = recoverCaptainCommand(command, error);
      if (recovery.pending) client.pendingCommands.set(matchId, recovery.pending);
      else client.pendingCommands.delete(matchId);
      if (recovery.awaitingChatRefresh) client.messageDrafts.set(matchId, recovery.draft);
      const messageClosed = command.action === "message" && error.code === "match_closed";
      const closedDetail = messageClosed ? reconcileCaptainChat(client, matchId, { ...detail, chatClosed: true }) : null;
      if (!mounted.current || version !== serial.current) return;
      setPending(recovery.pending);
      if (messageClosed) {
        setDetail(closedDetail); setChatRefreshing(false); setText("");
      } else if (recovery.awaitingChatRefresh) {
        setChatRefreshing(true); setText(recovery.draft);
        setDetail((current) => current ? { ...current, chatEpoch: null, messages: [] } : current);
      }
      if (["forbidden", "unauthorized"].includes(error.code)) lost.current?.();
      setNotice(messageClosed ? chatClosedMessage : recovery.pending ? "Ответ не получен: запрос мог быть обработан. Данные перечитываются. Повтор отправит тот же запрос без дубля." : captainErrorMessage(error));
      if (error.code === "conflict") setEditingVersion(null);
    } finally {
      mutating.current = false;
      if (mounted.current) { setBusy(false); reading.current = false; reload(); }
    }
  }

  if (!detail) return <div className="tg-captain-state"><p role="status">{loadError || "Загружаем матч…"}</p>{loadError && <button className="tg-secondary" onClick={reload}>Повторить загрузку</button>}</div>;
  const { match, proposal, agreed } = detail;
  const teamName = (id) => id === match.team1.id ? match.team1.name : match.team2.name;
  const disabled = busy || Boolean(pending);
  const closed = detail.chatClosed || ["completed", "cancelled", "finished"].includes(match.status);
  const changedWhileEditing = editingVersion !== null && editingVersion !== detail.scheduleVersion;
  const startsAt = moscowToIso(picker.date, picker.time);
  const confirmed = proposal?.confirmedTeamIds || [];
  const sameProposal = startsAt && proposal && Date.parse(startsAt) === Date.parse(proposal.startsAt);
  const replacingAgreedTime = agreed && proposal && Date.parse(agreed.startsAt) !== Date.parse(proposal.startsAt);
  const alreadyConfirmed = sameProposal && confirmed.includes(detail.viewerTeamId);
  const wins = Math.floor((Number(String(match.bestOf).replace(/\D/g, "")) || 1) / 2) + 1;
  const editPicker = (field, value) => { if (editingVersion === null) setEditingVersion(detail.scheduleVersion); setPicker((current) => ({ ...current, [field]: value })); };

  return <div className="tg-captain-workspace">
    <header className="tg-captain-match-heading"><p className="tg-kicker">{match.round} · {match.bestOf}</p><h3>{match.team1.name} <span>—</span> {match.team2.name}</h3><p>{agreed ? `${replacingAgreedTime ? "Ранее согласовано" : "Согласовано"}: ${formatMoscow(agreed.startsAt)}` : match.scheduledAt ? `В расписании: ${formatMoscow(match.scheduledAt)}` : "Время матча ещё не согласовано"}</p>{replacingAgreedTime && <p>Новое время ниже ожидает подтверждения обоими капитанами.</p>}</header>
    <div className="tg-captain-feedback" role="status" aria-live="polite">{busy ? "Сохраняем…" : notice || loadError || (pending ? "Ответ на предыдущий запрос не подтверждён. Повторите тот же запрос без дубля." : "")}{pending && !busy && <button type="button" className="tg-captain-action" onClick={() => runCommand(pending)}>Повторить запрос</button>}</div>
    <div className="tg-captain-main">
      <section className="tg-captain-chat" aria-labelledby="captain-chat-title">
        <div className="tg-captain-section-heading"><h3 id="captain-chat-title">Чат капитанов</h3><span>Переписка доступна до окончания матча. Затем она удаляется.</span></div>
        <ol className="tg-captain-messages" aria-label="Сообщения капитанов" tabIndex={0} ref={scroller} onScroll={(event) => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; }}>
          {!detail.messages.length && <li className="tg-captain-empty">{detail.chatClosed ? chatClosedMessage : "Договоритесь здесь о времени и подготовке матча."}</li>}
          {detail.messages.map((message) => <li key={message.id} data-own={message.teamId === detail.viewerTeamId}><div><strong>{teamName(message.teamId)}{message.teamId === detail.viewerTeamId ? " · вы" : ""}</strong><time dateTime={message.createdAt}>{formatMoscow(message.createdAt)}</time></div><p>{message.text}</p></li>)}
        </ol>
        <form className="tg-captain-compose" onSubmit={(event) => { event.preventDefault(); if (text.trim()) submit("message", { text: text.trim() }); }}>
          <label htmlFor="captain-message">Сообщение сопернику</label><textarea id="captain-message" ref={textInput} value={text} onChange={(event) => { setText(event.target.value); client.messageDrafts.set(matchId, event.target.value); }} rows={3} maxLength={2000} disabled={disabled || detail.chatClosed} placeholder={detail.chatClosed ? "Чат закрыт" : "Напишите удобное время или обсудите лобби"} />
          <div><span>{detail.chatClosed ? "Чат закрыт" : chatRefreshing ? "Обновляем чат…" : `${text.length} / 2000`}</span><button className="tg-captain-action" disabled={disabled || detail.chatClosed || chatRefreshing || !text.trim()}>Отправить</button></div>
        </form>
        <form className="tg-captain-time" onSubmit={(event) => { event.preventDefault(); if (startsAt && !changedWhileEditing) submit("agree", { startsAt, expectedScheduleVersion: detail.scheduleVersion }); }}>
          <h3>Время матча</h3>
          {closed ? <p className="tg-source-state">Согласование времени закрыто.</p> : match.window ? <p className="tg-source-state">Период игры: {formatMoscow(match.window.start)} — {formatMoscow(match.window.end)}</p> : <p className="tg-source-state">Организатор ещё не задал период игры. Пока можно договориться в чате.</p>}
          {proposal && <><p>Предложено: <strong>{formatMoscow(proposal.startsAt)}</strong></p><ul className="tg-captain-consents">{[match.team1, match.team2].map((team) => <li key={team.id} data-confirmed={confirmed.includes(team.id)}><span aria-hidden="true">{confirmed.includes(team.id) ? "✓" : "○"}</span> {team.name}: {confirmed.includes(team.id) ? "подтверждено" : "ожидаем подтверждения"}</li>)}</ul></>}
          <div className="tg-captain-picker"><label htmlFor="captain-date">Дата, МСК<input id="captain-date" type="date" value={picker.date} min={moscowInput(match.window?.start).date || undefined} max={moscowInput(match.window?.end).date || undefined} onChange={(event) => editPicker("date", event.target.value)} required disabled={disabled || closed || !match.window} /></label><label htmlFor="captain-time">Время, МСК<input id="captain-time" type="time" step="60" value={picker.time} onChange={(event) => editPicker("time", event.target.value)} required disabled={disabled || closed || !match.window} /></label></div>
          {changedWhileEditing && <p role="status">Соперник изменил время. <button className="tg-captain-text-button" type="button" onClick={() => setEditingVersion(null)}>Показать новое предложение</button></p>}
          <p className="tg-source-state">Оба капитана подтверждают одно время не позднее чем за 2 часа до матча. Выбор другого времени сбрасывает предыдущие подтверждения.</p>
          <button className="tg-primary" disabled={disabled || closed || !match.window || !startsAt || changedWhileEditing || alreadyConfirmed}>Время согласовано <span aria-hidden="true">✓</span></button>
          {alreadyConfirmed && <p className="tg-source-state">{confirmed.length === 2 ? "Время подтверждено обоими капитанами." : "Вы подтвердили это время. Ожидаем соперника."}</p>}
        </form>
      </section>
      <aside className="tg-captain-side">
        <section className="tg-captain-preparation"><h3>Перед матчем</h3><p>Режим игры: Captain’s Mode.</p><p>При трансляции лобби создаёт кастер. Без трансляции организатор приглашает команды и выходит из лобби. Название и пароль сообщает организатор.</p>{match.note && <p>{match.note}</p>}<button className="tg-captain-action" onClick={onRules}>Формат турнира</button>{match.broadcastUrl ? <button className="tg-captain-action" onClick={() => runtime.openExternal({ kind: "external", label: "Трансляция", url: match.broadcastUrl })}>Открыть трансляцию ↗</button> : <p className="tg-source-state">Ссылка на трансляцию пока не опубликована.</p>}</section>
        <section className="tg-captain-result"><h3>Заявить результат</h3><p className="tg-source-state">Заявка появится у организатора. Отправка не меняет официальный счёт, сетку и MVP.</p><form onSubmit={(event) => { event.preventDefault(); submit("result", { score: score.map(Number), comment: comment.trim() }); }}><div className="tg-captain-score">{[match.team1, match.team2].map((team, index) => <label key={team.id} htmlFor={`captain-score-${index}`}>{team.name}<input id={`captain-score-${index}`} type="number" inputMode="numeric" min="0" max={wins} step="1" required value={score[index]} disabled={disabled} onChange={(event) => setScore((current) => current.map((value, i) => i === index ? event.target.value : value))} /></label>)}</div><label htmlFor="captain-result-comment">Комментарий<textarea id="captain-result-comment" rows={3} maxLength={1000} value={comment} disabled={disabled} onChange={(event) => setComment(event.target.value)} /></label>{score.every((value) => value !== "") && <p className="tg-captain-result-preview">Проверьте заявку: {match.team1.name} — {match.team2.name}, счёт {score.join(":")}, {match.bestOf}.</p>}<button className="tg-captain-action" disabled={disabled || score.some((value) => value === "")}>Передать результат</button></form>{detail.resultClaims.length > 0 && <ul className="tg-captain-claims">{detail.resultClaims.map((claim) => <li key={claim.id}><strong>{teamName(claim.teamId)}: {claim.score.join(":")}</strong><time dateTime={claim.createdAt}>{formatMoscow(claim.createdAt)}</time>{claim.comment && <p>{claim.comment}</p>}</li>)}</ul>}</section>
      </aside>
    </div>
  </div>;
}
