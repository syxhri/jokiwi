import { requireAuth } from "../../lib/auth.js";
import { getAllOrdersForUser, computeStats } from "../../lib/db.js";
import OrderTable from "../../components/OrderTable";

export const metadata = {
  title: "Jokiwi - Orderan",
  description: "List semua orderan joki",
};

export default async function OrdersPage() {
  const user = await requireAuth();
  const orders = await getAllOrdersForUser(user.id);
  const stats = computeStats(orders);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Semua Orderan</h1>
        <p className="text-gray-600">Kelola dan filter semua orderan kamu</p>
      </div>
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}
