"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import QRISLogo from "@/components/QRISLogo";
import QRCode from "@/components/QRCode";

// ─── QRIS Generator ──────────────────────────────────────────
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildQrisWithAmount(payload, amount) {
  if (!payload || !amount) return payload;
  try {
    const amtStr = String(Math.round(Number(amount)));
    const amtField = `54${String(amtStr.length).padStart(2, "0")}${amtStr}`;
    let base = payload.endsWith("6304") ? payload.slice(0, -4) : payload;
    if (base.includes("5303360")) {
      base = base.replace(/54\d{2}\d+/, "");
    }
    const withAmt = base + amtField;
    const withoutCrc = withAmt.slice(0, -4) + "6304";
    return withoutCrc + crc16(withoutCrc);
  } catch {
    return payload;
  }
}

// ─── Status Badge ─────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  accepted: { label: "Diterima & Diproses", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  done:     { label: "Selesai", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  manual:   { label: "Diproses", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

// ─── Payment Dialog ───────────────────────────────────────────
function PaymentDialog({ order }) {
  const [qrisDataUrl, setQrisDataUrl] = useState("");
  const qrisWithAmount = order.jokiQrisPayload && order.price
    ? buildQrisWithAmount(order.jokiQrisPayload, order.price)
    : null;

  const waLink = order.jokiWhatsapp
    ? `https://wa.me/${order.jokiWhatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
        `Halo, saya ingin konfirmasi pembayaran pesanan *${order.orderCode}* - ${order.taskName}.\n\nMohon dikonfirmasi ya, terima kasih!`
      )}`
    : null;

  function downloadQris() {
    if (!qrisDataUrl) return;
    const link = document.createElement("a");
    link.href = qrisDataUrl;
    link.download = `QRIS_${order.orderCode || "ORDER"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-4">
      <h2 className="font-semibold text-amber-900 dark:text-amber-200">
        Selesaikan Pembayaran
      </h2>

      <div className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
        <p>
          <span className="font-semibold">Total Bayar: </span>
          Rp {Number(order.price || 0).toLocaleString("id-ID")}
        </p>
        {order.estimatedHours && (
          <p>
            <span className="font-semibold">Estimasi: </span>
            {order.estimatedHours} jam
          </p>
        )}
      </div>

      {/* Petunjuk kirim bukti bayar via WA */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Cara Bayar &amp; Kirim Bukti:
        </p>
        <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Scan QRIS di bawah atau transfer manual ke penjoki</li>
          <li>
            Kirim bukti pembayaran ke WhatsApp penjoki:{" "}
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-600 underline"
              >
                Chat penjoki
              </a>
            ) : (
              <span className="font-semibold">{order.jokiName || order.jokiUsername}</span>
            )}
          </li>
          <li>Tunggu konfirmasi dari penjoki, lalu kamu bisa download hasil</li>
        </ol>
      </div>

      {/* QRIS */}
      {qrisWithAmount && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            QR Pembayaran (sudah include nominal):
          </p>
          <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-inner">
            <QRCode value={qrisWithAmount} size={200} onDataUrl={setQrisDataUrl} />
          </div>
          <button
            onClick={downloadQris}
            className="btn btn-secondary text-xs w-full"
          >
            Download QRIS
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Push Subscribe Banner ────────────────────────────────────
function PushBanner({ orderCode, onSubscribed }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | denied | unsupported

  // Sembunyikan jika notifikasi sudah diizinkan (atau tidak didukung)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("done");
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  async function subscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch(`/api/customer/orders/${orderCode}/push-subscribe`);
      const { vapidPublicKey } = await vapidRes.json();
      if (!vapidPublicKey) { setStatus("denied"); return; }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const sub = await reg.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      await fetch(`/api/customer/orders/${orderCode}/push-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setStatus("done");
      onSubscribed?.();
    } catch (err) {
      console.error("Push subscribe error:", err);
      setStatus("denied");
    }
  }

  if (status !== "idle") return null;

  return (
    <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
          Aktifkan Notifikasi
        </p>
        <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">
          Dapatkan update otomatis saat pesanan diterima, selesai, atau ada pengingat bayar.
        </p>
        <button
          onClick={subscribe}
          disabled={status === "loading"}
          className="mt-2 btn btn-primary text-xs py-1.5 px-3"
        >
          {status === "loading" ? "Mengaktifkan…" : "Izinkan Notifikasi"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function TrackOrderPage() {
  const { orderCode } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderCode) return;
    try {
      const res = await fetch(`/api/customer/orders/${orderCode}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Order tidak ditemukan");
        return;
      }
      const data = await res.json();
      setOrder(data);
    } catch {
      setError("Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  }, [orderCode]);

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Polling setiap 15 detik selama status masih pending atau accepted
  useEffect(() => {
    if (!order || order.status === "rejected" || (order.status === "done" && order.hasFile)) return;
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError("");
    try {
      const res = await fetch(`/api/customer/orders/${orderCode}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "FILE_NOT_FOUND") {
          setDownloadError("File sudah tidak tersedia (dihapus otomatis). Hubungi penjoki untuk upload ulang.");
        } else {
          setDownloadError(data.error || "Gagal mengunduh file");
        }
        return;
      }

      // Trigger download dari response blob
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      const filename = match?.[1]
        ? decodeURIComponent(match[1])
        : order?.taskName?.replace(/[^a-zA-Z0-9]/g, "_") || "hasil";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Refresh order untuk update status file
      setTimeout(fetchOrder, 1000);
    } catch {
      setDownloadError("Terjadi kesalahan saat mengunduh");
    } finally {
      setDownloading(false);
    }
  }

  const statusCfg = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.manual) : null;
  const showPaymentDialog =
    order &&
    (order.status === "accepted" || order.status === "done") &&
    !order.isPaid;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="space-y-2 text-center">
          <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Memuat status order…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
        <div className="text-center space-y-5 max-w-sm">
          <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" strokeLinecap="round"/>
            <path d="M16 30c1.5-3 4.5-5 8-5s6.5 2 8 5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="20" r="2" fill="currentColor" stroke="none"/>
            <circle cx="31" cy="20" r="2" fill="currentColor" stroke="none"/>
          </svg>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              {error}
            </h1>
            <p className="text-sm text-gray-500">Pastikan kode order sudah benar, atau buat order baru.</p>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/track" className="btn btn-secondary text-sm">Cari Order Lain</a>
            <a href="/book" className="btn btn-primary text-sm">Buat Order Baru</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Status Order
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">{orderCode}</p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-gray-100 dark:border-slate-800 p-5 space-y-4">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusCfg.color}`}>
            <span>{statusCfg.label}</span>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {[
              { key: "pending", label: "Order Dikirim" },
              { key: "accepted", label: "Diproses Penjoki" },
              { key: "done", label: "Hasil Siap Diunduh" },
            ].map((step, i) => {
              const statuses = ["pending", "accepted", "done"];
              const currentIdx = statuses.indexOf(order.status);
              const isDone = i <= currentIdx && order.status !== "rejected";
              const isRejected = order.status === "rejected" && i === 0;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold
                      ${isDone ? "bg-primary-500 text-white" : isRejected ? "bg-red-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-400"}`}
                  >
                    {isDone ? "✓" : isRejected ? "✗" : i + 1}
                  </div>
                  <span className={`text-sm ${isDone ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400"}`}>
                    {step.label}
                    {step.key === "accepted" && order.status === "rejected" ? " (Ditolak)" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detail pesanan */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tugas</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%]">
                {order.taskName}
              </span>
            </div>
            {order.categoryName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Kategori</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.categoryName}</span>
              </div>
            )}
            {order.deadlineDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.deadlineDate}</span>
              </div>
            )}
            {(order.status === "accepted" || order.status === "done") && order.price && (
              <div className="flex justify-between">
                <span className="text-gray-500">Harga</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Rp {Number(order.price).toLocaleString("id-ID")}
                </span>
              </div>
            )}
            {(order.status === "accepted" || order.status === "done") && order.estimatedHours && (
              <div className="flex justify-between">
                <span className="text-gray-500">Estimasi</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.estimatedHours} jam</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Status Bayar</span>
              <span className={`font-semibold ${order.isPaid ? "text-green-600" : "text-amber-600"}`}>
                {order.isPaid ? "Lunas" : "Belum Dibayar"}
              </span>
            </div>
          </div>
        </div>

        {/* Push notification banner */}
        {order.status !== "rejected" && (
          <PushBanner orderCode={orderCode} onSubscribed={fetchOrder} />
        )}

        {/* Payment dialog — selalu tampil jika belum bayar dan sudah diterima */}
        {showPaymentDialog && <PaymentDialog order={order} />}

        {/* Download section */}
        {order.status === "done" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow border border-gray-100 dark:border-slate-800 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Hasil Pengerjaan
            </h2>

            {!order.isPaid ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Selesaikan pembayaran terlebih dahulu untuk mengakses Hasil Pengerjaan.
              </p>
            ) : order.hasExternalLink ? (
              /* Link External (Google Drive / Mega / Dropbox) */
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Hasil Pengerjaan tersedia via link external (Google Drive / Cloud Storage):
                </p>
                {order.externalLink ? (
                  <a
                    href={order.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    Buka Link Hasil (Google Drive / Mega)
                  </a>
                ) : (
                  <p className="text-sm text-amber-600">Link tidak tersedia.</p>
                )}
              </div>
            ) : !order.hasFile ? (
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  File tidak tersedia. File mungkin sudah dihapus otomatis setelah didownload.
                  Hubungi penjoki via WhatsApp untuk meminta upload ulang.
                </p>
                {order.jokiWhatsapp && (
                  <a
                    href={`https://wa.me/${order.jokiWhatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo, bisakah file untuk pesanan ${orderCode} diupload ulang? File saya sepertinya sudah terhapus. Terima kasih!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 btn btn-secondary text-xs inline-flex items-center gap-1"
                  >
                    Chat Penjoki
                  </a>
                )}
              </div>
            ) : (
              <>
                {downloadError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-2 text-xs text-red-700 dark:text-red-300">
                    {downloadError}
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="btn btn-primary w-full"
                >
                  {downloading ? "Mengunduh…" : "Download File Hasil"}
                </button>
                <p className="text-[11px] text-gray-400 text-center">
                  File akan otomatis dihapus dari server 15 menit setelah pertama kali didownload demi keamanan.
                </p>
              </>
            )}
          </div>
        )}

        {/* Rejected state */}
        {order.status === "rejected" && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 text-center space-y-3">
            <p className="font-semibold text-red-800 dark:text-red-200">
              Order Ditolak
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 pb-10">
              Maaf, penjoki tidak dapat menerima ordermu saat ini.
              Kamu bisa coba pesan ke penjoki lain.
            </p>
            <a href="/book" className="btn btn-primary text-sm">
              Buat Order Baru
            </a>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Simpan link halaman ini untuk melihat status orderanmu nanti.
        </p>
      </div>
    </div>
  );
}
