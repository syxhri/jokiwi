export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { findUserByUsername, verifyUserPassword } from "@/lib/db.js";
import { AUTH_COOKIE_NAME, authValidator, signToken } from "@/lib/auth.js";
import { authLimiter, getClientIp } from "@/lib/client.js";

export async function POST(request) {
  try {
    const body = await request.json();
    let { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }
    
    const ip = getClientIp(request);
    const { success, reset, remaining } = await authLimiter.limit(ip);
    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }
  
    username = username.trim();
    password = password.trim();
    const validateResult = authValidator({ username, password });
    if (typeof validateResult === "object" && (Array.isArray(validateResult?.username) || Array.isArray(validateResult?.password))) {
      let errMsg = null;
      if (validateResult.username && validateResult.username.length > 0) {
        errMsg = validateResult.username[0];
      } else if (validateResult.password && validateResult.password.length > 0) {
        errMsg = validateResult.password[0];
      }
      
      return NextResponse.json(
        { error: errMsg },
        { status: 400 }
      );
    }
    
    const user = await findUserByUsername(username);
    const ok = await verifyUserPassword(user, password);
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Username atau password tidak valid" },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ message: "Login berhasil", ...user });
    const token = signToken(user.userCode);
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
    return NextResponse.json({ error: "Login gagal" }, { status: 500 });
  }
}
