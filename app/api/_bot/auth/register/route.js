export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createUser, findUserByUsername } from "../../../../lib/db.js";
import { requireBotKey } from "../../../../lib/bot.js";
import { signTokenUser } from "../../../../lib/auth.js";

export async function POST(request) {
  try {
    const keyCheck = requireBotKey(request);
    if (!keyCheck.ok) {
      return NextResponse.json({ error: keyCheck.error });
    }

    const body = await request.json();
    const { username, password, name } = body || {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi!" },
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
    const user = await createUser({ username, password, name: name || "" });
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
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}
