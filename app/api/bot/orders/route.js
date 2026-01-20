export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "@/lib/bot.js";
import { filterOrders, computeStats, createOrder } from "@/lib/db.js";

export async function GET(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isDone = searchParams.get("is_done");
    const isPaid = searchParams.get("is_paid");
    const categoryCode = searchParams.get("categoryCode");
    const sortBy = searchParams.get("sortBy") || "assigned_date";
    const sortDir = searchParams.get("sortDir") || "desc";
    const orders = await filterOrders({
      userId: user.id,
      search,
      isDone,
      isPaid,
      categoryCode,
      sortBy,
      sortDir,
    });
    const stats = computeStats(orders);
    return NextResponse.json({ orders, stats });
  } catch (err) {
    console.error("Gagal memuat orderan:", err);
    return NextResponse.json(
      {
        error: "Gagal memuat orderan",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    const data = await request.json();
    const {
      client_name,
      task_name,
      price,
      categoryId,
      notes,
      is_done = false,
      is_paid = false,
      assigned_date,
      deadline_date,
    } = data || {};
    if (!client_name || !task_name || price === undefined) {
      return NextResponse.json(
        {
          error: "Nama client, nama tugas, dan harga wajib diisi!",
          detail: `client_name: ${client_name}; task_name: ${task_name}; price: ${price}`,
        },
        { status: 400 }
      );
    }
    const newOrder = await createOrder(user.id, {
      client_name,
      task_name,
      price,
      categoryId,
      notes,
      is_done,
      is_paid,
      assigned_date,
      deadline_date,
    });
    return NextResponse.json(newOrder, { status: 201 });
  } catch (err) {
    console.error("Gagal membuat orderan:", err);
    return NextResponse.json(
      {
        error: "Gagal membuat orderan",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
