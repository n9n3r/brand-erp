/**
 * Password policy (shared by client UI and server validation — pure module,
 * no node-only imports).
 *
 * Rules:
 *  - 10–72 characters (bcrypt caps at 72)
 *  - at least one letter AND one number
 *  - no leading/trailing whitespace
 *  - not in the common-password blocklist
 *  - (signup only) must not contain your email or name
 */
import { z } from 'zod';

const COMMON_PASSWORDS = new Set([
  // evergreen weak passwords
  'password', 'password1', 'password12', 'password123', 'password1234',
  'passw0rd', 'p@ssword', 'p@ssw0rd', 'pa55word', 'password!',
  '123456', '1234567', '12345678', '123456789', '1234567890', '123123', '123321',
  '111111', '000000', '121212', '654321', '101010', '123abc', '123qwe', '1234qwer',
  'qwerty', 'qwerty123', 'qwertyuiop', 'qwertz', 'qazwsx', 'asdfgh', 'zxcvbn',
  'abc123', 'abcd1234', 'abc123456', 'iloveyou', 'trustno1', 'letmein',
  'welcome', 'welcome1', 'welcome123', 'welcome!', 'monkey', 'monkey123',
  'dragon', 'sunshine', 'princess', 'football', 'baseball', 'master',
  'admin', 'admin123', 'admin1234', 'admin12345', 'admin!', 'administrator1',
  'login1', 'login123', 'guest123', 'user123', 'test123', 'test1234',
  'root123', 'pass123', 'pass1234', 'pass@123', 'secret123', 'changeme1',
  'letmein123', 'freedom1', 'whatever1', 'computer1', 'michael1', 'jennifer1',
  'jordan23', 'hunter2', 'hunter22', 'zaq12wsx', '1q2w3e4r', '1qaz2wsx',
  'superman1', 'batman123', 'shadow12', 'maggie12', 'summer1!', 'spring2024',
  'winter2024', 'summer2024', 'autumn2024', 'january2025', '2024admin',
  'nigeria1', 'nigeria123', 'lagos123', 'wakeupnow1', 'blessing1', 'chiamaka1',
  'amaka123', 'bola1234', 'mybrand1', 'mybrand123', 'erp12345', 'business1',
  'mybusiness1', 'business123', 'shop1234', 'store1234', 'sales1234',
  'money123', 'moneyman1', 'payday123', 'happy1234', 'loveyou1', 'love1234',
  'godisgood1', 'grateful1', 'blessed1!', 'faithful1', 'favor1234',
]);

export type PasswordCheck = { ok: boolean; errors: string[] };

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];
  if (typeof password !== 'string' || password.length < 10 || password.length > 72) {
    errors.push('Use 10–72 characters.');
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Include at least one letter and one number.');
  }
  if (password !== password.trim()) {
    errors.push('Password cannot start or end with a space.');
  }
  if (typeof password === 'string' && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common — pick something less guessable.');
  }
  return { ok: errors.length === 0, errors };
}

/** True if the password contains the email local-part or a name token (≥3 chars). */
export function containsPersonalInfo(
  password: string,
  personal: { email?: string; name?: string }
): boolean {
  const pw = password.toLowerCase();
  const parts: string[] = [];
  if (personal.email) {
    const local = personal.email.split('@')[0].toLowerCase();
    if (local.length >= 3) parts.push(local);
  }
  if (personal.name) {
    personal.name
      .toLowerCase()
      .split(/[^a-z]+/)
      .forEach((token) => {
        if (token.length >= 3) parts.push(token);
      });
  }
  return parts.some((p) => pw.includes(p));
}

/** Zod schema enforcing the policy — drop-in for z.string().min(8…). */
export const strongPasswordSchema = z.string().superRefine((val, ctx) => {
  const { errors } = validatePassword(val);
  if (errors.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: errors.join(' ') });
  }
});

/** Human-readable rules for UI hints. */
export const PASSWORD_RULES = [
  '10–72 characters',
  'at least one letter and one number',
  'no common/guessable passwords',
  'not your email or name',
] as const;
