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
    let list = items;
  
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.notes || "").toLowerCase().includes(q)
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
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
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
      setItems(items.filter((c) => c.categoryCode !== id));
    } catch (err) {
      alert("Gagal menghapus kategori");
    }
  }

  return (
    <>
      {visibleItems.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          Belum ada kategori.
        </p>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
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
      
            <div className="flex justify-start md:justify-end">
              <Link href="/categories/new" className="btn btn-primary">
                Tambah Kategori
              </Link>
            </div>
          </div>
      
          {showFilters && (
            <div className="mb-4 grid gap-4 md:grid-cols-3">
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
      
        <div className="overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-gray-200">
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
                    {cat.stats.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    Rp {cat.stats.totalIncome.toLocaleString("id-ID")}
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
      )}
    </>
  );
}
