// Client-side validation. It mirrors the backend rules so people get instant feedback,
// but the backend remains the source of truth and validates every request again.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function validateRegister({ fullName, email, password }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Enter your full name';
  else if (fullName.trim().length < 2) errors.fullName = 'Full name must be at least 2 characters';
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Choose a password';
  else if (password.length < 8) errors.password = 'Use at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Include at least one letter and one number';
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export function validateProject({ name, description, startDate, endDate }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Give the project a name';
  else if (name.trim().length > 120) errors.name = 'Keep the name under 120 characters';
  if (description.length > 5000) errors.description = 'Keep the description under 5000 characters';
  if (startDate && !isValidDate(startDate)) errors.startDate = 'Enter a valid start date';
  if (endDate && !isValidDate(endDate)) errors.endDate = 'Enter a valid end date';
  if (!errors.startDate && !errors.endDate && startDate && endDate && endDate < startDate) {
    errors.endDate = 'End date can’t be before the start date';
  }
  return errors;
}

export function validateTask({ name, description, dueDate, projectId }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Give the task a name';
  else if (name.trim().length > 160) errors.name = 'Keep the name under 160 characters';
  if (description.length > 5000) errors.description = 'Keep the description under 5000 characters';
  if (dueDate && !isValidDate(dueDate)) errors.dueDate = 'Enter a valid due date';
  if (!projectId) errors.projectId = 'Choose a project';
  return errors;
}
