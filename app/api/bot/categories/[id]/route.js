export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "@/lib/bot.js";
import {
  findCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/db.js";

async function parseIds(params) {
  const id = params.id;
  const { user, error, status } = await requireBotUser(request);
  
  return { id, userId: error ? null : user.id };
}

export async function GET(_req, { params }) {
  try {
    const { id, userId } = await parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }
    
    const category = await findCategory(userId, id);
    if (!category) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Gagal memuat kategori",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id, userId } = await parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    
    const body = await request.json();
    const updated = await updateCategory(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Gagal mengupdate kategori",
        detail: String(err),
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id, userId } = await parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    
    const ok = await deleteCategory(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Gagal menghapus kategori",
        detail: String(err),
      },
      { status: 400 }
    );
  }
}
