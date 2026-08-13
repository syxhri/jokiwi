export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { acceptOrder, findOrder } from "@/lib/db.js";
import { notifyCustomer } from "@/lib/notify.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** POST /api/order/[id]/accept — Penjoki terima pesanan customer */
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
    const body = await request.json().catch(() => ({}));
    const { price, estimated_hours } = body;

    if (!price || Number(price) <= 0) {
      return NextResponse.json({ error: "Harga wajib diisi dan harus lebih dari 0" }, { status: 400 });
    }

    const updated = await acceptOrder(userId, id, {
      price: Number(price),
      estimatedHours: estimated_hours ? Number(estimated_hours) : null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Order tidak ditemukan atau status bukan pending" },
        { status: 404 }
      );
    }

    // Kirim notif ke customer
    await notifyCustomer(updated.customer_push_token, "order_accepted", {
      orderCode: updated.orderCode,
      price: updated.price,
      estimatedHours: updated.estimated_hours,
      taskName: updated.task_name,
    });

    return NextResponse.json({ message: "Order diterima", order: updated });
  } catch (err) {
    console.error("Failed to accept order:", err);
    return NextResponse.json({ error: "Gagal menerima order" }, { status: 500 });
  }
}
