export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "../../../../lib/bot.js";
import { findOrder, updateOrder, deleteOrder } from "../../../../lib/db.js";

function parseIds(params) {
  const id = params.id;
  const { user, error, status } = await requireBotUser(request);
  return { id, userId: error ? null : user.id };
}

export async function GET(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Order ID tidak valid" }, { status: 400 });
    }
    
    const order = await findOrder(userId, id);
    if (!order) {
      return NextResponse.json({ error: "Orderan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error("Gagal memuat orderan:", err);
    return NextResponse.json(
      { error: "Gagal memuat orderan" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Order ID tidak valid" }, { status: 400 });
    }
    
    const body = await request.json();
    const updated = await updateOrder(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Orderan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Gagal mengupdate orderan:", err);
    return NextResponse.json(
      { error: "Gagal mengupdate orderan" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Order ID tidak valid" }, { status: 400 });
    }
    
    const ok = await deleteOrder(userId, id);
    return NextResponse.json({ deleted: ok });
  } catch (err) {
    console.error("Gagal menghapus orderan:", err);
    return NextResponse.json(
      { error: "Gagal menghapus orderan" },
      { status: 500 }
    );
  }
}
