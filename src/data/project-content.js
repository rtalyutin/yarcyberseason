import { isPlaceholder } from '../lib/community.js';

export const projectLegal = Object.freeze({
  companyName: 'ООО «ЯрКиберСезон»',
  address: ['150040, Ярославская область, г. Ярославль,', 'ул. Володарского, д. 64, кв. 37'],
  identifiers: 'ИНН 7606143578 · ОГРН 1257600007500',
  copyright: '© 2026 ЯрКиберСезон',
  privacyUrl: 'https://ycs.bar/docs/' + encodeURIComponent('Политика_в_отношении_обработки_персональных_данных.pdf'),
});

const currentPartnerTournamentId = 'dota2-autumn-2026';
const partner = (record) => Object.freeze({
  confirmed: true,
  tournamentId: currentPartnerTournamentId,
  ...record,
});

// Public confirmed agreements only. Private representatives and prize logistics
// belong to the organizer's source register, not the website.
export const confirmedPartners = Object.freeze([
  partner({ id: 'dodo-pizza', name: 'Додо Пицца', shortName: 'Додо Пицца', scope: 'tournament', logoUrl: '/assets/partners/dodo-pizza.jpg', homeLogoUrl: '/assets/partners/dodo-pizza-inverse.svg', homeRole: 'Партнёр турнира', homeUrl: 'https://dodopizza.ru/', description: 'Партнёр турнира.' }),
  partner({ id: 'torrefacto', name: 'Торрефакто', shortName: 'Торрефакто', scope: 'tournament', homeLogoUrl: '/assets/partners/torrefacto-inverse.svg', homeRole: 'Кофейный партнёр команды эфира', homeUrl: 'https://www.torrefacto.ru/', description: 'Кофейный партнёр команды эфира.' }),
  partner({ id: 'redragon', name: 'Redragon', shortName: 'Redragon', scope: 'tournament', homeLogoUrl: '/assets/partners/redragon.svg', homeRole: 'Партнёр турнира', homeUrl: 'https://redragon.ru/', description: 'Партнёр турнира: устройства для награждения топ-3.' }),
  partner({ id: 'minsport-yao', name: 'Министерство спорта Ярославской области', shortName: 'Минспорт ЯО', scope: 'official', logoUrl: '/assets/partners/minsport-yao.png', url: 'https://vk.com/minsport76', description: 'Официальная поддержка турнира.' }),
  partner({ id: 'fks-yao', name: 'Ярославское областное отделение ФКС России', shortName: 'ФКС ЯО', scope: 'official', logoUrl: '/assets/partners/fks-yao.png', url: 'https://vk.com/resf76', description: 'Официальная поддержка турнира.' }),
  partner({ id: 'small-choice', name: 'Small Choice', shortName: 'Small Choice', scope: 'match', matchId: 'dota-autumn-swiss-r1-04', url: 'https://vk.com/small_choice', description: 'Партнёр матча открытия.' }),
  partner({ id: 'art-of-rhythm', name: 'Искусство Ритма', shortName: 'Искусство Ритма', scope: 'match', matchId: 'dota-autumn-swiss-r1-04', url: 'https://vk.com/art_of_rhythm', description: 'Партнёр матча открытия.' }),
  partner({ id: 'forsazh', name: 'Картинг-клуб Форсаж', shortName: 'Форсаж', scope: 'final', url: 'https://vk.com/yarkarting', description: 'Партнёр финала.' }),
  partner({ id: 'harry-potter-museum', name: 'Музей Гарри Поттера в Ярославле', shortName: 'Музей Гарри Поттера', scope: 'final', url: 'https://vk.com/gpyaroslavl', description: 'Партнёр финала.' }),
  partner({ id: 'gingerbread-house', name: 'Пряничный домик', shortName: 'Пряничный домик', scope: 'final', url: 'https://vk.com/club96693175', description: 'Партнёр финала.' }),
  partner({ id: 'yarvzlet', name: 'Аэротруба «Взлёт»', shortName: 'Взлёт', scope: 'unassigned', url: 'https://vk.com/yarvzlet' }),
  partner({ id: 'questoria', name: 'Квестория', shortName: 'Квестория', scope: 'unassigned' }),
  partner({ id: 'pipyao', name: 'Пипяо', shortName: 'Пипяо', scope: 'match', matchId: 'dota-autumn-swiss-r4-04', scopeLabel: 'Матч 4-го тура', url: 'https://vk.com/pipyao_panasia', description: 'Партнёр серии Vnext — strela team: сертификат 1 000 ₽ для MVP всей серии BO3.' }),
  partner({ id: 'strelets', name: 'Стрелец', shortName: 'Стрелец', scope: 'unassigned', url: 'https://yarbalet.ru' }),
  partner({ id: 'tortofe', name: 'Тортофэ', shortName: 'Тортофэ', scope: 'unassigned', url: 'https://vk.ru/tortoferu' }),
  partner({ id: 'yaponchik', name: 'Япончик', shortName: 'Япончик', scope: 'unassigned', url: 'https://yaponchik.net/' }),
  partner({ id: 'curling76', name: 'Ярославский кёрлинг-клуб', shortName: 'Ярославский кёрлинг-клуб', scope: 'unassigned', url: 'https://vk.com/curling76' }),
  partner({ id: 'ogni', name: 'Ресторан «ОГНИ»', shortName: 'ОГНИ', scope: 'unassigned', url: 'https://ogni.rest/' }),
]);

const tournamentId = (tournament) => typeof tournament === 'string' ? tournament : tournament?.id;
export const getConfirmedPartners = (tournament = currentPartnerTournamentId) => confirmedPartners.filter((entry) => entry.confirmed && entry.tournamentId === tournamentId(tournament));
export const getTournamentPartners = (tournament = currentPartnerTournamentId) => getConfirmedPartners(tournament).filter((entry) => entry.scope === 'tournament');
export const getOfficialSupport = (tournament = currentPartnerTournamentId) => getConfirmedPartners(tournament).filter((entry) => entry.scope === 'official');

export function getMatchPartners(tournament, matchOrId) {
  const matchId = typeof matchOrId === 'string' ? matchOrId : matchOrId?.id;
  const matches = (tournament?.stages || []).flatMap((stage) => stage.rounds ? stage.rounds.flatMap((round) => round.matches || []) : stage.matches || []);
  const match = matches.find((entry) => entry.id === matchId);
  if (!match || match.published === false) return [];
  const isPublishedFinal = match.id === 'final-1' && !isPlaceholder(match.team1) && !isPlaceholder(match.team2);
  return getConfirmedPartners(tournament).filter((entry) =>
    (entry.scope === 'match' && entry.matchId === match.id) || (entry.scope === 'final' && isPublishedFinal));
}

export function getPartnerScopeLabel(entry) {
  if (entry.scope === 'tournament') return 'Партнёр турнира';
  if (entry.scope === 'official') return 'Официальная поддержка';
  if (entry.scope === 'match') return entry.scopeLabel || 'Матч открытия';
  if (entry.scope === 'final') return 'Финал';
  return 'Матч пока не назначен';
}

export const projectContent = Object.freeze({
  brandName: "ЯрКиберСезон",
  logoUrl: "/assets/ycs-logo.jpg",
  contactEmail: "info@ycs.bar",
  telegramUrl: 'https://t.me/dota2yar',
  telegramLabel: 'Telegram @dota2yar',
  partnerRegistry: confirmedPartners,
  partners: Object.freeze(getTournamentPartners()),
  officialSupport: Object.freeze(getOfficialSupport()),
});
