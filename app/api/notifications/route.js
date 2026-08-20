export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  countUnreadNotifications,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

async function getAuthUserId(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) return { error: "Terlalu banyak request.", status: 429 };

  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { error: "Unauthenticated", status: 401 };

  try {
    const userId = verifyToken(token).userId;
    return { userId };
  } catch {
    return { error: "Unauthenticated", status: 401 };
  }
}

/** GET /api/notifications */
export async function GET(request) {
  const auth = await getAuthUserId(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "30"), 100);

    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(auth.userId, limit),
      countUnreadNotifications(auth.userId),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return NextResponse.json({ error: "Gagal mengambil notifikasi" }, { status: 500 });
  }
}

/** PATCH /api/notifications — Tandai semua sudah dibaca */
export async function PATCH(request) {
  const auth = await getAuthUserId(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await markAllNotificationsRead(auth.userId);
    return NextResponse.json({ message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
    return NextResponse.json({ error: "Gagal update notifikasi" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * - Body { id } → hapus satu notifikasi
 * - Body { all: true } → hapus semua notifikasi
 */
export async function DELETE(request) {
  const auth = await getAuthUserId(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json().catch(() => ({}));

    if (body.all) {
      await deleteAllNotifications(auth.userId);
      return NextResponse.json({ message: "Semua notifikasi dihapus" });
    }

    if (body.id) {
      await deleteNotification(auth.userId, body.id);
      return NextResponse.json({ message: "Notifikasi dihapus" });
    }

    return NextResponse.json({ error: "Sertakan id atau all: true" }, { status: 400 });
  } catch (err) {
    console.error("Failed to delete notification:", err);
    return NextResponse.json({ error: "Gagal menghapus notifikasi" }, { status: 500 });
  }
}
