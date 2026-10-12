// Presentation of the published three-win / three-loss Swiss format.
// This does not calculate, modify or publish sporting results.
export function getSwissRecordState(won, lost) {
  const valid = Number.isInteger(won) && Number.isInteger(lost)
    && won >= 0 && won <= 3 && lost >= 0 && lost <= 3 && !(won === 3 && lost === 3);
  if (!valid) return { kind: 'unknown', round: null, wins: null, label: 'Результат уточняется', score: '—' };
  const score = `${won} : ${lost}`;
  if (won === 3) {
    const round = won + lost;
    return { kind: `qualified-${round}`, round, wins: won, score, label: `Плей-офф · ${round}-й тур` };
  }
  if (lost === 3) return { kind: 'eliminated', round: null, wins: won, score, label: 'Вылет' };
  return { kind: 'active', round: null, wins: won, score, label: 'Продолжают борьбу' };
}

export function sortSwissRows(rows) {
  return [...rows].sort((a, b) => {
    const left = getSwissRecordState(a.won, a.lost), right = getSwissRecordState(b.won, b.lost);
    if (left.kind === 'unknown' || right.kind === 'unknown') return (left.kind === 'unknown') - (right.kind === 'unknown');
    return b.won - a.won || a.lost - b.lost;
  });
}
