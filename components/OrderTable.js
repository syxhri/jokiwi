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

    if (filterStatus === "done") params.set("is_done", "true");
    else if (filterStatus === "not_done") params.set("is_done", "false");
    else if (filterStatus === "paid") params.set("is_paid", "true");
    else if (filterStatus === "not_paid") params.set("is_paid", "false");

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

  async function handleDelete(id) {
    const ok = window.confirm("Yakin mau menghapus orderan ini?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/order/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus orderan");
        return;
      }
      
      await fetchOrders();
    } catch {
      alert("Gagal menghapus orderan");
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
      alert("Gagal membuat gambar PNG struk");
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
      alert("Gagal membuat struk PDF");
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
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Total Pendapatan
          </h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Sudah Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            Rp {stats.totalPaid.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Belum Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-red-600">
            Rp {stats.totalUnpaid.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Orderan</h3>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {stats.totalOrders} Orderan
          </p>
        </div>
      </div>

      {/* Search + toggle filter */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full flex items-end gap-2">
            <div className="flex-1">
              <label className="label">Pencarian</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama client atau tugas"
                  className="input pr-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  aria-label="Buka filter dan sort"
                >
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M3 5h14M6 10h8M8 15h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
        
            <Link
              href={categoryCode ? `/order/new?category=${encodeURIComponent(categoryCode)}` : "/order/new"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow hover:bg-primary-700"
              aria-label="Tambah orderan"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M10 4v12M4 10h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      
        {showFilters && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Filter Status</label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="done">Selesai</option>
                <option value="not_done">Belum Selesai</option>
                <option value="paid">Lunas</option>
                <option value="not_paid">Belum Lunas</option>
              </select>
            </div>
            <div>
              <label className="label">Urut Berdasarkan</label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="assigned_date">Tanggal Disuruh</option>
                <option value="deadline_date">Deadline</option>
                <option value="price">Harga</option>
              </select>
            </div>
            <div>
              <label className="label">Arah Sort</label>
              <select
                className="input"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Naik (terlama / terkecil dulu)</option>
                <option value="desc">Turun (terbaru / terbesar dulu)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {!hasData ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Belum ada orderan.
          </p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
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
                    Tgl Disuruh
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 min-w-[220px]">
                    Catatan
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.client_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {order.task_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {order.category_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(order.assigned_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(order.deadline_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-left">
                      Rp {Number(order.price || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        <StatusBadge type="done" status={order.is_done} />
                        <StatusBadge type="paid" status={order.is_paid} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <p className="whitespace-pre-line break-words">
                        {order.notes || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-left">
                      <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                        <Link
                          href={`/order/${order.orderCode}/edit`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Link>
                        
                        {order.is_paid && (
                          <button
                            type="button"
                            onClick={() => handleMakeReceipt(order)}
                            className="text-amber-600 hover:text-amber-800"
                          >
                            Buat Struk
                          </button>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handleMakeQris(order)}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          QRIS
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleDelete(order.orderCode)}
                          className="text-red-600 hover:text-red-800"
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
              <ReceiptCard
                order={receiptModal.order}
                ref={receiptRef}
                className="mt-4"
                data-receipt-root
              />
        
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
    </div>
  );
}
