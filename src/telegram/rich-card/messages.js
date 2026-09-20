import { cardFacts, PUBLIC_ORIGIN } from "./model.js";

// Bot API 10.3: InputRichMessage blocks (10.2), RichMessageButton (10.3).
// Pure serialization; no token, network, runtime or automatic fallback here.
const photo = (url, caption) => ({ type: "photo", photo: { type: "photo", media: url }, caption: { text: caption } });
function validateLinks(card) {
  for (const url of [card.brand.logoUrl, ...card.teams.map((team) => team.logoUrl)].filter(Boolean)) {
    const parsed = new URL(url);
    if (parsed.origin !== PUBLIC_ORIGIN || parsed.username || parsed.password || !parsed.pathname.startsWith("/assets/")) throw new TypeError("Untrusted card media");
  }
  const allMatches = card.actions.find((action) => action.id === "matches");
  const parsed = new URL(allMatches?.url);
  if (parsed.origin !== PUBLIC_ORIGIN || parsed.username || parsed.password || parsed.pathname !== "/tg/tournament" || parsed.searchParams.get("section") !== "matches" ||
    (parsed.searchParams.get("tournament") || "dota2-autumn-2026") !== card.tournament.slug) throw new TypeError("Invalid all-matches destination");
  return allMatches;
}
export function toPlainMessage(card) {
  const action = validateLinks(card);
  const text = [...cardFacts(card), `${action.label}: ${action.url}`].join("\n");
  if ([...text].length > 4096) throw new RangeError("Plain card exceeds Telegram text limit");
  return { text, link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: [[{ text: action.label, url: action.url }]] } };
}
export function toRichMessage(card) {
  const action = validateLinks(card);
  const facts = cardFacts(card);
  const logos = [
    ...(card.brand.logoUrl ? [photo(card.brand.logoUrl, card.brand.name)] : []),
    ...card.teams.filter((team) => team.logoUrl).map((team) => photo(team.logoUrl, team.name || "Соперник ещё не определён")),
  ];
  return { rich_message: { skip_entity_detection: true, blocks: [
    { type: "paragraph", text: facts[0] },
    ...(logos.length ? [{ type: "collage", blocks: logos }] : []),
    ...facts.slice(1).map((text, index) => index === 2 ? { type: "heading", size: 2, text } : { type: "paragraph", text }),
    { type: "buttons", buttons: card.actions.filter((item) => item.kind === "demo").map((item) => ({ text: `${item.label} · демо`, disabled: {} })) },
    { type: "buttons", buttons: [{ text: action.label, url: action.url, style: "primary" }] },
  ] } };
}

export function createCardRequest(card, { format = "rich", chatId, messageId } = {}) {
  if (!["rich", "plain"].includes(format)) throw new TypeError("Choose rich or plain explicitly");
  if (chatId !== undefined && (typeof chatId !== "string" || !/^-?[1-9]\d*$/.test(chatId))) throw new TypeError("A numeric test chat ID is required");
  if (messageId !== undefined && (!Number.isSafeInteger(messageId) || messageId <= 0)) throw new TypeError("Invalid message ID");
  return {
    method: messageId !== undefined ? "editMessageText" : format === "rich" ? "sendRichMessage" : "sendMessage",
    body: { ...(chatId === undefined ? {} : { chat_id: chatId }), ...(messageId === undefined ? {} : { message_id: messageId }),
      ...(format === "rich" ? toRichMessage(card) : toPlainMessage(card)) },
  };
}
