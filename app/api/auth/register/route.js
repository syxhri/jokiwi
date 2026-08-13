export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { findUserByCode, createUser } from "@/lib/db.js";
import { authValidator, whatsappSchema } from "@/lib/auth.js";
import { customLimiter, getClientIp } from "@/lib/client.js";
import { findUserByUsername } from "@/lib/db.js";

export async function POST(request) {
  try {
    const body = await request.json();
    let { username, password, name, whatsapp_phone } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi nomor WhatsApp wajib diisi saat register
    if (!whatsapp_phone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib diisi" },
        { status: 400 }
      );
    }

    const cleanPhone = formatPhone628(whatsapp_phone);
    const phoneValidation = whatsappSchema.safeParse(cleanPhone);
    if (!phoneValidation.success) {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib diawali 628 (contoh: 628123456789)" },
        { status: 400 }
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

    const ip = getClientIp(request);
    const { success, reset } = await customLimiter(1, "30 m", "rl:auth").limit(ip);
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

    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username sudah ada yang pake" },
        { status: 409 }
      );
    }

    const user = await createUser({
      username,
      password,
      name: name || "",
      whatsappPhone: phoneValidation.data,
    });

    const { signToken } = await import("@/lib/auth.js");
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
