// app/page.js

import { getAllOrders, computeStats } from '../lib/db.js';
import OrderTable from '../components/OrderTable';

export default async function Home() {
  // Fetch all orders and limit to 10 for the dashboard
  const orders = (await getAllOrders())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
  const stats = computeStats(orders);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Kelola semua order joki tugas Anda di satu tempat</p>
      </div>
      <OrderTable initialOrders={orders} initialStats={stats} />
    </div>
  );
}