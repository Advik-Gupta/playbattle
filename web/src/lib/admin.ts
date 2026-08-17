import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'pb_admin';
const MAX_AGE = 60 * 60 * 6;

function secret() {
  return process.env.AUTH_SECRET ?? 'insecure-dev-secret';
}

function token() {
  return createHmac('sha256', secret()).update('admin').digest('hex');
}

export function codeMatches(input: string) {
  const expected = process.env.ADMIN_CODE ?? '';
  if (!expected) return false;

  const a = Buffer.from(input.trim());
  const b = Buffer.from(expected.trim());

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signIn() {
  const jar = await cookies();
  jar.set(COOKIE, token(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/admin',
  });
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === token();
}

export const adminConfigured = Boolean(process.env.ADMIN_CODE);
