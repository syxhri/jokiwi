// components/CategoryTable.js
'use client';

import Link from 'next/link';

export default function CategoryTable({ categoriesWithStats }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
              Nama Kategori
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
              Catatan
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
              Total Orders
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
              Pendapatan
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
              Sudah Dibayar
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
              Belum Dibayar
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {categoriesWithStats.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-6 text-center text-sm text-gray-500"
              >
                Belum ada kategori. Tambahkan kategori terlebih dahulu.
              </td>
            </tr>
          )}

          {categoriesWithStats.map((cat) => (
            <tr key={cat.id}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <Link
                  href={`/categories/${cat.id}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  {cat.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {cat.notes || '-'}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                {cat.stats.totalOrders}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                Rp {cat.stats.totalIncome.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                Rp {cat.stats.totalPaid.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                Rp {cat.stats.totalUnpaid.toLocaleString('id-ID')}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  href={`/categories/${cat.id}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  Kelola
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
