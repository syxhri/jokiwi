export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { rejectOrder } from "@/lib/db.js";
import { notifyCustomer } from "@/lib/notify.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** POST /api/order/[id]/reject — Penjoki tolak pesanan customer */
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

    const updated = await rejectOrder(userId, id);

    if (!updated) {
      return NextResponse.json(
        { error: "Order tidak ditemukan atau status bukan pending" },
        { status: 404 }
      );
    }

    // Kirim notif ke customer
    await notifyCustomer(updated.customer_push_token, "order_rejected", {
      orderCode: updated.orderCode,
      taskName: updated.task_name,
    });

    return NextResponse.json({ message: "Order ditolak", order: updated });
  } catch (err) {
    console.error("Failed to reject order:", err);
    return NextResponse.json({ error: "Gagal menolak order" }, { status: 500 });
  }
}
