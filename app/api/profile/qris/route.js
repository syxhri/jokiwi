export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "../../../../lib/auth.js";
import { setUserQrisPayload } from "../../../../lib/db.js";

export async function POST(request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const qrisPayload = String(body.qrisPayload || "").trim();
    if (!qrisPayload) {
      return NextResponse.json(
        { error: "qrisPayload wajib diisi" },
        { status: 400 }
      );
    }

    await setUserQrisPayload(userId, qrisPayload);
    return NextResponse.json({ message: "QRIS saved" });
  } catch (err) {
    console.error("Failed to save QRIS:", err);
    return NextResponse.json({ error: "Failed to save QRIS" }, { status: 500 });
  }
}
