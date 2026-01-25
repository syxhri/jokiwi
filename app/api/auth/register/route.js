export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createUser, findUserByUsername } from "@/lib/db.js";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth.js";
import { customLimiter, getClientIp } from "@/lib/client.js";

export async function POST(request) {
  const ip = getClientIp(request);
  const { success, reset, remaining } = await customLimiter(1, "30 m", "rl:auth").limit(ip);
  if (!success) {
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    
    return NextResponse.json(
      { error: "Terlalu banyak percobaan register. Coba lagi nanti." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { username, password, name } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }
    
    username = username.trim();
    password = password.trim();
    if (username.length < 5) {
      return NextResponse.json(
        { error: "Username harus terdiri dari minimal 5 karakter" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password harus terdiri dari minimal 8 karakter" },
        { status: 400 }
      );
    }
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username sudah ada yang pake" },
        { status: 409 }
      );
    }
    const user = await createUser({ username, password, name: name || "" });
    const response = NextResponse.json({ message: "Register berhasil" });
    const token = signToken(user.userCode);
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
    return NextResponse.json({ error: "Register gagal" }, { status: 500 });
  }
}
