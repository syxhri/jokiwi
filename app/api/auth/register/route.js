export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createUser, findUserByUsername } from "../../../../lib/db.js";
import { AUTH_COOKIE_NAME, signToken } from "../../../../lib/auth.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, name } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }
    const user = await createUser({ username, password, name: name || "" });
    const response = NextResponse.json({ message: "Registration successful" });
    const token = signToken(user.id);
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
