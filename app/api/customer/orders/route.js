export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAllJoki, getAllCategoriesForUser, createCustomerOrder } from "@/lib/db.js";
import { notifyJoki } from "@/lib/notify.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/**
 * GET /api/customer/orders — Ambil daftar penjoki tersedia (untuk form /book)
 * Query params: ?joki_user_code=U... untuk ambil kategori penjoki tertentu
 */
export async function GET(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jokiUserCode = searchParams.get("joki_user_code");

    if (jokiUserCode) {
      // Ambil kategori dari penjoki tertentu
      const categories = await getAllCategoriesForUser(jokiUserCode);
      return NextResponse.json({ categories });
    }

    // Ambil semua penjoki
    const joki = await getAllJoki();
    return NextResponse.json({ joki });
  } catch (err) {
    console.error("Failed to fetch joki list:", err);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

import { formatPhone628, whatsappSchema } from "@/lib/auth.js";

/**
 * POST /api/customer/orders — Customer buat pesanan baru (tanpa akun)
 * Body: { joki_user_code, customer_name, customer_phone, task_name,
 *         category_id?, custom_category?, deadline_date?, notes? }
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      joki_user_code,
      customer_name,
      customer_phone,
      task_name,
      category_id,
      custom_category,
      deadline_date,
      notes,
    } = body;

    // Validasi field wajib
    if (!joki_user_code) {
      return NextResponse.json({ error: "Penjoki harus dipilih" }, { status: 400 });
    }
    if (!customer_name || customer_name.trim().length < 2) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi (minimal 2 karakter)" }, { status: 400 });
    }
    if (!customer_phone) {
      return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    // Format & validasi nomor WhatsApp (wajib 628xxx)
    const cleanPhone = formatPhone628(customer_phone);
    const phoneCheck = whatsappSchema.safeParse(cleanPhone);
    if (!phoneCheck.success) {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib diawali 628 (contoh: 628123456789)" },
        { status: 400 }
      );
    }

    if (!task_name || task_name.trim().length < 3) {
      return NextResponse.json({ error: "Nama tugas wajib diisi (minimal 3 karakter)" }, { status: 400 });
    }

    const order = await createCustomerOrder(joki_user_code, {
      customer_name: customer_name.trim(),
      customer_phone: cleanPhone,
      task_name: task_name.trim(),
      categoryId: category_id || null,
      customCategory: custom_category || null,
      deadline_date: deadline_date || null,
      notes: notes || "",
    });

    // Notif ke penjoki
    await notifyJoki(order.userId, order.id, "order_placed", {
      customerName: order.customer_name,
      taskName: order.task_name,
    });

    return NextResponse.json(
      { message: "Pesanan berhasil dibuat", orderCode: order.orderCode },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to create customer order:", err);
    const msg = err.message?.includes("Penjoki") ? err.message : "Gagal membuat pesanan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
