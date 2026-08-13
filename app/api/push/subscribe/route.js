export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { savePushSubscription } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";
import { VAPID_PUBLIC_KEY } from "@/lib/webpush.js";

/** GET /api/push/subscribe — Ambil VAPID public key untuk client */
export async function GET() {
  return NextResponse.json({ vapidPublicKey: VAPID_PUBLIC_KEY });
}

/** POST /api/push/subscribe — Simpan push subscription penjoki yang login */
export async function POST(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
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
    const { subscription } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await savePushSubscription(userId, JSON.stringify(subscription));
    return NextResponse.json({ message: "Push subscription tersimpan" });
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    return NextResponse.json({ error: "Gagal menyimpan subscription" }, { status: 500 });
  }
}
