import { hash, compare } from 'bcryptjs';

const ROUNDS = 10;

export const hashPassword = (plain: string) => hash(plain, ROUNDS);
export const verifyPassword = (plain: string, passwordHash: string) => compare(plain, passwordHash);
