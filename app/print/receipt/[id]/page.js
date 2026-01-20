export const runtime = "nodejs";

import { findOrder } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ReceiptCard } from "@/components/ReceiptCard";


async function getData(params) {
  const user = await requireAuth();
  const id = params.id;
  const order = await findOrder(user.id, id);
  return { user, id, order };
}

export async function generateMetadata({ params }) {
  const { user, id, order } = await getData(params);
  if (!order) {
    return {
      title: "Orderan tidak ditemukan",
    };
  }

  return {
    title: `${order.category_name} - ${order.task_name}`,
    description: `Rp ${order.price} | ${order.is_done ? "Selesai" : "Belum Selesai"}`,
  };
}

export default async function ReceiptPrintPage({ params, searchParams }) {
  const { user, id, order } = await getData(params);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Orderan tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <ReceiptCard order={order} />
    </div>
  );
}