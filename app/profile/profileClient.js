"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import QRISLogo from "@/components/QRISLogo";

export default function ProfileClient({ user }) {
  const router = useRouter();

  // ─── QRIS state ───────────────────────────────────────────
  const [hasQris, setHasQris] = useState(Boolean(user.qrisPayload));
  const [qrisStatus, setQrisStatus] = useState(hasQris ? "QRIS Tersimpan ✅" : "");
  const [payloadPreview, setPayloadPreview] = useState(hasQris ? user.qrisPayload : "");
  const [busyQris, setBusyQris] = useState(false);
  const canvasRef = useRef(null);

  // ─── WhatsApp state ────────────────────────────────────────
  const [whatsapp, setWhatsapp] = useState(user.whatsappPhone || "");
  const [editingWa, setEditingWa] = useState(false);
  const [waInput, setWaInput] = useState(user.whatsappPhone || "");
  const [waStatus, setWaStatus] = useState("");
  const [busyWa, setBusyWa] = useState(false);

  // ─── QRIS functions ────────────────────────────────────────
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

    setQrisStatus("Membaca gambar QRIS...");
    setPayloadPreview("");

    try {
      const img = await readImage(file);
      const payload = await decodeQrFromImage(img);
      if (!payload) {
        setQrisStatus("Gagal membaca QR dari gambar. Coba pakai gambar yang lebih jelas.");
        return;
      }

      setBusyQris(true);
      setQrisStatus("QR terbaca, menyimpan...");

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
      setQrisStatus("QRIS berhasil disimpan ✅");
    } catch (err) {
      setQrisStatus(err?.message || "Terjadi kesalahan.");
    } finally {
      setBusyQris(false);
      e.target.value = "";
    }
  }

  async function handleDeleteQRIS() {
    const ok = window.confirm("Yakin mau menghapus QRIS yang tersimpan?");
    if (!ok) return;
    try {
      setQrisStatus("Menghapus QRIS...");
      const res = await fetch("/api/profile/qris", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus QRIS");
        return;
      }
      setHasQris(false);
      setQrisStatus("Belum ada QRIS");
      setPayloadPreview("");
    } catch {
      alert("Gagal menghapus QRIS");
    }
  }

  // ─── WhatsApp functions ────────────────────────────────────
  async function handleSaveWa(e) {
    e.preventDefault();
    setBusyWa(true);
    setWaStatus("");
    try {
      const res = await fetch("/api/profile/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_phone: waInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWaStatus(data.error || "Gagal menyimpan nomor WhatsApp");
        return;
      }
      setWhatsapp(waInput);
      setEditingWa(false);
      setWaStatus("Nomor WhatsApp berhasil disimpan ✅");
      router.refresh();
    } catch {
      setWaStatus("Terjadi kesalahan.");
    } finally {
      setBusyWa(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Profil</h1>

      {/* ─── Info Akun ─── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Info Akun
        </h2>
        <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-semibold">Username:</span> {user.username}
          </p>
          <p>
            <span className="font-semibold">Nama:</span> {user.name || "-"}
          </p>
        </div>
      </div>

      {/* ─── WhatsApp Section ─── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nomor WhatsApp
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Ditampilkan ke customer sebagai kontak untuk mengirim bukti bayar.
            </p>
          </div>
          {whatsapp && !editingWa && (
            <button
              type="button"
              onClick={() => {
                setWaInput(whatsapp);
                setEditingWa(true);
                setWaStatus("");
              }}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              Ubah
            </button>
          )}
        </div>

        {waStatus && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{waStatus}</p>
        )}

        {editingWa || !whatsapp ? (
          <form onSubmit={handleSaveWa} className="space-y-2">
            <input
              type="tel"
              value={waInput}
              onChange={(e) => setWaInput(e.target.value)}
              className="input text-sm"
              placeholder="08xxxxxxxxxx"
              required
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busyWa}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                {busyWa ? "Menyimpan…" : "Simpan"}
              </button>
              {editingWa && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingWa(false);
                    setWaInput(whatsapp);
                    setWaStatus("");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xl">📱</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {whatsapp}
            </span>
          </div>
        )}
      </div>

      {/* ─── QRIS Section ─── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <QRISLogo className="h-5 w-auto opacity-70" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            QRIS Pembayaran
          </h2>
        </div>

        {qrisStatus && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{qrisStatus}</p>
        )}

        {hasQris ? (
          <>
            <span
              onClick={handleDeleteQRIS}
              className="cursor-pointer text-xs text-red-600 hover:text-red-800"
            >
              Hapus QRIS
            </span>

            {qrisStatus === "QRIS berhasil disimpan ✅" && payloadPreview && (
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer">
                  Lihat payload yang tersimpan
                </summary>
                <div className="mt-2 max-h-40 overflow-auto break-all rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-800 p-2">
                  <code>{payloadPreview}</code>
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Upload QRIS
            </p>
            <p className="text-xs text-gray-500">
              Upload gambar QRIS kamu. Sistem akan membaca QR menjadi teks, lalu teks itu
              dipakai untuk generate QRIS dinamis per order.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={busyQris}
              className="text-sm"
            />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
