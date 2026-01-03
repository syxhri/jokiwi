// app/api/auth/logout/route.js

import { NextResponse } from 'next/server';

// Handle user logout. Removes the userId cookie by setting it
// with a maxAge of 0. Returns a simple JSON message.

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set({
    name: 'userId',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}