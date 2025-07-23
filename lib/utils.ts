export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString('es-ES');
}
