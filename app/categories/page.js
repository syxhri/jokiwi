import { requireAuth } from "../../lib/auth.js";
import {
  getAllCategoriesForUser,
  getAllOrdersForUser,
  computeStats,
} from "../../lib/db.js";
import CategoryTable from "../../components/CategoryTable";
import Link from "next/link.js";

export const metadata = {
  title: "Jokiwi - List Kategori",
  description: "List semua kategori jokian",
};

export default async function CategoriesPage() {
  const user = await requireAuth();
  const [categories, orders] = await Promise.all([
    getAllCategoriesForUser(user.id),
    getAllOrdersForUser(user.id),
  ]);
  const globalStats = computeStats(orders);
  const categoriesWithStats = categories.map((cat) => {
    const ordersForCat = orders.filter((o) => o.categoryId === cat.id);
    return {
      ...cat,
      stats: computeStats(ordersForCat),
    };
  });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">List Joki Tugas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola kategori dan lihat ringkasan pendapatan per kategori.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Total Pendapatan
          </h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            Rp {globalStats.totalIncome.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Sudah Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            Rp {globalStats.totalPaid.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Belum Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-red-600">
            Rp {globalStats.totalUnpaid.toLocaleString("id-ID")}
          </p>
        </div>
        <Link
          href="/orders"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Orderan</h3>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {globalStats.totalOrders} Orderan
            </p>
          </div>
        </Link>
        {/*<div>
          <h3 className="text-sm font-medium text-gray-500">Total Orderan</h3>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {globalStats.totalOrders} Orderan
          </p>
        </div>*/}
      </div>
      <CategoryTable categoriesWithStats={categoriesWithStats} />
    </div>
  );
}
