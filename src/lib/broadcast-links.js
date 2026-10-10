import { safeHttps } from './community.js';

// Broadcasts belong to this match. Status, notes and global channels are not sources.
export function getMatchBroadcastLinks(match) {
  const links = match?.broadcastLinks;
  if (!links || typeof links !== 'object' || Array.isArray(links)) return [];
  return [['twitch', 'Twitch'], ['vk', 'VK']].flatMap(([platform, label]) => {
    const href = safeHttps(links[platform]);
    return href ? [{ platform, label, href }] : [];
  });
}
