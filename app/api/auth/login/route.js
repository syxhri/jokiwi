// app/api/auth/login/route.js

import { NextResponse } from 'next/server';
import { findUserByUsername } from '../../../../../lib/db.js';

// Handle user login. Expects JSON { username, password } in the request
// body. If the credentials match an existing user, a HTTP-only cookie
// named `userId` is set on the response. The cookie is scoped to the
// entire application (path '/') and will be used by protected routes
// to identify the current user. On failure, an appropriate error code
// and message are returned.

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }
    const user = await findUserByUsername(username);
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }
    const response = NextResponse.json({ message: 'Login successful' });
    // Set a cookie containing the userId. In a production setting you
    // should consider using a signed or encrypted token.
    response.cookies.set({
      name: 'userId',
      value: String(user.id),
      httpOnly: true,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}