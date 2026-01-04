// lib/auth.js

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findUserById } from './db.js';

// Cookie name used to store the signed JWT.
export const AUTH_COOKIE_NAME = 'token';

// IMPORTANT: Set JWT_SECRET in your environment for production.
// This fallback is only for local development.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Token lifetime. Keep it short-ish; user can always re-login.
const TOKEN_EXPIRES_IN = '7d';

/**
 * Create a signed JWT for a user.
 *
 * @param {number} userId
 */
export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

/**
 * Verify a JWT and return its payload.
 * Throws on invalid/expired tokens.
 *
 * @param {string} token
 * @returns {{userId: number}}
 */
export function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  const userId = Number(payload?.userId);
  if (!Number.isFinite(userId)) {
    throw new Error('Invalid token payload');
  }
  return { userId };
}

/**
 * Read and verify the token from the current request (server-side).
 * Returns userId or null.
 */
export function getUserIdFromCookies() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { userId } = verifyToken(token);
    return userId;
  } catch {
    return null;
  }
}

/**
 * Server component guard: redirects to /login when unauthenticated.
 * Returns the authenticated user object.
 */
export async function requireAuth() {
  const userId = getUserIdFromCookies();
  if (!userId) redirect('/login');
  const user = await findUserById(userId);
  if (!user) redirect('/login');
  return user;
}

/**
 * Returns current user or null (server-side).
 */
export async function getCurrentUser() {
  const userId = getUserIdFromCookies();
  if (!userId) return null;
  const user = await findUserById(userId);
  return user || null;
}
