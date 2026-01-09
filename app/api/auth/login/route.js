export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { findUserByUsername, verifyUserPassword } from "../../../../lib/db.js";
import { AUTH_COOKIE_NAME, signToken } from "../../../../lib/auth.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    const user = await findUserByUsername(username);
    const ok = await verifyUserPassword(user, password);
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ message: "Login successful" });
    const token = signToken(user.id);
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
