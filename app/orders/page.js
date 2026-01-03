// app/orders/page.js

import { requireAuth } from '../../lib/auth.js';
import { getAllOrdersForUser, computeStats } from '../../lib/db.js';
import OrderTable from '../../components/OrderTable';

/**
 * Orders listing page. Displays all orders belonging to the
 * authenticated user along with summary statistics. Users can
 * search, filter, sort and manage their orders via the OrderTable
 * component. Authentication is required; unauthenticated visitors
 * will be redirected to the login page by `requireAuth()`.
 */
export default async function OrdersPage() {
  const user = await requireAuth();
  const orders = await getAllOrdersForUser(user.id);
  const stats = computeStats(orders);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Semua Order</h1>
        <p className="text-gray-600">Kelola dan filter semua order yang Anda miliki</p>
      </div>
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}