// Brand marks are original files from the publishers. Counts remain in the
// editable project document; this map owns presentation only.
export const partnerDisciplineVisuals = Object.freeze({
  'dota2-2027': { logo: '/assets/partners-2027/dota2-logo.png', art: '/assets/themes/yaroslavl-dota-1200.webp' },
  'cs2-2027': { logo: '/assets/partners-2027/cs2-logo.svg', art: '/assets/partners-2027/cs2-art.webp' },
  'tanks-2027': { logo: '/assets/partners-2027/tanks-logo.webp', art: '/assets/partners-2027/tanks-art.webp' },
  'tekken-2027': { logo: '/assets/partners-2027/tekken-logo.png', art: '/assets/partners-2027/tekken-art.webp' },
});

const originalPartnerMarks = Object.freeze({
  'small-choice': { src: '/assets/partners-2027/small-choice.png', inverse: false },
  'art-of-rhythm': { src: '/assets/partners-2027/art-of-rhythm.svg', inverse: true },
  'harry-potter-museum': { src: '/assets/partners-2027/harry-potter-museum.webp', inverse: true },
  'forsazh': { src: '/assets/partners-2027/forsazh.webp', inverse: true },
  'gingerbread-house': { src: '/assets/partners-2027/gingerbread-house.png', inverse: false },
  'yarvzlet': { src: '/assets/partners-2027/yarvzlet.png', inverse: false },
  'questoria': { src: '/assets/partners-2027/questoria.webp', inverse: true },
  'pipyao': { src: '/assets/partners-2027/pipyao.svg', inverse: false },
  'tortofe': { src: '/assets/partners-2027/tortofe.png', inverse: true },
  'yaponchik': { src: '/assets/partners-2027/yaponchik.png', inverse: false },
  'curling76': { src: '/assets/partners-2027/curling76.jpg', inverse: false },
  'ogni': { src: '/assets/partners-2027/ogni.png', inverse: true },
  'strelets': { src: '/assets/partners-2027/strelets.png', inverse: true },
});

export function partnerLogo(partner) {
  if (originalPartnerMarks[partner.id]) return originalPartnerMarks[partner.id];
  // Prefer the original vector wordmark over the old raster on this page.
  const src = partner.homeLogoUrl || partner.logoUrl;
  return src ? { src, inverse: src.includes('inverse') || partner.id === 'redragon' } : null;
}
