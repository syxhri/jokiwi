"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import QRISLogo from "@/components/QRISLogo";
import Image from "next/image";
import ModalPortal from "@/components/ModalPortal";

export default function ProfileClient({ user }) {
  const router = useRouter();

  // ─── QRIS state ─────────────────────────────────────────────
  const [hasQris, setHasQris] = useState(Boolean(user.qrisPayload));
  const [qrisStatus, setQrisStatus] = useState("");
  const [qrisError, setQrisError] = useState("");
  const [payloadPreview, setPayloadPreview] = useState(hasQris ? user.qrisPayload : "");
  const [qrisImageUrl, setQrisImageUrl] = useState(user.qrisImageUrl || null);
  const [busyQris, setBusyQris] = useState(false);
  const [deleteQrisConfirm, setDeleteQrisConfirm] = useState(false);
  const canvasRef = useRef(null);

  // ─── WhatsApp state ──────────────────────────────────────────
  const [whatsapp, setWhatsapp] = useState(user.whatsappPhone || "");
  const [editingWa, setEditingWa] = useState(false);
  const [waInput, setWaInput] = useState(user.whatsappPhone || "");
  const [waStatus, setWaStatus] = useState("");
  const [waError, setWaError] = useState("");
  const [busyWa, setBusyWa] = useState(false);

  // ─── Profile (username/name) state ───────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: user.username || "", name: user.name || "" });
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);

  // ─── Alert modal state ───────────────────────────────────────
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "", type: "info" });

  // ─── QRIS functions ──────────────────────────────────────────
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
    setQrisError("");
    setPayloadPreview("");
    try {
      const img = await readImage(file);
      const payload = await decodeQrFromImage(img);
      if (!payload) {
        setQrisError("QR Code tidak terbaca. Pastikan gambar QRIS jelas dan tidak blur.");
        setQrisStatus("");
        return;
      }
      if (!payload.startsWith("00020101")) {
        setQrisError("Kode QR bukan format QRIS yang valid.");
        setQrisStatus("");
        return;
      }
      setQrisStatus("QRIS valid — menyimpan...");
      setPayloadPreview(payload);
      setBusyQris(true);
      const res = await fetch("/api/profile/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQrisError(data.error || "Gagal menyimpan QRIS");
        setQrisStatus("");
        return;
      }
      setHasQris(true);
      setQrisImageUrl(data.qrisImageUrl || null);
      setQrisStatus("QRIS berhasil disimpan!");
      router.refresh();
    } catch (err) {
      setQrisError(err.message || "Terjadi kesalahan");
      setQrisStatus("");
    } finally {
      setBusyQris(false);
      e.target.value = "";
    }
  }

  async function handleDeleteQRIS() {
    setDeleteQrisConfirm(false);
    setBusyQris(true);
    setQrisError("");
    try {
      const res = await fetch("/api/profile/qris", { method: "DELETE" });
      if (res.ok) {
        setHasQris(false);
        setQrisImageUrl(null);
        setPayloadPreview("");
        setQrisStatus("QRIS berhasil dihapus.");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setQrisError(d.error || "Gagal menghapus QRIS");
      }
    } catch {
      setQrisError("Terjadi kesalahan");
    } finally {
      setBusyQris(false);
    }
  }

  // ─── WhatsApp functions ──────────────────────────────────────
  async function handleSaveWa(e) {
    e.preventDefault();
    setWaError("");
    setWaStatus("");
    const clean = waInput.trim().replace(/[^0-9+]/g, "");
    const formatted = clean.startsWith("08") ? "628" + clean.slice(2)
      : clean.startsWith("+62") ? clean.slice(1)
      : clean;
    if (!/^628[0-9]{8,12}$/.test(formatted)) {
      setWaError("Nomor WhatsApp harus diawali 628 (contoh: 628123456789)");
      return;
    }
    setBusyWa(true);
    try {
      const res = await fetch("/api/profile/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatted }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWaError(data.error || "Gagal menyimpan nomor WA");
        return;
      }
      setWhatsapp(formatted);
      setEditingWa(false);
      setWaStatus("Nomor WhatsApp berhasil disimpan.");
      router.refresh();
    } catch {
      setWaError("Terjadi kesalahan");
    } finally {
      setBusyWa(false);
    }
  }

  // ─── Profile update functions ────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileStatus("");
    const username = profileForm.username.trim();
    const name = profileForm.name.trim();
    if (!username) { setProfileError("Username wajib diisi"); return; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setProfileError("Username hanya huruf, angka, underscore (3-30 karakter)");
      return;
    }
    setBusyProfile(true);
    try {
      const res = await fetch("/api/profile/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data.error || "Gagal memperbarui profil");
        return;
      }
      setProfileStatus("Profil berhasil diperbarui.");
      setEditingProfile(false);
      router.refresh();
    } catch {
      setProfileError("Terjadi kesalahan");
    } finally {
      setBusyProfile(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Profil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola informasi akun dan pengaturan penjoki kamu.</p>
      </div>

      {/* Info Akun */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Info Akun</h2>
          {!editingProfile && (
            <button type="button" onClick={() => { setEditingProfile(true); setProfileError(""); setProfileStatus(""); setProfileForm({ username: user.username || "", name: user.name || "" }); }}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold">
              Ubah
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="label">Username</label>
              <input type="text" value={profileForm.username} onChange={(e) => setProfileForm(f => ({ ...f, username: e.target.value }))}
                className="input" placeholder="username" autoFocus />
              <p className="text-[11px] text-gray-400 mt-1">3-30 karakter, huruf/angka/underscore. Harus unik.</p>
            </div>
            <div>
              <label className="label">Nama Tampil</label>
              <input type="text" value={profileForm.name} onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="Nama kamu" />
            </div>
            {profileError && <p className="text-xs text-red-600">{profileError}</p>}
            {profileStatus && <p className="text-xs text-emerald-600">{profileStatus}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={busyProfile} className="btn btn-primary text-xs flex-1">
                {busyProfile ? "Menyimpan…" : "Simpan Profil"}
              </button>
              <button type="button" onClick={() => setEditingProfile(false)} className="btn btn-secondary text-xs">Batal</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            {profileStatus && <p className="text-xs text-emerald-600">{profileStatus}</p>}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {(user.name || user.username || "?")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-50">{user.name || user.username}</p>
                <p className="text-xs text-gray-500 font-mono">@{user.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm border-t border-gray-50 dark:border-slate-800">
              <span className="text-gray-400 text-xs">Email</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs truncate">{user.email || "-"}</span>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Nomor WhatsApp</h2>
          {whatsapp && !editingWa && (
            <button type="button" onClick={() => { setEditingWa(true); setWaInput(whatsapp); setWaError(""); setWaStatus(""); }}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold">
              Ubah
            </button>
          )}
        </div>

        {editingWa || !whatsapp ? (
          <form onSubmit={handleSaveWa} className="space-y-3">
            <div>
              <label className="label">Nomor WA (format 628...)</label>
              <input type="tel" value={waInput} onChange={(e) => { setWaInput(e.target.value); setWaError(""); }}
                className="input font-mono" placeholder="628123456789" autoFocus={editingWa} />
            </div>
            {waError && <p className="text-xs text-red-600">{waError}</p>}
            {waStatus && <p className="text-xs text-emerald-600">{waStatus}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busyWa} className="btn btn-primary text-xs flex-1">
                {busyWa ? "Menyimpan…" : "Simpan Nomor"}
              </button>
              {editingWa && <button type="button" onClick={() => { setEditingWa(false); setWaError(""); }} className="btn btn-secondary text-xs">Batal</button>}
            </div>
          </form>
        ) : (
          <div className="space-y-1">
            {waStatus && <p className="text-xs text-emerald-600">{waStatus}</p>}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{whatsapp}</p>
                <p className="text-xs text-gray-400 mt-0.5">Nomor ini digunakan customer untuk menghubungi kamu.</p>
              </div>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 transition-colors">
                Test WA
              </a>
            </div>
          </div>
        )}
      </div>

      {/* QRIS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <QRISLogo className="h-8 w-20" />
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasQris ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-slate-800"}`}>
              {hasQris ? "Aktif" : "Belum diatur"}
            </span>
          </div>
          {hasQris && (
            <button type="button" onClick={() => setDeleteQrisConfirm(true)} disabled={busyQris}
              className="text-xs text-red-500 hover:text-red-700 font-semibold">
              Hapus QRIS
            </button>
          )}
        </div>

        {qrisError && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{qrisError}</p>}
        {qrisStatus && <p className="text-xs text-emerald-600">{qrisStatus}</p>}

        {/* Tampilkan QR image jika sudah ada */}
        {hasQris && qrisImageUrl && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 inline-block">
              <img src={qrisImageUrl} alt="QRIS" className="h-44 w-44 object-contain" />
            </div>
            <p className="text-xs text-gray-400 text-center">QRIS ini ditampilkan ke customer saat pembayaran.</p>
          </div>
        )}

        {hasQris && !qrisImageUrl && payloadPreview && (
          <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-3">
            <p className="text-[11px] text-gray-400 mb-1">Payload QRIS</p>
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all line-clamp-3">{payloadPreview}</p>
          </div>
        )}

        <div>
          <label className="label">{hasQris ? "Ganti QRIS (upload ulang gambar)" : "Upload gambar QRIS kamu"}</label>
          <input type="file" accept="image/*" disabled={busyQris} onChange={onFileChange}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/40 dark:file:text-primary-300" />
          <p className="text-[11px] text-gray-400 mt-1">Upload foto/screenshot QRIS dari bank atau aplikasi pembayaran kamu.</p>
        </div>
      </div>

      {/* Delete QRIS Confirm Modal */}
      {deleteQrisConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteQrisConfirm(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Hapus QRIS?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">QRIS kamu akan dihapus dan customer tidak dapat membayar via QRIS hingga kamu upload ulang.</p>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleDeleteQRIS}
                  className="btn btn-primary flex-1 text-xs bg-red-600 hover:bg-red-700 border-red-600">
                  Ya, Hapus
                </button>
                <button type="button" onClick={() => setDeleteQrisConfirm(false)}
                  className="btn btn-secondary text-xs">Batal</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Alert Modal */}
      {alertModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setAlertModal(a => ({ ...a, open: false }))}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-3"
              onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-base font-bold ${alertModal.type === "error" ? "text-red-600" : alertModal.type === "success" ? "text-emerald-600" : "text-primary-600"}`}>
                {alertModal.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">{alertModal.message}</p>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setAlertModal(a => ({ ...a, open: false }))}
                  className="btn btn-primary text-xs">OK</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}