export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** GET /api/notifications — Ambil notifikasi penjoki yang sedang login */
export async function GET(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "30"), 100);

    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(userId, limit),
      countUnreadNotifications(userId),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return NextResponse.json({ error: "Gagal mengambil notifikasi" }, { status: 500 });
  }
}

/** PATCH /api/notifications — Mark semua notifikasi sebagai sudah dibaca */
export async function PATCH(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
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

    await markAllNotificationsRead(userId);
    return NextResponse.json({ message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
    return NextResponse.json({ error: "Gagal update notifikasi" }, { status: 500 });
  }
}
