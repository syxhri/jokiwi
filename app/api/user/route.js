export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByCode } from "@/lib/db.js";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";

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
    const user = await findUserByCode(userId);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const { passwordHash, qrisPayload, ...safeUser } = user;
    return NextResponse.json({
      user: { ...safeUser, hasQris: Boolean(qrisPayload) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
