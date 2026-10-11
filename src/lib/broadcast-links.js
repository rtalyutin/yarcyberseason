import { getMatchBroadcastLinks as getPublishedBroadcastLinks } from './broadcasts.js';

// Broadcasts belong to this match. Status, notes and global channels are not sources.
export function getMatchBroadcastLinks(match) {
  return getPublishedBroadcastLinks(match).map((link) => ({
    ...link, label: link.platform === 'twitch' ? 'Twitch' : 'VK',
  }));
}
