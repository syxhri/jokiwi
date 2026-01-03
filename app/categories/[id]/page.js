// app/categories/[id]/page.js

import { notFound } from 'next/navigation';
import {
  findCategory,
  getAllOrders,
  computeStats,
} from '../../../lib/db.js';
import OrderTable from '../../../components/OrderTable';

export default async function CategoryDetailPage({ params }) {
  const id = Number(params.id);
  const category = await findCategory(id);
  if (!category) {
    notFound();
  }

  const allOrders = await getAllOrders();
  const orders = allOrders.filter((o) => o.categoryId === id);
  const stats = computeStats(orders);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {category.description || 'Kategori joki tugas'}
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Ringkasan Kategori
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <dt className="text-sm text-gray-500">Total Pendapatan</dt>
            <dd className="text-xl font-semibold text-gray-900">
              Rp {stats.totalIncome.toLocaleString('id-ID')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Sudah Dibayar</dt>
            <dd className="text-xl font-semibold text-emerald-600">
              Rp {stats.totalPaid.toLocaleString('id-ID')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Belum Dibayar</dt>
            <dd className="text-xl font-semibold text-red-600">
              Rp {stats.totalUnpaid.toLocaleString('id-ID')}
            </dd>
          </div>
        </dl>

        {category.notes && (
          <p className="mt-4 text-sm text-gray-600">Catatan: {category.notes}</p>
        )}
      </section>

      {/* Pakai OrderTable dengan data kategori ini */}
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}
