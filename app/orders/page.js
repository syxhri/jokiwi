// app/orders/page.js

import { getAllOrders, computeStats } from '../../lib/db.js';
import OrderTable from '../../components/OrderTable';

export default async function OrdersPage() {
  // Fetch all orders for initial render
  const orders = (await getAllOrders()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const stats = computeStats(orders);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Semua Order</h1>
        <p className="text-gray-600">Kelola dan filter semua order yang ada</p>
      </div>
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}