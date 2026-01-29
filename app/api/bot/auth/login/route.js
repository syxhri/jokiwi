export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { findUserByUsername, verifyUserPassword } from "@/lib/db.js";
import { requireBotKey } from "@/lib/bot.js";
import { authValidator, signTokenUser } from "@/lib/auth.js";

export async function POST(request) {
  try {
    const keyCheck = requireBotKey(request);
    if (!keyCheck.ok) {
      return NextResponse.json({ error: keyCheck.error });
    }

    const body = await request.json();
    let { username, password } = body || {};
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
    
    const user = await findUserByUsername(username);
    const ok = await verifyUserPassword(user, password);
    if (!user || !ok) {
      return NextResponse.json(
        {
          error: "Username atau password tidak valid!",
          detail: `user: ${!(!user)}; verified: ${!(!ok)}`,
        },
        { status: 401 }
      );
    }
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
      error: "Gagal melakukan login",
      detail: String(err),
    }, { status: 500 });
  }
}
