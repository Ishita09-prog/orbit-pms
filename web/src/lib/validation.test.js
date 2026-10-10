import { describe, expect, it } from 'vitest';
import { isValidDate, validateLogin, validateProject, validateRegister, validateTask } from './validation.js';

describe('isValidDate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
  });
  it('rejects impossible or malformed dates', () => {
    expect(isValidDate('2026-02-31')).toBe(false);
    expect(isValidDate('2027-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('tomorrow')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('validateRegister', () => {
  it('accepts good input', () => {
    expect(validateRegister({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'Passw0rd123' })).toEqual({});
  });
  it('flags every problem', () => {
    const errors = validateRegister({ fullName: ' ', email: 'nope', password: 'short' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password']);
  });
  it('requires a letter and a number in the password', () => {
    expect(validateRegister({ fullName: 'Ada L', email: 'a@b.co', password: 'onlyletters' }).password).toBeTruthy();
    expect(validateRegister({ fullName: 'Ada L', email: 'a@b.co', password: '12345678' }).password).toBeTruthy();
  });
});

describe('validateLogin', () => {
  it('requires email and password', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({});
  });
});

describe('validateProject', () => {
  const ok = { name: 'Site', description: '', startDate: '', endDate: '' };
  it('requires a name', () => expect(validateProject({ ...ok, name: '  ' }).name).toBeTruthy());
  it('rejects an end date before the start date', () => {
    expect(validateProject({ ...ok, startDate: '2026-05-10', endDate: '2026-05-01' }).endDate).toBeTruthy();
  });
  it('accepts empty optional dates', () => expect(validateProject(ok)).toEqual({}));
});

describe('validateTask', () => {
  const ok = { name: 'Do it', description: '', dueDate: '', projectId: 'abc' };
  it('requires name and project', () => {
    expect(Object.keys(validateTask({ ...ok, name: '', projectId: '' })).sort()).toEqual(['name', 'projectId']);
  });
  it('rejects invalid due dates', () => expect(validateTask({ ...ok, dueDate: '2026-02-30' }).dueDate).toBeTruthy());
});
