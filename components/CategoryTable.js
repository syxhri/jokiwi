"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function CategoryTable({ categoriesWithStats }) {
  const [items, setItems] = useState(categoriesWithStats);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);

  const visibleItems = useMemo(() => {
    let list = items || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.notes]
          .map((v) => (v || "").toString().toLowerCase())
          .some((v) => v.includes(q))
      );
    }

    if (filterStatus === "has_orders") {
      list = list.filter((c) => (c.stats?.totalOrders || 0) > 0);
    } else if (filterStatus === "no_orders") {
      list = list.filter((c) => (c.stats?.totalOrders || 0) === 0);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      let va;
      let vb;

      if (sortBy === "name") {
        va = (a.name || "").toLowerCase();
        vb = (b.name || "").toLowerCase();
      } else if (sortBy === "orders") {
        va = a.stats?.totalOrders || 0;
        vb = b.stats?.totalOrders || 0;
      } else {
        va = a.stats?.totalIncome || 0;
        vb = b.stats?.totalIncome || 0;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return sorted;
  }, [items, search, filterStatus, sortBy, sortDir]);

  async function handleDelete(id) {
    const ok = window.confirm(
      "Yakin mau menghapus kategori ini? Pastikan tidak ada orderan dengan kategori ini."
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus kategori");
        return;
      }
      setItems((prev) => prev.filter((c) => c.categoryCode !== id));
    } catch (err) {
      alert("Gagal menghapus kategori");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + toggle filter */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full flex items-end gap-2">
            <div className="flex-1">
              <label className="label">Pencarian</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama kategori atau catatan"
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
              href="/categories/new"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow hover:bg-primary-700"
              aria-label="Tambah kategori"
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
              <label className="label">Filter</label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="has_orders">Punya orderan</option>
                <option value="no_orders">Belum ada orderan</option>
              </select>
            </div>
            <div>
              <label className="label">Urutkan Berdasarkan</label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Nama</option>
                <option value="orders">Total Orderan</option>
                <option value="income">Pendapatan</option>
              </select>
            </div>
            <div>
              <label className="label">Arah Sort</label>
              <select
                className="input"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Naik (A-Z / kecil-besar)</option>
                <option value="desc">Turun (Z-A / besar-kecil)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {visibleItems.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          Belum ada kategori.
        </p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Nama Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Catatan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Total Orderan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Pendapatan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleItems.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/categories/${cat.categoryCode}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {cat.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cat.notes || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {cat.stats?.totalOrders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rp{" "}
                      {(cat.stats?.totalIncome || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex gap-3">
                        <Link
                          href={`/categories/${cat.categoryCode}/edit`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.categoryCode)}
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
    </div>
  );
}