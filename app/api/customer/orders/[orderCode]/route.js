export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { findOrderByCode } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/**
 * GET /api/customer/orders/[orderCode] — Customer cek status pesanan
 * Publik — hanya butuh order_code
 * Return: data order yang aman (tanpa storage_path, push_token, dll)
 */
export async function GET(request, { params }) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const { orderCode } = await params;

    if (!orderCode || !orderCode.startsWith("OD")) {
      return NextResponse.json({ error: "Kode order tidak valid" }, { status: 400 });
    }

    const order = await findOrderByCode(orderCode);
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Return data yang aman untuk customer — jangan expose storage_path, push_token, dll
    return NextResponse.json({
      orderCode: order.orderCode,
      taskName: order.task_name,
      categoryName: order.category_name,
      notes: order.notes,
      deadlineDate: order.deadline_date,
      createdAt: order.created_at,
      status: order.status,
      price: order.status === "accepted" || order.status === "done" ? order.price : null,
      estimatedHours: order.status === "accepted" || order.status === "done" ? order.estimated_hours : null,
      isPaid: order.is_paid,
      hasFile: Boolean(order.storage_path),
      fileAvailable: Boolean(order.storage_path) && !order.file_delete_at, // false jika sudah dijadwalkan hapus
      hasExternalLink: Boolean(order.external_link),
      // Link external hanya ditampilkan jika SUDAH LUNAS
      externalLink: order.is_paid ? order.external_link : null,
      // Info penjoki (untuk petunjuk pembayaran)
      jokiName: order.jokiName,
      jokiUsername: order.jokiUsername,
      jokiWhatsapp: order.jokiWhatsapp,
      // QRIS payload hanya jika order diterima dan belum dibayar
      jokiQrisPayload:
        (order.status === "accepted" || order.status === "done") && !order.is_paid
          ? order.jokiQrisPayload
          : null,
    });
  } catch (err) {
    console.error("Failed to fetch order status:", err);
    return NextResponse.json({ error: "Gagal mengambil status order" }, { status: 500 });
  }
}
