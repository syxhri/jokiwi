"use client";

import Link from "next/link";
import { useState } from "react";

export default function CategoryTable({ categoriesWithStats }) {
  const [items, setItems] = useState(categoriesWithStats);

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
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
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
          {items.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-6 text-center text-sm text-gray-500"
              >
                Belum ada kategori. Tambahkan kategori terlebih dahulu.
              </td>
            </tr>
          )}
          {items.map((cat) => (
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
  );
}
