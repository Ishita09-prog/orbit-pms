const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' -> Date at local midnight (never shifted by time zones). */
export function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDay(value) {
  const date = parseDay(value);
  if (!date) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${sameYear ? '' : ` ${date.getFullYear()}`}`;
}

export function formatRange(start, end) {
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  if (start) return `Starts ${formatDay(start)}`;
  if (end) return `Ends ${formatDay(end)}`;
  return 'No dates set';
}

/** 'Today', 'Tomorrow', 'In 3 days', '2 days overdue' … */
export function dueLabel(dueDate, status) {
  const due = parseDay(dueDate);
  if (!due) return null;
  const today = parseDay(todayISO());
  const days = Math.round((due - today) / 86_400_000);
  const overdue = days < 0 && status !== 'Completed';
  let label;
  if (days === 0) label = 'Due today';
  else if (days === 1) label = 'Due tomorrow';
  else if (days === -1) label = 'Due yesterday';
  else if (days > 1 && days < 7) label = `Due in ${days} days`;
  else label = `Due ${formatDay(dueDate)}`;
  return { label, overdue, soon: days >= 0 && days <= 2 && status !== 'Completed' };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName = '') {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function initials(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
