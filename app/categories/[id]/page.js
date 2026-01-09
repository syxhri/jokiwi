import { notFound } from "next/navigation";
import { requireAuth } from "../../../lib/auth.js";
import {
  findCategory,
  getAllOrdersForUser,
  computeStats,
} from "../../../lib/db.js";
import OrderTable from "../../../components/OrderTable";

export const metadata = {
  title: "Jokiwi - Kategori",
  description: "Daftar kategori jokian",
};

export default async function CategoryDetailPage({ params }) {
  const user = await requireAuth();
  const id = Number(params.id);
  const category = await findCategory(user.id, id);
  if (!category) {
    notFound();
  }
  const allOrders = await getAllOrdersForUser(user.id);
  const orders = allOrders.filter((o) => o.categoryId === id);
  const stats = computeStats(orders);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {category.description || "Kategori joki tugas"}
        </p>
        {category.notes && (
          <p className="mt-2 text-sm text-gray-600">
            Catatan: {category.notes}
          </p>
        )}
      </div>
      <OrderTable initialOrders={orders} initialStats={stats} categoryId={id} />
    </div>
  );
}
