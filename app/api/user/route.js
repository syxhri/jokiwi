// app/api/user/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserById } from '../../../lib/db.js';

// Returns the currently authenticated user based on the userId cookie.
// If no user is logged in, responds with 401 and a null user object.

export async function GET() {
  try {
    const cookieStore = cookies();
    const idStr = cookieStore.get('userId')?.value;
    if (!idStr) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const id = Number(idStr);
    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    // omit password when sending to client
    const { password, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}