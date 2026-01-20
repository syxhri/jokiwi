export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "@/lib/bot.js";
import { setUserQrisPayload, deleteUserQris } from "@/lib/db.js";

export async function GET(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    if (!user.qrisPayload) {
      return NextResponse.json(
        { error: "QRIS belum diupload. Silakan upload terlebih dahulu" },
        { status: 400 }
      );
    }

    return NextResponse.json({ qris: user.qrisPayload });
  } catch (err) {
    console.error("Gagal memuat QRIS:", err);
    return NextResponse.json({
      error: "Gagal memuat QRIS",
      detail: String(err),
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }
    
    const body = await request.json().catch(() => ({}));
    const qrisPayload = String(body.qrisPayload || "").trim();
    if (!qrisPayload) {
      return NextResponse.json(
        { error: "qrisPayload is required" },
        { status: 400 }
      );
    }

    await setUserQrisPayload(user.id, qrisPayload);
    return NextResponse.json({ message: "QRIS berhasil disimpan" });
  } catch (err) {
    console.error("Gagal menyimpan QRIS:", err);
    return NextResponse.json({
      error: "Gagal menyimpan QRIS",
      detail: String(err),
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    await deleteUserQris(user.id);
    return NextResponse.json({ message: "QRIS berhasil dihapus" });
  } catch (err) {
    console.error("Gagal menghapus QRIS:", err);
    return NextResponse.json(
      {
        error: "Gagal menghapus QRIS",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
