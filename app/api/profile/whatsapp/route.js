export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken, whatsappSchema } from "@/lib/auth.js";
import { setUserWhatsapp } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** PATCH /api/profile/whatsapp — ubah nomor WhatsApp penjoki */
export async function PATCH(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi nanti." },
      { status: 429 }
    );
  }

  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = String(body.whatsapp_phone || "").trim();

    const validation = whatsappSchema.safeParse(phone);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Nomor WhatsApp tidak valid" },
        { status: 400 }
      );
    }

    await setUserWhatsapp(userId, validation.data);
    return NextResponse.json({ message: "Nomor WhatsApp berhasil disimpan" });
  } catch (err) {
    console.error("Failed to update WhatsApp:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan nomor WhatsApp" },
      { status: 500 }
    );
  }
}
