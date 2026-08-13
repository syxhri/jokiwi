export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { confirmPayment } from "@/lib/db.js";
import { notifyCustomer } from "@/lib/notify.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** POST /api/order/[id]/confirm-payment — Konfirmasi pembayaran manual oleh penjoki */
export async function POST(request, { params }) {
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

    const { id } = await params;

    const updated = await confirmPayment(userId, id);
    if (!updated) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Kirim notif ke customer bahwa pembayaran sudah dikonfirmasi
    await notifyCustomer(updated.customer_push_token, "payment_confirmed", {
      orderCode: updated.orderCode,
      taskName: updated.task_name,
    });

    return NextResponse.json({ message: "Pembayaran dikonfirmasi", order: updated });
  } catch (err) {
    console.error("Failed to confirm payment:", err);
    return NextResponse.json({ error: "Gagal konfirmasi pembayaran" }, { status: 500 });
  }
}

// [FUTURE] Endpoint ini bisa juga dipanggil oleh webhook payment gateway:
// POST /api/order/[id]/confirm-payment dengan signature verification dari gateway
