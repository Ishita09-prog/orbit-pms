// Client-side validation mirrors the backend rules for instant feedback; the backend validates every request again.
export type Errors<K extends string = string> = Partial<Record<K, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function validateRegister(v: { fullName: string; email: string; password: string }): Errors<'fullName' | 'email' | 'password'> {
  const e: Errors<'fullName' | 'email' | 'password'> = {};
  if (!v.fullName.trim()) e.fullName = 'Enter your full name';
  else if (v.fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters';
  if (!v.email.trim()) e.email = 'Enter your email address';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (!v.password) e.password = 'Choose a password';
  else if (v.password.length < 8) e.password = 'Use at least 8 characters';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) e.password = 'Include at least one letter and one number';
  return e;
}

export function validateLogin(v: { email: string; password: string }): Errors<'email' | 'password'> {
  const e: Errors<'email' | 'password'> = {};
  if (!v.email.trim()) e.email = 'Enter your email address';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (!v.password) e.password = 'Enter your password';
  return e;
}

export function validateTask(v: { name: string; description: string; dueDate: string | null; projectId: string }): Errors<'name' | 'description' | 'dueDate' | 'projectId'> {
  const e: Errors<'name' | 'description' | 'dueDate' | 'projectId'> = {};
  if (!v.name.trim()) e.name = 'Give the task a name';
  else if (v.name.trim().length > 160) e.name = 'Keep the name under 160 characters';
  if (v.description.length > 5000) e.description = 'Keep the description under 5000 characters';
  if (v.dueDate && !isValidDate(v.dueDate)) e.dueDate = 'Enter a valid due date';
  if (!v.projectId) e.projectId = 'Choose a project';
  return e;
}

export function validateProject(v: { name: string; description: string; startDate: string | null; endDate: string | null }): Errors<'name' | 'description' | 'startDate' | 'endDate'> {
  const e: Errors<'name' | 'description' | 'startDate' | 'endDate'> = {};
  if (!v.name.trim()) e.name = 'Give the project a name';
  else if (v.name.trim().length > 120) e.name = 'Keep the name under 120 characters';
  if (v.description.length > 5000) e.description = 'Keep the description under 5000 characters';
  if (v.startDate && !isValidDate(v.startDate)) e.startDate = 'Enter a valid start date';
  if (v.endDate && !isValidDate(v.endDate)) e.endDate = 'Enter a valid end date';
  if (v.startDate && v.endDate && !e.startDate && !e.endDate && v.endDate < v.startDate) e.endDate = 'End date cannot be before the start date';
  return e;
}
