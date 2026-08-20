export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { isUsernameAvailable, updateUserProfile } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

export async function PATCH(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });

  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let userId;
    try { userId = verifyToken(token).userId; }
    catch { return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); }

    const body = await request.json().catch(() => ({}));
    const { username, name } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username wajib diisi" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username hanya boleh huruf, angka, dan underscore (3-30 karakter)" },
        { status: 400 }
      );
    }

    const available = await isUsernameAvailable(username, userId);
    if (!available) {
      return NextResponse.json({ error: "Username sudah digunakan oleh akun lain" }, { status: 409 });
    }

    const updated = await updateUserProfile(userId, {
      username: username.trim().toLowerCase(),
      name: (name || "").trim() || username.trim(),
    });

    return NextResponse.json({ message: "Profil berhasil diperbarui", user: updated });
  } catch (err) {
    console.error("Failed to update profile:", err);
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}