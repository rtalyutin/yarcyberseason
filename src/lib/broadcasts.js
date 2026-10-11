// A stream belongs to its match. Empty or unsafe links never create a stream.
export function getMatchBroadcastLinks(match) {
  const links = match?.broadcastLinks;
  if (!links || typeof links !== 'object' || Array.isArray(links)) return [];
  return [
    ['twitch', 'Смотреть на Twitch'],
    ['vk', 'Смотреть в VK Видео'],
  ].flatMap(([platform, label]) => {
    const value = links[platform];
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' && !url.username && !url.password
        ? [{ platform, label, href: url.href }] : [];
    } catch { return []; }
  });
}
