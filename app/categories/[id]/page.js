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
          {category.notes && (
            <p className="mt-2 text-sm text-gray-600">
              Catatan: {category.notes}
            </p>
          )}
        </div>
      </div>

      {/* OrderTable yang sudah ada summary di atas tabel */}
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}
