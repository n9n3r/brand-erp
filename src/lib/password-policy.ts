import { z } from 'zod';

/**
 * Password policy shared by client UI (live checklist) and server (Zod).
 * 8–72 chars, at least one letter and one number, no leading/trailing
 * spaces, common-password blocklist. (See CHANGELOG-SECURITY.md.)
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters (max 72)' },
  { id: 'letter', label: 'At least one letter' },
  { id: 'number', label: 'At least one number' },
  { id: 'common', label: 'Not a commonly used password' },
] as const;

// Representative blocklist — extend from a standard list (e.g. HaveIBeenPwned
// top-1k) before production use.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'password2024', 'password2025',
  '12345678', '123456789', '1234567890', '12345678910', '12345678a', '123456789a',
  'qwerty123', 'qwertyuiop', 'qwe123', 'abc12345', 'abcd1234', 'iloveyou1', 'iloveyou123',
  'letmein123', 'welcome123', 'welcome1', 'admin1234', 'admin123', 'login1234', 'root12345',
  'secret123', 'trustno1', 'superman1', 'batman123', 'shadow123', 'michael123', 'hunter123',
  'harley123', 'ranger123', 'buster123', 'thomas123', 'robert123', 'soccer123', 'hockey123',
  'killer123', 'george123', 'andrew123', 'charlie12', 'bailey123', 'diamond12', 'jordan123',
  'monday123', 'friday123', 'saturday1', 'sunshine1', 'princess1', 'football1', 'baseball1',
  'master123', 'dragon123', 'monkey123', 'starwars1', 'whatever1', 'correcthorse',
]);

/** Returns the first violated rule's message, or null when the password passes. */
export function passwordError(pw: string): string | null {
  if (pw !== pw.trim()) return 'Password must not have leading or trailing spaces';
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 72) return 'Password must be at most 72 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/\d/.test(pw)) return 'Password must contain at least one number';
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return 'This password is too common — choose another';
  return null;
}

/** Per-rule breakdown for the live client checklist. */
export function validatePassword(pw: string) {
  const error = passwordError(pw);
  return {
    ok: error === null,
    error: error ?? undefined,
    rules: {
      length: pw.length >= 8 && pw.length <= 72,
      letter: /[a-zA-Z]/.test(pw),
      number: /\d/.test(pw),
      common: pw.length > 0 && !COMMON_PASSWORDS.has(pw.toLowerCase()),
    },
  };
}

/** True when the password contains the user's email local-part or a name part. */
export function containsPersonalInfo(
  pw: string,
  info: { email: string; name: string },
): boolean {
  const p = pw.toLowerCase();
  const local = info.email.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 3 && p.includes(local)) return true;
  return info.name
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part.length >= 3 && p.includes(part));
}

export const strongPasswordSchema = z
  .string()
  .refine((pw) => passwordError(pw) === null, (pw) => ({ message: passwordError(pw) ?? 'Invalid password' }));
