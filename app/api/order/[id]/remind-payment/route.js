export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { findOrder, recordReminderSent } from "@/lib/db.js";
import { notifyCustomer } from "@/lib/notify.js";
import { customLimiter, getClientIp } from "@/lib/client.js";

// Rate limit: max 3 reminder per 10 menit per IP
const remindLimiter = customLimiter(3, "10 m", "rl:remind");

/** POST /api/order/[id]/remind-payment — Penjoki kirim reminder bayar manual ke customer */
export async function POST(request, { params }) {
  const ip = getClientIp(request);
  const { success } = await remindLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu sering mengirim reminder. Harap tunggu beberapa menit." },
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

    const { id } = await params;

    const order = await findOrder(userId, id);
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.is_paid) {
      return NextResponse.json({ error: "Order ini sudah lunas" }, { status: 400 });
    }

    if (!order.customer_push_token) {
      return NextResponse.json(
        { error: "Customer belum mengaktifkan notifikasi di halaman tracking" },
        { status: 400 }
      );
    }

    // Kirim notifikasi push ke customer
    await notifyCustomer(order.customer_push_token, "payment_reminder", {
      orderCode: order.orderCode,
      price: order.price,
    });

    // Catat reminder di DB
    await recordReminderSent(order.id);

    return NextResponse.json({
      message: "Reminder pembayaran berhasil dikirimkan ke customer! 🔔",
    });
  } catch (err) {
    console.error("Failed to send manual payment reminder:", err);
    return NextResponse.json({ error: "Gagal mengirim reminder" }, { status: 500 });
  }
}
