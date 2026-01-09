"use client";

import { useRef, useState } from "react";
import jsQR from "jsqr";

export default function ProfileClient({ user }) {
  const [hasQris, setHasQris] = useState(Boolean(user.qrisPayload));
  const [status, setStatus] = useState(hasQris ? "QRIS Tersimpan ✅" : "");
  const [payloadPreview, setPayloadPreview] = useState(
    hasQris ? user.qrisPayload : ""
  );
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  async function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Gagal load gambar"));
        img.src = String(e.target?.result || "");
      };
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsDataURL(file);
    });
  }

  async function decodeQrFromImage(img) {
    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, canvas.width, canvas.height);
    return result?.data || null;
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Membaca gambar QRIS...");
    setPayloadPreview("");

    try {
      const img = await readImage(file);
      const payload = await decodeQrFromImage(img);
      if (!payload) {
        setStatus(
          "Gagal membaca QR dari gambar. Coba pakai gambar yang lebih jelas."
        );
        return;
      }

      setBusy(true);
      setStatus("QR terbaca, menyimpan...");

      const res = await fetch("/api/profile/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrisPayload: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Gagal menyimpan QRIS");
      }

      setHasQris(true);
      setPayloadPreview(payload);
      setStatus("QRIS berhasil disimpan ✅");
    } catch (err) {
      setStatus(err?.message || "Terjadi kesalahan.");
    } finally {
      setBusy(false);
      // reset input so user can re-upload same file
      e.target.value = "";
    }
  }

  async function handleDeleteQRIS() {
    const ok = window.confirm("Yakin mau menghapus QRIS yang tersimpan?");
    if (!ok) return;
    try {
      setStatus("Menghapus QRIS...");
      const res = await fetch("/api/profile/qris", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus QRIS");
        return;
      }
      setHasQris(false);
      setStatus("Belum ada QRIS");
      setPayloadPreview("");
    } catch {
      alert("Gagal menghapus QRIS");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Profil</h1>
        {/*<span className="text-xs text-gray-500">
          {hasQris ? "QRIS tersimpan" : "Belum ada QRIS"}
        </span>*/}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Username:</span> {user.username}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Nama:</span> {user.name || "-"}
          </p>
        </div>

        <div className="h-px bg-gray-100" />

        {status && <p className="text-xs text-gray-600">{status}</p>}
        {hasQris ? (
          <>
            <span
              onClick={() => handleDeleteQRIS()}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Hapus QRIS
            </span>

            {payloadPreview && (
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer">
                  Lihat payload yang tersimpan
                </summary>
                <div className="mt-2 max-h-40 overflow-auto break-all rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <code>{payloadPreview}</code>
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">
              Upload QRIS Statis
            </p>
            <p className="text-xs text-gray-500">
              Upload gambar QRIS kamu. Sistem akan membaca QR menjadi teks, lalu
              teks itu dipakai untuk generate QRIS dinamis per order.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={busy}
              className="text-sm"
            />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
