export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "../../../lib/bot.js";
import { getAllCategoriesForUser, createCategory } from "../../../lib/db.js";

export async function GET(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    const categories = await getAllCategoriesForUser(user.id);
    return NextResponse.json(categories);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal memuat kategori" },
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
    
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi!" }, { status: 400 });
    }
    const category = await createCategory(user.id, body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}
