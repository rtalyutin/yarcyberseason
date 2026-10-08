export const organizerColumns = [
  { id: 'date', label: 'Дата / МСК', width: 160, className: 'orgs-date' },
  { id: 'tournament', label: 'Турнир · тур', width: 190 },
  { id: 'match', label: 'Матч', width: 330, className: 'orgs-match' },
  { id: 'status', label: 'Статус / счёт', width: 165 },
  { id: 'broadcast', label: 'Трансляция', width: 190 },
  { id: 'casters', label: 'Кастеры', width: 165 },
  { id: 'partners', label: 'Партнёры', width: 260 },
];

export const defaultColumnOrder = organizerColumns.map(({ id }) => id);

export function moveOrganizerColumn(order, source, target, placement = 'before') {
  if (source === target || !order.includes(source) || !order.includes(target)) return order;
  const next = order.filter((id) => id !== source);
  const index = next.indexOf(target) + (placement === 'after' ? 1 : 0);
  next.splice(index, 0, source);
  return next;
}

export function toggleOrganizerColumn(hidden, id) {
  if (!defaultColumnOrder.includes(id)) return hidden;
  if (hidden.includes(id)) return hidden.filter((column) => column !== id);
  if (hidden.length >= organizerColumns.length - 1) return hidden;
  return [...hidden, id];
}
