export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { setOrderCustomerPushToken } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";
import { VAPID_PUBLIC_KEY } from "@/lib/webpush.js";

/** GET — Ambil VAPID public key untuk subscribe */
export async function GET() {
  return NextResponse.json({ vapidPublicKey: VAPID_PUBLIC_KEY });
}

/** POST /api/customer/orders/[orderCode]/push-subscribe
 *  Customer subscribe web push untuk tracking order mereka
 */
export async function POST(request, { params }) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const { orderCode } = await params;
    const body = await request.json().catch(() => ({}));
    const { subscription } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    if (!orderCode?.startsWith("OD")) {
      return NextResponse.json({ error: "Kode order tidak valid" }, { status: 400 });
    }

    await setOrderCustomerPushToken(orderCode, JSON.stringify(subscription));
    return NextResponse.json({ message: "Push subscription tersimpan" });
  } catch (err) {
    console.error("Failed to save customer push subscription:", err);
    return NextResponse.json({ error: "Gagal menyimpan subscription" }, { status: 500 });
  }
}
