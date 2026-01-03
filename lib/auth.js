// lib/auth.js

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findUserById } from './db.js';

/**
 * Ensures that a user is authenticated before accessing a page. If the
 * userId cookie is absent or refers to a non-existent user, the caller
 * is redirected to the login page. Otherwise, the corresponding
 * user object is returned. This helper should be invoked at the top
 * of server components to gate access.
 *
 * @returns {Promise<object>} the authenticated user
 */
export async function requireAuth() {
  const cookieStore = cookies();
  const idStr = cookieStore.get('userId')?.value;
  if (!idStr) {
    redirect('/login');
  }
  const id = Number(idStr);
  const user = await findUserById(id);
  if (!user) {
    // Invalidate cookie and redirect
    redirect('/login');
  }
  return user;
}

/**
 * Retrieves the authenticated user if available. Returns null when
 * unauthenticated. Useful in server components where redirecting is
 * undesirable, such as rendering a shared navbar.
 *
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const idStr = cookieStore.get('userId')?.value;
  if (!idStr) return null;
  const id = Number(idStr);
  const user = await findUserById(id);
  return user || null;
}