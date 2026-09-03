export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateKey, days) {
  const date = parseLocalDate(dateKey) || new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return localDateKey(date);
}

export function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isToday(value, today = localDateKey()) {
  return value === today;
}

export function isOverdue(value, today = localDateKey()) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value < today);
}

export function startOfLocalWeek(date = new Date()) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return localDateKey(copy);
}

export function formatLocalDate(value, lang = 'en') {
  const date = parseLocalDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function safeIsoTimestamp(value, fallback = new Date().toISOString()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
