export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getOrdersPendingPaymentReminder, updateReminderSent } from "@/lib/db.js";
import { notifyCustomer } from "@/lib/notify.js";

/** GET /api/cron/payment-reminder
 *  Dipanggil oleh Vercel Cron setiap 30 menit.
 *  Kirim web push pengingat bayar ke customer yang belum bayar tapi file sudah selesai.
 */
export async function GET(request) {
  // Proteksi dengan CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const orders = await getOrdersPendingPaymentReminder();
    let sent = 0;

    for (const order of orders) {
      try {
        await notifyCustomer(order.customer_push_token, "payment_reminder", {
          orderCode: order.orderCode,
          taskName: order.task_name,
          price: order.price,
        });

        await updateReminderSent(order.id);
        sent++;
      } catch (err) {
        console.error(`[Cron] Reminder error for order ${order.orderCode}:`, err.message);
      }
    }

    console.log(`[Cron] payment-reminder: sent ${sent}/${orders.length}`);
    return NextResponse.json({ ok: true, total: orders.length, sent });
  } catch (err) {
    console.error("[Cron] payment-reminder failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
