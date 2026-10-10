import { z } from 'zod';
import { text } from './common.js';

const email = text('Email')
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email({ error: 'Enter a valid email address' }));

const newPassword = text('Password')
  .min(8, 'Password must be at least 8 characters')
  // bcrypt only uses the first 72 bytes; reject anything longer instead of silently truncating
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password must be at most 72 bytes')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain at least one letter and one number');

export const registerSchema = z.object({
  fullName: text('Full name').trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: text('Password').min(1, 'Password is required').max(200),
});
