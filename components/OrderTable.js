"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import StatusBadge from "./StatusBadge";
import QRISLogo from "./QRISLogo";
import ReceiptCard from "./ReceiptCard";
import ModalPortal from "./ModalPortal";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function OrderTable({
  initialOrders,
  initialStats,
  categoryCode,
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("assigned_date");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  const [qrisModal, setQrisModal] = useState({
    open: false,
    loading: false,
    categoryCode: null,
    orderCode: null,
    dataUrl: "",
    error: "",
  });
  const [receiptModal, setReceiptModal] = useState({
    open: false,
    order: null,
  });
  // Modal untuk terima pesanan customer
  const [acceptModal, setAcceptModal] = useState({
    open: false,
    orderId: null,
    price: "",
    estimated_hours: "",
    loading: false,
    error: "",
  });
  // Modal untuk upload hasil (dukung Upload File & Link External GDrive >50MB)
  const [uploadModal, setUploadModal] = useState({
    open: false,
    orderCode: null,
    isReupload: false,
    tab: "file", // "file" | "link"
    linkInput: "",
    loading: false,
    error: "",
  });
  // State untuk status loading upload per order
  const [uploadState, setUploadState] = useState({}); // keyed by orderId

  const receiptRef = useRef(null);

  const hasData = useMemo(() => orders && orders.length > 0, [orders]);

  useEffect(() => {
    if (!qrisModal.open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        closeQrisModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrisModal.open]);

  useEffect(() => {
    const isModalOpen = qrisModal.open || receiptModal.open;
    document.body.style.overflow = isModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [qrisModal.open, receiptModal.open]);

  async function fetchOrders(signal) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    // Status filter — map chip values ke query params API
    if (filterStatus === "pending") params.set("status", "pending");
    else if (filterStatus === "accepted") params.set("status", "accepted");
    else if (filterStatus === "done") params.set("status", "done");
    else if (filterStatus === "rejected") params.set("status", "rejected");
    else if (filterStatus === "paid") params.set("is_paid", "true");
    else if (filterStatus === "not_paid") params.set("is_paid", "false");
    // "all" = tidak set param apapun

    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (categoryCode) params.set("categoryCode", String(categoryCode));

    const res = await fetch(`/api/order?${params.toString()}`, { signal });
    if (!res.ok) return;

    const data = await res.json();
    setOrders(data.orders);
    setStats(data.stats);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchOrders(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [search, filterStatus, sortBy, sortDir, categoryCode]);

  const [deleteModal, setDeleteModal] = useState({ open: false, orderCode: null, loading: false });
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "", type: "info" });
  const [rejectConfirm, setRejectConfirm] = useState({ open: false, orderId: null, loading: false });
  const [remindConfirm, setRemindConfirm] = useState({ open: false, orderCode: null, customerPhone: null, loading: false });
  const [confirmPayModal, setConfirmPayModal] = useState({ open: false, orderId: null, loading: false });

  function triggerDelete(orderCode) {
    setDeleteModal({ open: true, orderCode, loading: false });
  }

  async function confirmDelete() {
    if (!deleteModal.orderCode) return;
    setDeleteModal((m) => ({ ...m, loading: true }));
    try {
      const res = await fetch(`/api/order/${deleteModal.orderCode}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteModal({ open: false, orderCode: null, loading: false });
        await fetchOrders();
      }
    } catch {}
    finally {
      setDeleteModal({ open: false, orderCode: null, loading: false });
    }
  }

  async function handleReject(orderId) {
    setRejectConfirm({ open: true, orderId, loading: false });
  }

  async function confirmReject() {
    if (!rejectConfirm.orderId) return;
    setRejectConfirm((m) => ({ ...m, loading: true }));
    try {
      const res = await fetch(`/api/order/${rejectConfirm.orderId}/reject`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setRejectConfirm({ open: false, orderId: null, loading: false });
      if (!res.ok) {
        setAlertModal({ open: true, title: "Gagal", message: data.error || "Gagal menolak order", type: "error" });
        return;
      }
      await fetchOrders();
    } catch {
      setRejectConfirm({ open: false, orderId: null, loading: false });
      setAlertModal({ open: true, title: "Gagal", message: "Gagal menolak order", type: "error" });
    }
  }

  async function submitAccept(e) {
    e.preventDefault();
    setAcceptModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      const res = await fetch(`/api/order/${acceptModal.orderId}/accept`, {
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
      setAcceptModal({ open: false, orderId: null, price: "", estimated_hours: "", loading: false, error: "" });
      await fetchOrders();
    } catch {
      setAcceptModal((m) => ({ ...m, loading: false, error: "Terjadi kesalahan" }));
    }
  }

  async function handleFileUpload(orderId, orderCode, file, isReupload = false) {
    if (!file) return;
    setUploadState((s) => ({ ...s, [orderId]: { loading: true, error: "" } }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = isReupload ? `/api/order/${orderCode}/reupload` : `/api/order/${orderCode}/upload`;
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadState((s) => ({ ...s, [orderId]: { loading: false, error: data.error || "Gagal upload" } }));
        alert(data.error || "Gagal upload file");
        return;
      }
      setUploadState((s) => ({ ...s, [orderId]: { loading: false, error: "" } }));
      await fetchOrders();
    } catch {
      setUploadState((s) => ({ ...s, [orderId]: { loading: false, error: "Terjadi kesalahan" } }));
      alert("Gagal upload file");
    }
  }

  async function handleConfirmPayment(orderId) {
    setConfirmPayModal({ open: true, orderId, loading: false });
  }

  async function confirmPaymentAction() {
    if (!confirmPayModal.orderId) return;
    setConfirmPayModal((m) => ({ ...m, loading: true }));
    try {
      const res = await fetch(`/api/order/${confirmPayModal.orderId}/confirm-payment`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setConfirmPayModal({ open: false, orderId: null, loading: false });
      if (!res.ok) {
        setAlertModal({ open: true, title: "Gagal", message: data.error || "Gagal konfirmasi pembayaran", type: "error" });
        return;
      }
      await fetchOrders();
    } catch {
      setConfirmPayModal({ open: false, orderId: null, loading: false });
      setAlertModal({ open: true, title: "Gagal", message: "Gagal konfirmasi pembayaran", type: "error" });
    }
  }

  async function handleSendRemindPayment(orderCode, customerPhone) {
    setRemindConfirm({ open: false, orderCode: null, customerPhone: null, loading: true });
    try {
      const res = await fetch(`/api/order/${orderCode}/remind-payment`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.whatsappFallback) {
        const phone = data.customerPhone || customerPhone;
        setRemindConfirm({ open: false, orderCode: null, customerPhone: null, loading: false });
        if (phone) {
          const msg = encodeURIComponent(`Halo, jangan lupa selesaikan pembayaran untuk ordermu ya. Terima kasih!`);
          window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
        } else {
          setAlertModal({ open: true, title: "Info", message: "Customer belum aktifkan notifikasi dan nomor WA tidak tersedia.", type: "info" });
        }
        return;
      }
      if (!res.ok) {
        setRemindConfirm({ open: false, orderCode: null, customerPhone: null, loading: false });
        setAlertModal({ open: true, title: "Gagal", message: data.error || "Gagal mengirim pengingat", type: "error" });
        return;
      }
      setRemindConfirm({ open: false, orderCode: null, customerPhone: null, loading: false });
      setAlertModal({ open: true, title: "Berhasil", message: data.message || "Pengingat pembayaran berhasil dikirimkan.", type: "success" });
      await fetchOrders();
    } catch {
      setRemindConfirm({ open: false, orderCode: null, customerPhone: null, loading: false });
      setAlertModal({ open: true, title: "Gagal", message: "Gagal mengirim pengingat", type: "error" });
    }
  }

  async function submitExternalLinkUpload(e) {
    e.preventDefault();
    if (!uploadModal.linkInput || !/^https?:\/\//i.test(uploadModal.linkInput.trim())) {
      setUploadModal((m) => ({ ...m, error: "Link external harus diawali http:// atau https://" }));
      return;
    }
    setUploadModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      const endpoint = uploadModal.isReupload
        ? `/api/order/${uploadModal.orderCode}/reupload`
        : `/api/order/${uploadModal.orderCode}/upload`;
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
      setUploadModal({ open: false, orderCode: null, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" });
      await fetchOrders();
    } catch {
      setUploadModal((m) => ({ ...m, loading: false, error: "Terjadi kesalahan" }));
    }
  }

  async function handleMakeQris(order) {
    setQrisModal({
      open: true,
      loading: true,
      categoryCode: order.categoryCode,
      orderCode: order.orderCode,
      dataUrl: "",
      error: "",
    });
    try {
      const res = await fetch(`/api/order/${order.orderCode}/qris`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQrisModal((prev) => ({
          ...prev,
          loading: false,
          error: data.error || "Gagal membuat QRIS",
        }));
        return;
      }
      setQrisModal((prev) => ({
        ...prev,
        loading: false,
        dataUrl: data.dataUrl || "",
        error: "",
      }));
    } catch {
      setQrisModal((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal membuat QRIS",
      }));
    }
  }

  function handleMakeReceipt(order) {
    setReceiptModal({
      open: true,
      order,
    });
  }

  async function handleReceiptDownloadPng() {
    if (!receiptRef.current || !receiptModal.order) return;
    try {
      const canvas = await html2canvas(receiptRef.current);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Receipt_${receiptModal.order.orderCode || "ORDER"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setAlertModal({ open: true, title: "Gagal", message: "Gagal membuat gambar PNG struk.", type: "error" });
    }
  }

  async function handleReceiptDownloadPdf() {
    if (!receiptRef.current || !receiptModal.order) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
      });
      const imgData = canvas.toDataURL("image/png");
  
      const pdf = new jsPDF("p", "pt", [canvas.width, canvas.height]);
  
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Receipt_${receiptModal.order.orderCode || "ORDER"}.pdf`);
    } catch (err) {
      console.error(err);
      setAlertModal({ open: true, title: "Gagal", message: "Gagal membuat struk PDF.", type: "error" });
    }
  }

  // async function handleReceiptDownloadPdf() {
    // if (!receiptRef.current || !receiptModal.order) return;
    // try {
      // const canvas = await html2canvas(receiptRef.current, {
        // scale: 3,
      // });
      // const imgData = canvas.toDataURL("image/png");
  
      // const canvasWidth = canvas.width;
      // const canvasHeight = canvas.height;
  
      // const pdf = new jsPDF("p", "pt", [canvasWidth, canvasHeight]);
  
      // pdf.addImage(imgData, "PNG", 0, 0, canvasWidth, canvasHeight);
      // pdf.save(`Receipt_${receiptModal.order.orderCode || "ORDER"}.pdf`);
    // } catch (err) {
      // console.error(err);
      // alert("Gagal membuat PDF struk");
    // }
  // }

  function closeQrisModal() {
    setQrisModal({
      open: false,
      loading: false,
      categoryCode: null,
      orderCode: null,
      dataUrl: "",
      error: "",
    });
  }

  function closeReceiptModal() {
    setReceiptModal({
      open: false,
      order: null,
    });
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-[11px] text-gray-400">Pendapatan</p>
          <p className="text-base font-bold text-gray-900 dark:text-gray-50">Rp {stats.totalIncome.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-[11px] text-gray-400">Lunas</p>
          <p className="text-base font-bold text-emerald-600">Rp {stats.totalPaid.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-[11px] text-gray-400">Belum Lunas</p>
          <p className="text-base font-bold text-red-500">Rp {stats.totalUnpaid.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-[11px] text-gray-400">Total Order</p>
          <p className="text-base font-bold text-primary-600">{stats.totalOrders}</p>
        </div>
      </div>

      {/* Search + Sort + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Cari nama client atau tugas..."
          className="input flex-1 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <select
            className="input text-sm w-auto"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(":");
              setSortBy(by);
              setSortDir(dir);
            }}
          >
            <option value="assigned_date:desc">Terbaru</option>
            <option value="assigned_date:asc">Terlama</option>
            <option value="deadline_date:asc">Deadline Terdekat</option>
            <option value="price:desc">Harga Tertinggi</option>
            <option value="price:asc">Harga Terendah</option>
          </select>
          <Link
            href={categoryCode ? `/order/new?category=${encodeURIComponent(categoryCode)}` : "/order/new"}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow hover:bg-primary-700"
            aria-label="Tambah order"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Semua" },
          { value: "pending", label: "Menunggu" },
          { value: "accepted", label: "Diterima" },
          { value: "done", label: "Selesai" },
          { value: "rejected", label: "Ditolak" },
          { value: "paid", label: "Lunas" },
          { value: "not_paid", label: "Belum Lunas" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilterStatus(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              filterStatus === opt.value
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-primary-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {!hasData ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Belum ada order.
          </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Nama Client
                  </th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Tugas
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Kategori
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                    Tgl Masuk
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                    Deadline
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Harga
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.client_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {order.task_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {order.category_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(order.assigned_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(order.deadline_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Rp {Number(order.price || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        {order.status && order.status !== "manual" && (
                          <StatusBadge type="order-status" status={order.status} />
                        )}
                        <StatusBadge type="done" status={order.is_done} />
                        <StatusBadge type="paid" status={order.is_paid} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Link
                          href={`/order/${order.orderCode}`}
                          className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold px-2.5 py-1 transition-colors"
                        >
                          Detail
                        </Link>
                        <button
                          type="button"
                          onClick={() => triggerDelete(order.orderCode)}
                          className="rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-[11px] font-semibold px-2.5 py-1 transition-colors"
                          title="Hapus"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QRIS Modal */}
      {qrisModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
            style={{
              minHeight: "100dvh",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={closeQrisModal}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <QRISLogo className="h-30 w-30 mt-2" />
                <button
                  type="button"
                  onClick={closeQrisModal}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Tutup
                </button>
              </div>
  
              <div className="mt-3">
                {qrisModal.loading && (
                  <p className="text-sm text-gray-600">Loading...</p>
                )}
  
                {!qrisModal.loading && qrisModal.error && (
                  <p className="text-sm text-red-600">{qrisModal.error}</p>
                )}
  
                {!qrisModal.loading &&
                  !qrisModal.error &&
                  qrisModal.dataUrl && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <Image
                          src={qrisModal.dataUrl}
                          alt="QRIS"
                          className="mx-auto h-56 w-56 object-contain rounded-xl"
                        />
                      </div>
                      <div className="flex justify-center">
                        <a
                          href={qrisModal.dataUrl}
                          download={`QRIS_${qrisModal.orderCode || "ORDER"}.png`}
                          className="btn btn-primary w-full text-center"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      
      {/* Struk Modal */}
      {receiptModal.open && receiptModal.order && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
            style={{
              minHeight: "100dvh",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={closeReceiptModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-primary-600">
                    STRUK PEMBAYARAN
                  </p>
                  <h3 className="text-lg font-bold text-gray-900">Jokiwi</h3>
                </div>
                <button
                  type="button"
                  onClick={closeReceiptModal}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Tutup
                </button>
              </div>
        
              {/* Isi struk yang akan dirender jadi PNG/PDF */}
              <div className="rounded-xl border border-gray-200 bg-gray-50" data-receipt-root>
                <ReceiptCard
                  order={receiptModal.order}
                  ref={receiptRef}
                  variant="plain"
                />
              </div>
        
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleReceiptDownloadPdf}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleReceiptDownloadPng}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>  
      )}
      {/* Accept Order Modal */}
      {acceptModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !acceptModal.loading && setAcceptModal((m) => ({ ...m, open: false }))}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
                Terima Pesanan
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Tentukan harga dan estimasi sebelum menerima.
              </p>

              {acceptModal.error && (
                <p className="text-sm text-red-600 mb-3">{acceptModal.error}</p>
              )}

              <form onSubmit={submitAccept} className="space-y-3">
                <div>
                  <label className="label">Harga (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    className="input"
                    placeholder="150000"
                    value={acceptModal.price}
                    onChange={(e) => setAcceptModal((m) => ({ ...m, price: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Estimasi Waktu (jam, opsional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="input"
                    placeholder="24"
                    value={acceptModal.estimated_hours}
                    onChange={(e) => setAcceptModal((m) => ({ ...m, estimated_hours: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={acceptModal.loading}
                    className="btn btn-primary flex-1"
                  >
                    {acceptModal.loading ? "Menyimpan…" : "Terima Order"}
                  </button>
                  <button
                    type="button"
                    disabled={acceptModal.loading}
                    onClick={() => setAcceptModal({ open: false, orderId: null, price: "", estimated_hours: "", loading: false, error: "" })}
                    className="btn btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Upload Hasil Pekerjaan Modal */}
      {uploadModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !uploadModal.loading && setUploadModal((m) => ({ ...m, open: false }))}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                  {uploadModal.isReupload ? "Upload Ulang Hasil" : "Kirim Hasil Pengerjaan"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Order: <span className="font-mono font-semibold">{uploadModal.orderCode}</span>
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUploadModal((m) => ({ ...m, tab: "file", error: "" }))}
                  className={`flex-1 py-1.5 rounded-lg text-center transition ${
                    uploadModal.tab === "file"
                      ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Upload File (Max 50MB)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadModal((m) => ({ ...m, tab: "link", error: "" }))}
                  className={`flex-1 py-1.5 rounded-lg text-center transition ${
                    uploadModal.tab === "link"
                      ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Link External (&gt;50MB)
                </button>
              </div>

              {uploadModal.error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                  {uploadModal.error}
                </div>
              )}

              {uploadModal.tab === "file" ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Pilih file hasil pekerjaan dari perangkat kamu (Maksimal 50 MB di Supabase Storage).
                  </p>
                  <input
                    type="file"
                    disabled={uploadModal.loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadModal((m) => ({ ...m, open: false }));
                        handleFileUpload(uploadModal.orderCode, uploadModal.orderCode, f, uploadModal.isReupload);
                      }
                      e.target.value = "";
                    }}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/40 dark:file:text-primary-300"
                  />
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setUploadModal({ open: false, orderCode: null, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" })}
                      className="btn btn-secondary text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitExternalLinkUpload} className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Jika file hasil pekerjaan <strong>lebih besar dari 50 MB</strong> (misal file ZIP, project video, dll), upload ke <strong>Google Drive / Mega / Dropbox</strong> lalu tempel link nya di bawah ini:
                  </p>
                  <div>
                    <label className="label">Link External (URL) *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/file/d/..."
                      value={uploadModal.linkInput}
                      onChange={(e) => setUploadModal((m) => ({ ...m, linkInput: e.target.value }))}
                      className="input text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={uploadModal.loading}
                      className="btn btn-primary flex-1 text-xs"
                    >
                      {uploadModal.loading ? "Menyimpan…" : "Simpan Link & Kirim Notif"}
                    </button>
                    <button
                      type="button"
                      disabled={uploadModal.loading}
                      onClick={() => setUploadModal({ open: false, orderCode: null, isReupload: false, tab: "file", linkInput: "", loading: false, error: "" })}
                      className="btn btn-secondary text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !deleteModal.loading && setDeleteModal({ open: false, orderCode: null, loading: false })}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Hapus Order?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Yakin ingin menghapus order <strong className="font-mono">{deleteModal.orderCode}</strong> secara permanen?
              </p>
              <div className="flex gap-2 pt-2">
                <button type="button" disabled={deleteModal.loading} onClick={confirmDelete}
                  className="btn btn-primary flex-1 text-xs bg-red-600 hover:bg-red-700 border-red-600">
                  {deleteModal.loading ? "Menghapus…" : "Ya, Hapus"}
                </button>
                <button type="button" disabled={deleteModal.loading}
                  onClick={() => setDeleteModal({ open: false, orderCode: null, loading: false })}
                  className="btn btn-secondary text-xs">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Reject Confirmation Modal */}
      {rejectConfirm.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !rejectConfirm.loading && setRejectConfirm({ open: false, orderId: null, loading: false })}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Tolak Order?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Yakin ingin menolak order ini? Customer akan mendapat notifikasi penolakan.</p>
              <div className="flex gap-2 pt-2">
                <button type="button" disabled={rejectConfirm.loading} onClick={confirmReject}
                  className="btn btn-primary flex-1 text-xs bg-red-600 hover:bg-red-700 border-red-600">
                  {rejectConfirm.loading ? "Memproses…" : "Ya, Tolak"}
                </button>
                <button type="button" disabled={rejectConfirm.loading}
                  onClick={() => setRejectConfirm({ open: false, orderId: null, loading: false })}
                  className="btn btn-secondary text-xs">Batal</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirm Payment Modal */}
      {confirmPayModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !confirmPayModal.loading && setConfirmPayModal({ open: false, orderId: null, loading: false })}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Konfirmasi Pembayaran?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Tandai order ini sebagai lunas? Customer akan mendapat notifikasi untuk mengunduh hasil.</p>
              <div className="flex gap-2 pt-2">
                <button type="button" disabled={confirmPayModal.loading} onClick={confirmPaymentAction}
                  className="btn btn-primary flex-1 text-xs">
                  {confirmPayModal.loading ? "Memproses…" : "Ya, Konfirmasi"}
                </button>
                <button type="button" disabled={confirmPayModal.loading}
                  onClick={() => setConfirmPayModal({ open: false, orderId: null, loading: false })}
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
            onClick={() => setAlertModal((a) => ({ ...a, open: false }))}>
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-3"
              onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-base font-bold ${alertModal.type === "error" ? "text-red-600" : alertModal.type === "success" ? "text-emerald-600" : "text-primary-600"}`}>
                {alertModal.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">{alertModal.message}</p>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setAlertModal((a) => ({ ...a, open: false }))}
                  className="btn btn-primary text-xs">OK</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
