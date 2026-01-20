export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { findUserByUsername, verifyUserPassword } from "../../../../lib/db.js";
import { requireBotKey } from "../../../../lib/bot.js";
import { signTokenUser } from "../../../../lib/auth.js";

export async function POST(request) {
  try {
    const keyCheck = requireBotKey(request);
    if (!keyCheck.ok) {
      return NextResponse.json({ error: keyCheck.error });
    }

    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi!" },
        { status: 400 }
      );
    }
    const user = await findUserByUsername(username);
    const ok = await verifyUserPassword(user, password);
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Username atau password tidak valid!" },
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
    return NextResponse.json({ error: "Gagal melakukan login" }, { status: 500 });
  }
}
