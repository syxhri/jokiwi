export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { setUserAvatar, findUserById } from "@/lib/db.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const AVATAR_BUCKET = "avatars";

/**
 * Hapus foto profil lama milik user dari bucket Supabase.
 * Menghapus file dengan prefix `${userId}_` kecuali file baru (`keepFilename`),
 * serta menghapus file lama spesifik jika ada (`extraOldFilename`).
 */
async function deleteOldAvatars(userId, keepFilename = null, extraOldFilename = null) {
  try {
    const { data: files } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list("", { limit: 200 });

    const toDeleteSet = new Set();
    const prefix = `${userId}_`;

    if (files && files.length > 0) {
      for (const f of files) {
        if (f.name.startsWith(prefix) && f.name !== keepFilename) {
          toDeleteSet.add(f.name);
        }
      }
    }

    if (extraOldFilename && extraOldFilename !== keepFilename) {
      toDeleteSet.add(extraOldFilename);
    }

    const toDelete = Array.from(toDeleteSet);
    if (toDelete.length > 0) {
      await supabase.storage.from(AVATAR_BUCKET).remove(toDelete);
    }
  } catch (cleanupErr) {
    console.warn("Avatar cleanup warning:", cleanupErr);
  }
}

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

    // Ambil info avatar lama sebelum diganti
    const currentUser = await findUserById(userId);
    let oldFilename = null;
    if (currentUser?.avatarUrl) {
      try {
        oldFilename = currentUser.avatarUrl.split("/").pop();
      } catch {}
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

    // Bersihkan foto profil lama dari bucket di background
    await deleteOldAvatars(userId, filename, oldFilename);

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

    const currentUser = await findUserById(userId);
    let oldFilename = null;
    if (currentUser?.avatarUrl) {
      try {
        oldFilename = currentUser.avatarUrl.split("/").pop();
      } catch {}
    }

    await setUserAvatar(userId, null);

    // Hapus semua foto profil milik user ini dari bucket Supabase
    await deleteOldAvatars(userId, null, oldFilename);

    return NextResponse.json({ message: "Foto profil dihapus" });
  } catch (err) {
    console.error("Failed to delete avatar:", err);
    return NextResponse.json({ error: "Gagal menghapus foto profil" }, { status: 500 });
  }
}
