export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getOrdersPendingFileCleanup, clearOrderFile } from "@/lib/db.js";
import { deleteFile } from "@/lib/storage.js";

/** GET /api/cron/cleanup-files
 *  Dipanggil oleh Vercel Cron setiap 5 menit.
 *  Hapus file dari Supabase Storage untuk order yang sudah melewati file_delete_at.
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const orders = await getOrdersPendingFileCleanup();
    let deleted = 0;

    for (const order of orders) {
      try {
        // Hapus dari Supabase Storage
        await deleteFile(order.storagePath);

        // Bersihkan referensi di DB
        await clearOrderFile(order.id);

        deleted++;
        console.log(`[Cron] Deleted file for order ${order.orderCode}: ${order.storagePath}`);
      } catch (err) {
        console.error(`[Cron] Cleanup error for order ${order.orderCode}:`, err.message);
      }
    }

    console.log(`[Cron] cleanup-files: deleted ${deleted}/${orders.length}`);
    return NextResponse.json({ ok: true, total: orders.length, deleted });
  } catch (err) {
    console.error("[Cron] cleanup-files failed:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
