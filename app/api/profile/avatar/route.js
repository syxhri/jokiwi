export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { setUserAvatar } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const AVATAR_BUCKET = "avatars";

export async function POST(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    let userId;
    try { userId = verifyToken(token).userId; } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File avatar wajib diupload" }, { status: 400 });
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran foto maksimal 2MB" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format foto harus JPG, PNG, WebP, atau GIF" }, { status: 400 });
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const filename = `${userId}_${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Supabase Storage bucket "avatars"
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return NextResponse.json({ error: "Gagal upload foto profil" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filename);

    const avatarUrl = publicUrlData.publicUrl;
    await setUserAvatar(userId, avatarUrl);

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("Failed to update avatar:", err);
    return NextResponse.json({ error: "Gagal menyimpan foto profil" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    let userId;
    try { userId = verifyToken(token).userId; } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    await setUserAvatar(userId, null);
    return NextResponse.json({ message: "Foto profil dihapus" });
  } catch (err) {
    console.error("Failed to delete avatar:", err);
    return NextResponse.json({ error: "Gagal menghapus foto profil" }, { status: 500 });
  }
}
