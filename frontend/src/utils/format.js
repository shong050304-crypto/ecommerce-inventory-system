export function formatPrice(amount) {
  return `NT$ ${Number(amount).toLocaleString('zh-TW')}`;
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatOrderId(id) {
  return `ORD-${String(id).padStart(6, '0')}`;
}
