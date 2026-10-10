const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' -> local-midnight Date (never shifted by time zones). */
export function parseDay(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDay(value: string | null): string {
  const date = parseDay(value);
  if (!date) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${sameYear ? '' : ` ${date.getFullYear()}`}`;
}

export function formatRange(start: string | null, end: string | null): string {
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  if (start) return `Starts ${formatDay(start)}`;
  if (end) return `Ends ${formatDay(end)}`;
  return 'No dates set';
}

export function dueLabel(dueDate: string | null, status: string): { label: string; overdue: boolean; soon: boolean } | null {
  const due = parseDay(dueDate);
  if (!due) return null;
  const today = parseDay(toISODate(new Date()))!;
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const open = status !== 'Completed';
  let label: string;
  if (days === 0) label = 'Due today';
  else if (days === 1) label = 'Due tomorrow';
  else if (days === -1) label = 'Due yesterday';
  else if (days > 1 && days < 7) label = `Due in ${days} days`;
  else label = `Due ${formatDay(dueDate)}`;
  return { label, overdue: days < 0 && open, soon: days >= 0 && days <= 2 && open };
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const firstName = (fullName = '') => fullName.trim().split(/\s+/)[0] || 'there';
