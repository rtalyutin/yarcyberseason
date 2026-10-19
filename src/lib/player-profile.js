export function readPlayerDiscipline(search) {
  const values = new URLSearchParams(search).getAll('Dis');
  return values.length === 1 && /^[a-z0-9_-]{1,32}$/.test(values[0]) ? values[0] : null;
}

export function emptyPlayerForm() {
  return { nickname: '', name: '', city: '', roleIds: [], steam: '', usagePermissions: [] };
}

export function formFromPlayer(record, context) {
  const form = emptyPlayerForm();
  for (const field of context?.fields || []) {
    if (field.scope === 'profile') form[field.id] = record?.profile?.[field.id] ?? '';
  }
  return { ...form, nickname: record?.profile?.nickname || '', name: record?.profile?.name || '',
    city: record?.profile?.city || '', roleIds: record?.discipline?.roleIds || [],
    steam: record?.discipline?.gameAccount?.identifier || '',
    usagePermissions: (context?.usagePermissions || []).map((permission) => ({ purpose: permission.purpose,
      textVersion: permission.textVersion, allowed: Boolean(record?.usagePermissions?.find((item) =>
        item.purpose === permission.purpose && item.textVersion === permission.textVersion)?.allowed) })) };
}

export function playerSaveRequest({ form, context, base, photoAssetId, requestId }) {
  const profile = {};
  for (const field of context.fields || []) {
    if (field.scope !== 'profile' || field.id === 'photoAssetId') continue;
    const value = form[field.id];
    profile[field.id] = typeof value === 'string' ? value.trim() || null : value ?? null;
  }
  // Core fields also work with older context catalogues.
  for (const id of ['nickname', 'name', 'city']) profile[id] = form[id]?.trim() || null;
  if (photoAssetId) profile.photoAssetId = photoAssetId;
  return { requestId, expectedVersion: base?.version ?? null, disciplineCode: context.discipline.code,
    profile, discipline: { roleIds: [...form.roleIds], gameAccount: form.steam.trim()
      ? { platform: 'steam', identifier: form.steam.trim() } : null },
    usagePermissions: form.usagePermissions.map((item) => ({ ...item })) };
}

export const defaultPhotoCrop = () => ({ rotation: 0, zoom: 1, horizontal: 0, vertical: 0 });

// One small output canvas; no full-resolution intermediate canvas is needed.
export function drawPlayerCrop(canvas, image, crop, size = 1024) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Браузер не поддерживает обработку фото.');
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const quarterTurn = crop.rotation % 180 !== 0;
  const rotatedWidth = quarterTurn ? height : width;
  const rotatedHeight = quarterTurn ? width : height;
  const side = Math.min(rotatedWidth, rotatedHeight) / crop.zoom;
  const left = (rotatedWidth - side) * (crop.horizontal + 100) / 200;
  const top = (rotatedHeight - side) * (crop.vertical + 100) / 200;
  canvas.width = size; canvas.height = size;
  context.save();
  context.fillStyle = '#101622'; context.fillRect(0, 0, size, size);
  context.scale(size / side, size / side);
  context.translate(rotatedWidth / 2 - left, rotatedHeight / 2 - top);
  context.rotate(crop.rotation * Math.PI / 180);
  context.drawImage(image, -width / 2, -height / 2);
  context.restore();
}

export function playerPhotoBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob)
    : reject(new Error('Не удалось подготовить фото. Выберите файл ещё раз.')), 'image/jpeg', .92));
}
