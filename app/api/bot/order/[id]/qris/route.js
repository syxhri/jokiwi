export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "@/lib/bot.js";
import { findOrder, findUserByCode } from "@/lib/db.js";
import { defGen } from "@/lib/qris.js";

export async function GET(_req, { params }) {
  try {
    const { user, error, status } = await requireBotUser(request);
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const orderId = params.id;
    if (!orderId.startsWith("OD")) {
      return NextResponse.json({
        error: "Order ID tidak valid",
        detail: `orderId: ${orderId}`,
      }, { status: 400 });
    }

    const order = await findOrder(user.id, orderId);
    if (!order) {
      return NextResponse.json({ error: "Orderan tidak ditemukan" }, { status: 404 });
    }

    const qris = user?.qrisPayload;
    if (!qris) {
      return NextResponse.json(
        { error: "Silakan upload QRIS kamu terlebih dahulu" },
        { status: 400 }
      );
    }

    const amount = String(Math.max(0, Number(order.price || 0) || 0)).replace(
      /\.0+$/,
      ""
    );
    if (!/^\d+$/.test(amount)) {
      return NextResponse.json(
        {
          error: "Harga orderan tidak valid",
          detail: `amount: ${amount}`,
        },
        { status: 400 }
      );
    }

    const { dataUrl } = await defGen({ qris, amount });
    return NextResponse.json({ dataUrl });
  } catch (err) {
    console.error("Gagal membuat QRIS:", err);
    return NextResponse.json(
      {
        error: "Gagal membuat QRIS",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
