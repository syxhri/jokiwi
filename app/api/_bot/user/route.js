export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "../../../lib/bot.js";
import { findUserByCode } from "../../../lib/db.js";
import { verifyToken } from "../../../lib/auth.js";

export async function GET(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    return NextResponse.json({
      user,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memuat user" }, { status: 500 });
  }
}
