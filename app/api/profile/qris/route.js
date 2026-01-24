export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { setUserQrisPayload, deleteUserQris } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

export async function POST(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi nanti." },
      { status: 429 }
    );
  }

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
        { error: "qrisPayload is required" },
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

export async function DELETE(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi nanti." },
      { status: 429 }
    );
  }

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

    await deleteUserQris(userId);
    return NextResponse.json({ message: "QRIS deleted" });
  } catch (err) {
    console.error("Failed to delete QRIS:", err);
    return NextResponse.json(
      { error: "Failed to delete QRIS" },
      { status: 500 }
    );
  }
}
