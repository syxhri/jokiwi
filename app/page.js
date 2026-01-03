// app/page.js

import {
  getAllCategories,
  getAllOrders,
  computeStats,
} from '../lib/db.js';
import CategoryTable from '../components/CategoryTable';

export default async function Home() {
  const [categories, orders] = await Promise.all([
    getAllCategories(),
    getAllOrders(),
  ]);

  const globalStats = computeStats(orders);

  const categoriesWithStats = categories.map((cat) => {
    const ordersForCat = orders.filter(
      (o) => o.categoryId === cat.id,
    );
    return {
      ...cat,
      stats: computeStats(ordersForCat),
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Kategori Joki Tugas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Kelola kategori dan lihat ringkasan pendapatan per kategori.
          </p>
        </div>
      </div>

      {/* Global summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Total Pendapatan (Semua Kategori)
          </h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            Rp {globalStats.totalIncome.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Sudah Dibayar
          </h3>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            Rp {globalStats.totalPaid.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Belum Dibayar
          </h3>
          <p className="mt-2 text-2xl font-bold text-red-600">
            Rp {globalStats.totalUnpaid.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href="/categories/new"
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Tambah Kategori
        </a>
      </div>

      <CategoryTable categoriesWithStats={categoriesWithStats} />
    </div>
  );
}
