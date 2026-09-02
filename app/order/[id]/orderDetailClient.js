"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";
import ReceiptCard from "@/components/ReceiptCard";
import QRISLogo from "@/components/QRISLogo";
import ModalPortal from "@/components/ModalPortal";

export default function OrderDetailClient({ order: initialOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);

  // Modals & Action States
  const [acceptModal, setAcceptModal] = useState({ open: false, price: "", estimated_hours: "", loading: false, error: "" });
  const [uploadModal, setUploadModal] = useState({ open: false, isReupload: false, tab: "file", linkInput: order.external_link || "", loading: false, error: "" });
  const [qrisModal, setQrisModal] = useState({ open: false, loading: false, dataUrl: "", error: "" });
  const [receiptModal, setReceiptModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", actionType: null, loading: false });
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "", type: "info" });
  const [uploadingFile, setUploadingFile] = useState(false);

  const receiptRef = useRef(null);

  // Refresh order data
  async function refreshOrder() {
    try {
      const res = await fetch(`/api/order/${order.orderCode}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch {}
  }

  // --- Handlers ---

  async function handleAccept(e) {
    e.preventDefault();
    setAcceptModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      const res = await fetch(`/api/order/${order.orderCode}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(acceptModal.price),
          estimated_hours: acceptModal.estimated_hours ? Number(acceptModal.estimated_hours) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAcceptModal((m) => ({ ...m, loading: false, error: data.error || "Gagal menerima pesanan" }));
        return;
      }
      setAcceptModal({ open: false, price: "", estimated_hours: "", loading: false, error: "" });
      setAlertModal({ open: true, title: "Berhasil! ✅", message: "Pesanan berhasil diterima dan notifikasi telah dikirim ke customer.", type: "success" });
      router.refresh();
      await refreshOrder();
    } catch {
      setAcceptModal((m) => ({ ...m, loading: false, error: "Terjadi kesalahan" }));
    }
  }

  function triggerReject() {
    setConfirmDialog({
      open: true,
      title: "Tolak Pesanan?",
      message: "Yakin ingin menolak pesanan ini? Customer akan menerima notifikasi penolakan.",
      actionType: "reject",
      loading: false,
    });
  }

  function triggerConfirmPayment() {
    setConfirmDialog({
      open: true,
      title: "Konfirmasi Pembayaran?",
      message: "Tandai pesanan ini sebagai LUNAS? Customer akan mendapatkan notifikasi untuk mengunduh hasil.",
      actionType: "confirm_payment",
      loading: false,
    });
  }

  function triggerDelete() {
    setConfirmDialog({
      open: true,
      title: "Hapus Orderan?",
      message: "Perhatian! Orderan ini akan dihapus secara permanen dari database.",
      actionType: "delete",
      loading: false,
    });
  }

  async function handleConfirmAction() {
    const { actionType } = confirmDialog;
    setConfirmDialog((d) => ({ ...d, loading: true }));

    try {
      if (actionType === "reject") {
        const res = await fetch(`/api/order/${order.orderCode}/reject`, { method: "POST" });
        if (!res.ok) throw new Error();
        setConfirmDialog({ open: false, title: "", message: "", actionType: null, loading: false });
        setAlertModal({ open: true, title: "Pesanan Ditolak", message: "Pesanan berhasil ditolak.", type: "info" });
        router.refresh();
        await refreshOrder();
      } else if (actionType === "confirm_payment") {
        const res = await fetch(`/api/order/${order.orderCode}/confirm-payment`, { method: "POST" });
        if (!res.ok) throw new Error();
        setConfirmDialog({ open: false, title: "", message: "", actionType: null, loading: false });
        setAlertModal({ open: true, title: "Pembayaran Lunas!", message: "Status pembayaran berhasil diubah menjadi LUNAS.", type: "success" });
        router.refresh();
        await refreshOrder();
      } else if (actionType === "delete") {
        const res = await fetch(`/api/order/${order.orderCode}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setConfirmDialog({ open: false, title: "", message: "", actionType: null, loading: false });
        router.push("/orders");
      }
    } catch {
      setConfirmDialog((d) => ({ ...d, loading: false }));
      setAlertModal({ open: true, title: "Gagal", message: "Terjadi kesalahan saat memproses tindakan.", type: "error" });
    }
  }

  async function handleFileUpload(file, isReupload = false) {
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = isReupload ? `/api/order/${order.orderCode}/reupload` : `/api/order/${order.orderCode}/upload`;
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertModal({ open: true, title: "Gagal Upload", message: data.error || "Gagal mengupload file.", type: "error" });
        return;
      }
      setAlertModal({ open: true, title: "Upload Berhasil!", message: "File hasil kerja berhasil diunggah dan notifikasi dikirim ke customer.", type: "success" });
      setUploadModal({ open: false, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" });
      router.refresh();
      await refreshOrder();
    } catch {
      setAlertModal({ open: true, title: "Error", message: "Gagal mengupload file.", type: "error" });
    } finally {
      setUploadingFile(false);
    }
  }

  async function submitExternalLink(e) {
    e.preventDefault();
    if (!uploadModal.linkInput || !/^https?:\/\//i.test(uploadModal.linkInput.trim())) {
      setUploadModal((m) => ({ ...m, error: "Link external harus diawali http:// atau https://" }));
      return;
    }
    setUploadModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      const endpoint = uploadModal.isReupload
        ? `/api/order/${order.orderCode}/reupload`
        : `/api/order/${order.orderCode}/upload`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_link: uploadModal.linkInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadModal((m) => ({ ...m, loading: false, error: data.error || "Gagal menyimpan link" }));
        return;
      }
      setUploadModal({ open: false, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" });
      setAlertModal({ open: true, title: "Link Tersimpan!", message: "Link external berhasil disimpan dan dikirimkan ke customer.", type: "success" });
      router.refresh();
      await refreshOrder();
    } catch {
      setUploadModal((m) => ({ ...m, loading: false, error: "Terjadi kesalahan" }));
    }
  }

  async function handleRemindViaWhatsApp() {
    const phone = cleanCustomerPhone;
    if (!phone) {
      setAlertModal({ open: true, title: "Info", message: "Nomor WhatsApp customer tidak tersedia.", type: "info" });
      return;
    }
    const msg = encodeURIComponent(
      `Halo ${order.customer_name || ""}, jangan lupa selesaikan pembayaran untuk orderan *${order.orderCode}* - ${order.task_name}. Total: Rp ${Number(order.price || 0).toLocaleString("id-ID")}. Terima kasih!`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  async function handleRemindViaPush() {
    try {
      const res = await fetch(`/api/order/${order.orderCode}/remind-payment`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (data.whatsappFallback) {
        setAlertModal({ open: true, title: "Info", message: "Customer belum aktifkan notifikasi push. Gunakan tombol WhatsApp untuk mengirim pengingat.", type: "info" });
        return;
      }
      if (!res.ok) {
        setAlertModal({ open: true, title: "Gagal", message: data.error || "Gagal mengirim pengingat.", type: "error" });
        return;
      }
      setAlertModal({ open: true, title: "Berhasil ✅", message: data.message || "Pengingat pembayaran berhasil dikirimkan via notifikasi.", type: "success" });
    } catch {
      setAlertModal({ open: true, title: "Error", message: "Gagal mengirim pengingat.", type: "error" });
    }
  }

  async function handleMakeQris() {
    setQrisModal({ open: true, loading: true, dataUrl: "", error: "" });
    try {
      const res = await fetch(`/api/order/${order.orderCode}/qris`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQrisModal({ open: true, loading: false, dataUrl: "", error: data.error || "Gagal membuat QRIS" });
        return;
      }
      setQrisModal({ open: true, loading: false, dataUrl: data.dataUrl || "", error: "" });
    } catch {
      setQrisModal({ open: true, loading: false, dataUrl: "", error: "Gagal membuat QRIS" });
    }
  }

  async function handleReceiptDownloadPng() {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Struk_${order.orderCode || "ORDER"}.png`;
      a.click();
    } catch {
      setAlertModal({ open: true, title: "Gagal Download", message: "Gagal membuat gambar PNG struk.", type: "error" });
    }
  }

  async function handleReceiptDownloadPdf() {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`Struk_${order.orderCode || "ORDER"}.pdf`);
    } catch {
      setAlertModal({ open: true, title: "Gagal Download", message: "Gagal membuat dokumen PDF struk.", type: "error" });
    }
  }

  const cleanCustomerPhone = order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "") : null;
  const waUrl = cleanCustomerPhone ? `https://wa.me/${cleanCustomerPhone}` : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-50">
              {order.orderCode}
            </h1>
            {order.status && order.status !== "manual" && (
              <StatusBadge type="order-status" status={order.status} />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Dibuat pada {order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/orders" className="btn btn-secondary text-xs">
            ← Kembali ke List
          </Link>
          <button
            type="button"
            onClick={triggerDelete}
            className="btn btn-secondary text-xs text-red-600 hover:text-red-800 dark:text-red-400"
          >
            Hapus Orderan
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Detail Utama (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Card Info Tugas */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-slate-800 pb-3">
              Informasi Orderan
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Nama Tugas</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{order.task_name || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Kategori / Mata Kuliah</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.category_name || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Tanggal Disuruh</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.assigned_date || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Deadline</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{order.deadline_date || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Harga</span>
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  Rp {Number(order.price || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Estimasi Pengerjaan</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {order.estimated_hours ? `${order.estimated_hours} jam` : "-"}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="pt-2">
                <span className="text-xs text-gray-400 block mb-1">Catatan Tambahan</span>
                <p className="text-xs bg-gray-50 dark:bg-slate-800 p-3 rounded-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-slate-800 pb-3">
              Detail Customer
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {order.customer_name || order.client_name || "Client Manual"}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {order.customer_phone || "Belum ada nomor WA"}
                </p>
              </div>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-xs inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800"
                >
                  <span>Chat WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Panel Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-slate-800 pb-2">
              Aksi
            </h3>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge type="done" status={order.is_done} />
              <StatusBadge type="paid" status={order.is_paid} />
            </div>

            <div className="space-y-2 pt-2">
              {/* Accept / Reject jika status pending */}
              {order.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => setAcceptModal({ open: true, price: "", estimated_hours: "", loading: false, error: "" })}
                    className="btn btn-primary w-full text-xs"
                  >
                    Terima Orderan
                  </button>
                  <button
                    type="button"
                    onClick={triggerReject}
                    className="btn btn-secondary w-full text-xs text-red-600 hover:text-red-800"
                  >
                    Tolak Orderan
                  </button>
                </>
              )}

              {/* Upload hasil / link */}
              {order.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => setUploadModal({ open: true, isReupload: false, tab: "file", linkInput: order.external_link || "", loading: false, error: "" })}
                  className="btn btn-primary w-full text-xs"
                >
                  Upload Hasil Pengerjaan
                </button>
              )}

              {/* Reupload / Ganti Link & Confirm Payment */}
              {(order.status === "done" || order.is_done) && (
                <>
                  <button
                    type="button"
                    onClick={() => setUploadModal({ open: true, isReupload: true, tab: order.external_link ? "link" : "file", linkInput: order.external_link || "", loading: false, error: "" })}
                    className="btn btn-secondary w-full text-xs"
                  >
                    Upload Ulang / Ganti Link
                  </button>
                  {!order.is_paid && (
                    <button
                      type="button"
                      onClick={triggerConfirmPayment}
                      className="btn btn-primary w-full text-xs"
                    >
                      Konfirmasi Lunas
                    </button>
                  )}
                </>
              )}

              {/* Remind Payment Buttons */}
              {!order.is_paid && (order.status === "accepted" || order.status === "done") && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-medium">Kirim Pengingat Bayar:</p>
                  <button
                    type="button"
                    onClick={handleRemindViaWhatsApp}
                    className="btn btn-secondary w-full text-xs text-emerald-600 hover:text-emerald-800"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleRemindViaPush}
                    className="btn btn-secondary w-full text-xs text-amber-700 hover:text-amber-800"
                  >
                    🔔 Notifikasi Push
                  </button>
                </div>
              )}

              {/* Standard utilities */}
              <button
                type="button"
                onClick={handleMakeQris}
                className="btn btn-secondary w-full text-xs"
              >
                Buat QRIS
              </button>

              {order.is_paid && (
                <button
                  type="button"
                  onClick={() => setReceiptModal(true)}
                  className="btn btn-secondary w-full text-xs text-amber-600"
                >
                  Buat Struk
                </button>
              )}

              <Link
                href={`/order/${order.orderCode}/edit`}
                className="btn btn-secondary w-full text-xs text-center block"
              >
                Edit Orderan
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS SECTION --- */}

      {/* Accept Modal */}
      {acceptModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !acceptModal.loading && setAcceptModal((m) => ({ ...m, open: false }))}
          >
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">Terima Pesanan</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Tentukan harga dan estimasi waktu pengerjaan.</p>
              {acceptModal.error && <p className="text-xs text-red-600 mb-3">{acceptModal.error}</p>}
              <form onSubmit={handleAccept} className="space-y-3">
                <div>
                  <label className="label">Harga (Rp) *</label>
                  <input type="number" min="0" step="1000" required className="input" placeholder="150000" value={acceptModal.price} onChange={(e) => setAcceptModal((m) => ({ ...m, price: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="label">Estimasi Waktu (jam, opsional)</label>
                  <input type="number" min="0" step="0.5" className="input" placeholder="24" value={acceptModal.estimated_hours} onChange={(e) => setAcceptModal((m) => ({ ...m, estimated_hours: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={acceptModal.loading} className="btn btn-primary flex-1 text-xs">
                    {acceptModal.loading ? "Menyimpan…" : "Terima Orderan"}
                  </button>
                  <button type="button" disabled={acceptModal.loading} onClick={() => setAcceptModal({ open: false, price: "", estimated_hours: "", loading: false, error: "" })} className="btn btn-secondary text-xs">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Upload Modal */}
      {uploadModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !uploadModal.loading && setUploadModal((m) => ({ ...m, open: false }))}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{uploadModal.isReupload ? "🔄 Upload Ulang Hasil" : "📤 Kirim Hasil Pekerjaan"}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Orderan: <span className="font-mono font-semibold">{order.orderCode}</span></p>
              </div>
              <div className="flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button type="button" onClick={() => setUploadModal((m) => ({ ...m, tab: "file", error: "" }))} className={`flex-1 py-1.5 rounded-lg text-center transition ${uploadModal.tab === "file" ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500"}`}>📁 Upload File (&lt;50MB)</button>
                <button type="button" onClick={() => setUploadModal((m) => ({ ...m, tab: "link", error: "" }))} className={`flex-1 py-1.5 rounded-lg text-center transition ${uploadModal.tab === "link" ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500"}`}>🔗 Link External (&gt;50MB)</button>
              </div>
              {uploadModal.error && <div className="rounded-xl bg-red-50 text-xs text-red-700 p-3">{uploadModal.error}</div>}
              {uploadModal.tab === "file" ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Pilih file hasil pekerjaan (Maksimal 50 MB di Supabase Storage).</p>
                  <input type="file" disabled={uploadingFile} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, uploadModal.isReupload); e.target.value = ""; }} className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700" />
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => setUploadModal({ open: false, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" })} className="btn btn-secondary text-xs">Batal</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitExternalLink} className="space-y-3">
                  <p className="text-xs text-gray-500">Tempel link Google Drive / Mega / Cloud Storage jika file &gt; 50 MB:</p>
                  <input type="url" required placeholder="https://drive.google.com/file/d/..." value={uploadModal.linkInput} onChange={(e) => setUploadModal((m) => ({ ...m, linkInput: e.target.value }))} className="input text-xs" autoFocus />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={uploadModal.loading} className="btn btn-primary flex-1 text-xs">{uploadModal.loading ? "Menyimpan…" : "💾 Simpan Link & Kirim Notif"}</button>
                    <button type="button" onClick={() => setUploadModal({ open: false, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" })} className="btn btn-secondary text-xs">Batal</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* QRIS Modal */}
      {qrisModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setQrisModal({ open: false, loading: false, dataUrl: "", error: "" })}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <QRISLogo className="h-10 w-24" />
                <button type="button" onClick={() => setQrisModal({ open: false, loading: false, dataUrl: "", error: "" })} className="text-xs text-gray-500">Tutup</button>
              </div>
              {qrisModal.loading && <p className="text-xs text-gray-500">Loading QRIS…</p>}
              {qrisModal.error && <p className="text-xs text-red-600">{qrisModal.error}</p>}
              {qrisModal.dataUrl && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <Image src={qrisModal.dataUrl} alt="QRIS" width={224} height={224} className="mx-auto h-56 w-56 object-contain rounded-xl" />
                  </div>
                  <a href={qrisModal.dataUrl} download={`QRIS_${order.orderCode}.png`} className="btn btn-primary w-full text-center text-xs block">Download QRIS</a>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Struk Modal */}
      {receiptModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReceiptModal(false)}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Struk Pembayaran</h3>
                <button type="button" onClick={() => setReceiptModal(false)} className="text-xs text-gray-500">Tutup</button>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-2" data-receipt-root>
                <ReceiptCard order={order} ref={receiptRef} variant="plain" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={handleReceiptDownloadPdf} className="btn btn-secondary flex-1 text-xs">Download PDF</button>
                <button type="button" onClick={handleReceiptDownloadPng} className="btn btn-primary flex-1 text-xs">Download PNG</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Custom Confirm Modal (Replacement for window.confirm) */}
      {confirmDialog.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !confirmDialog.loading && setConfirmDialog({ open: false, title: "", message: "", actionType: null, loading: false })}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{confirmDialog.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{confirmDialog.message}</p>
              <div className="flex gap-2 pt-2">
                <button type="button" disabled={confirmDialog.loading} onClick={handleConfirmAction} className={`btn flex-1 text-xs ${confirmDialog.actionType === "delete" || confirmDialog.actionType === "reject" ? "btn-primary bg-red-600 hover:bg-red-700 border-red-600" : "btn-primary"}`}>
                  {confirmDialog.loading ? "Memproses…" : "Ya, Lanjutkan"}
                </button>
                <button type="button" disabled={confirmDialog.loading} onClick={() => setConfirmDialog({ open: false, title: "", message: "", actionType: null, loading: false })} className="btn btn-secondary text-xs">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Custom Alert Modal (Replacement for window.alert) */}
      {alertModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAlertModal((a) => ({ ...a, open: false }))}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-base font-bold ${alertModal.type === "error" ? "text-red-600" : alertModal.type === "success" ? "text-emerald-600" : "text-primary-600"}`}>
                {alertModal.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">{alertModal.message}</p>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setAlertModal((a) => ({ ...a, open: false }))} className="btn btn-primary text-xs">
                  OK
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
