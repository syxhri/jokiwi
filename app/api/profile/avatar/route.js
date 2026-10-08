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

    const maxSize = 5 * 1024 * 1024; // 5MB — sesuai setting Supabase bucket
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran foto maksimal 5MB" }, { status: 400 });
    }

    // Supabase bucket strict MIME: image/* — tolak semua non-image sebelum upload
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar (JPG, PNG, WebP, dll)" }, { status: 400 });
    }

    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("svg+xml", "svg");
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
      // Parse error dari Supabase untuk pesan yang lebih jelas
      const msg = uploadError.message || "";
      if (msg.includes("Entity Too Large") || msg.includes("maximum allowed size")) {
        return NextResponse.json({ error: "Ukuran foto melebihi batas maksimal Supabase (5MB)" }, { status: 413 });
      }
      if (msg.includes("mime") || msg.includes("MIME") || msg.includes("content type")) {
        return NextResponse.json({ error: "Format file tidak diizinkan. Upload gambar (JPG, PNG, WebP, dll)" }, { status: 415 });
      }
      return NextResponse.json({ error: "Gagal upload foto profil. Coba lagi nanti." }, { status: 500 });
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
