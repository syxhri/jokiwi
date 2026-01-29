export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createUser, findUserByUsername } from "@/lib/db.js";
import { requireBotKey } from "@/lib/bot.js";
import { authValidator, signTokenUser } from "@/lib/auth.js";

export async function POST(request) {
  try {
    const keyCheck = requireBotKey(request);
    if (!keyCheck.ok) {
      return NextResponse.json({ error: keyCheck.error });
    }

    const body = await request.json();
    let { username, password, name } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        {
          error: "Username dan password wajib diisi!",
          detail: `username: ${username}; password: ${password}`,
        },
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
    
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username ini sudah dipake" },
        { status: 409 }
      );
    }
    const user = await createUser({ username, password, name: (name || "").trim() });
    const token = signTokenUser(user);
    
    return NextResponse.json({
      token,
      user: {
        id: user.userCode,
        username: user.username,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      error: "Gagal membuat akun",
      detail: String(err),
    }, { status: 500 });
  }
}
