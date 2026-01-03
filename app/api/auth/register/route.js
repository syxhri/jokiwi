// app/api/auth/register/route.js

import { NextResponse } from 'next/server';
import { createUser, findUserByUsername } from '../../../../../lib/db.js';

// Handle user registration. Expects JSON { username, password, name }
// in the request body. Usernames must be unique. On success, the
// created userId is stored in a cookie to log the user in immediately.

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, name } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 },
      );
    }
    const user = await createUser({ username, password, name: name || '' });
    const response = NextResponse.json({ message: 'Registration successful' });
    response.cookies.set({
      name: 'userId',
      value: String(user.id),
      httpOnly: true,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}