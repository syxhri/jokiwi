export const runtime = "nodejs";
// app/api/user/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById } from "../../../lib/db.js";
import { AUTH_COOKIE_NAME, verifyToken } from "../../../lib/auth.js";

// Returns the currently authenticated user based on the userId cookie.
// If no user is logged in, responds with 401 and a null user object.

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    // omit sensitive fields
    const { passwordHash, qrisPayload, ...safeUser } = user;
    return NextResponse.json({
      user: { ...safeUser, hasQris: Boolean(qrisPayload) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
