"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import StatusBadge from "./StatusBadge";
import QRISLogo from "./QRISLogo";
import { computeStats } from "../lib/db.js";

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

  const [qrisModal, setQrisModal] = useState({
    open: false,
    loading: false,
    categoryCode: null,
    orderCode: null,
    dataUrl: "",
    error: "",
  });

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
    const controller = new AbortController();
    async function fetchData() {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus === "done") {
        params.set("is_done", "true");
      } else if (filterStatus === "not_done") {
        params.set("is_done", "false");
      } else if (filterStatus === "paid") {
        params.set("is_paid", "true");
      } else if (filterStatus === "not_paid") {
        params.set("is_paid", "false");
      }
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (categoryCode) params.set("categoryCode", String(categoryCode));

      try {
        const res = await fetch(`/api/orders?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setStats(data.stats);
        }
      } catch {}
    }

    fetchData().catch(() => {});
    return () => controller.abort();
  }, [search, filterStatus, sortBy, sortDir, categoryCode]);

  async function handleDelete(id) {
    const ok = window.confirm("Yakin mau menghapus orderan ini?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus orderan");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.orderCode !== id));
      setStats(computeStats(orders));
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
      const res = await fetch(`/api/orders/${order.orderCode}/qris`);
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

      <div className="flex justify-end">
        <Link href="/orders/new" className="btn btn-primary">
          Tambah Orderan
        </Link>
      </div>

      {/* Filter + Sort panel */}
      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Pencarian</label>
            <input
              type="text"
              placeholder="Cari nama client atau tugas"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
            <label className="label">Urutkan Berdasarkan</label>
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
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Arah Sort</label>
            <select
              className="input"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
            >
              <option value="asc">Asc (terlama / terkecil dulu)</option>
              <option value="desc">Desc (terbaru / terbesar dulu)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {!hasData ? (
        <>
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Belum ada orderan.
          </p>
        </>
      ) : (
      <>
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
                          href={`/orders/${order.orderCode}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleMakeQris(order)}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          Buat <QRISLogo className="h-8 w-8" />
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
      </>
      )}

      {/* QRIS Modal */}
      {qrisModal.open && (
        <div
          className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center shadow-3xl px-4"
          onClick={closeQrisModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              {/* <h3 className="text-sm font-semibold text-gray-900">QRIS</h3> */}
              <QRISLogo className="h-15 w-15" />
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

              {!qrisModal.loading && !qrisModal.error && qrisModal.dataUrl && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="relative inline-block">
                      <Image
                        src={qrisModal.dataUrl}
                        alt="QRIS"
                        className="mx-auto h-56 w-56 object-contain"
                      />
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <QRISLogo className="h-40 w-40 object-contain" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <a
                      href={qrisModal.dataUrl}
                      download={`qris-${qrisModal.categoryCode || "order"}-${qrisModal.orderCode}.png`}
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
      )}
    </div>
  );
}
