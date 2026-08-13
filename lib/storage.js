/**
 * lib/storage.js
 * Wrapper Supabase Storage untuk upload, download (stream), dan delete file hasil joki.
 *
 * Bucket: private (tidak bisa diakses publik tanpa signed URL)
 * Path: order-results/{orderCode}/{filename}
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "order-results";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY are required"
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Daftar ekstensi yang DIBLACKLIST karena potensi eksekusi kode di server.
 * Format: lowercase extension tanpa titik.
 */
const BLACKLISTED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "sh", "bash",
  "php", "php3", "php4", "php5", "phtml",
  "py", "pyc", "rb", "pl", "perl", "cgi",
  "jar", "war", "ear",
  "dll", "so", "dylib",
  "vbs", "vbe", "wsf", "wsh",
  "ps1", "ps2", "psm1",
  "app", "deb", "rpm",
  "htaccess", "htpasswd",
]);

/**
 * Daftar MIME type yang DIBLACKLIST.
 */
const BLACKLISTED_MIME_PREFIXES = [
  "application/x-executable",
  "application/x-sharedlib",
  "application/x-shellscript",
  "application/x-php",
  "text/x-php",
  "application/x-msdos-program",
  "application/x-msdownload",
];

/**
 * Validasi file sebelum diupload.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateFile(filename, mimetype, sizeBytes) {
  // Cek ukuran (max 50MB sesuai limit Supabase free tier)
  const MAX_BYTES = 50 * 1024 * 1024;
  if (sizeBytes > MAX_BYTES) {
    return {
      ok: false,
      error: `Ukuran file terlalu besar (>50 MB). Silakan gunakan opsi 'Link External' (Google Drive / Mega / Dropbox) untuk file besar.`,
    };
  }

  // Ambil semua ekstensi (e.g. "malware.pdf.exe" → ["pdf", "exe"])
  const parts = filename.toLowerCase().split(".");
  parts.shift(); // buang nama file sebelum titik pertama
  for (const ext of parts) {
    if (BLACKLISTED_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        error: `Tipe file .${ext} tidak diizinkan karena alasan keamanan.`,
      };
    }
  }

  // Cek MIME type
  if (mimetype) {
    const mime = mimetype.toLowerCase();
    for (const blocked of BLACKLISTED_MIME_PREFIXES) {
      if (mime.startsWith(blocked)) {
        return {
          ok: false,
          error: `Tipe MIME ${mime} tidak diizinkan.`,
        };
      }
    }
    // Blokir aplikasi executable generik
    if (mime === "application/octet-stream") {
      // Hanya blokir jika ekstensi juga mencurigakan — sudah ditangani di atas
    }
  }

  return { ok: true };
}

/**
 * Sanitasi nama file: hanya izinkan karakter aman, ganti spasi dengan underscore.
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.\-_() ]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 200); // max 200 char
}

/**
 * Upload file ke Supabase Storage.
 * @param {string} orderCode - kode order (dipakai sebagai subfolder)
 * @param {Buffer|Uint8Array} fileBuffer - isi file
 * @param {string} filename - nama file asli (akan disanitasi)
 * @param {string} mimetype - MIME type file
 * @returns {Promise<{ storagePath: string, publicUrl?: string }>}
 */
export async function uploadFile(orderCode, fileBuffer, filename, mimetype) {
  const supabase = getSupabase();
  const safeName = sanitizeFilename(filename);
  const storagePath = `${orderCode}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimetype || "application/octet-stream",
      upsert: true, // izinkan overwrite untuk re-upload
    });

  if (error) {
    console.error("[Storage] Upload error:", error);
    throw new Error(`Gagal mengupload file: ${error.message}`);
  }

  return { storagePath };
}

/**
 * Download file dari Supabase Storage sebagai Buffer (untuk di-proxy ke client).
 * @param {string} storagePath - path di storage (e.g. "OD1234/hasil.pdf")
 * @returns {Promise<{ data: ArrayBuffer, contentType: string }>}
 */
export async function downloadFile(storagePath) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error("[Storage] Download error:", error);
    throw new Error(`Gagal mengunduh file: ${error?.message || "File tidak ditemukan"}`);
  }

  const buffer = await data.arrayBuffer();
  const contentType = data.type || "application/octet-stream";
  return { buffer, contentType };
}

/**
 * Hapus file dari Supabase Storage.
 * @param {string} storagePath
 */
export async function deleteFile(storagePath) {
  if (!storagePath) return;
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[Storage] Delete error:", error);
    // Tidak throw — file mungkin sudah terhapus, tidak perlu crash
  }
}
