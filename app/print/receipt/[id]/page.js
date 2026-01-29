export const runtime = "nodejs";

import { findOrder } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import ReceiptCard from "@/components/ReceiptCard";

async function getData(params, searchParams) {
  const user = await requireAuth({ token: searchParams?.token || null });
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
    description: `Rp ${order.price} | ${
      order.is_done ? "Selesai" : "Belum Selesai"
    }`,
  };
}

export default async function ReceiptPrintPage({ params, searchParams }) {
  const { order } = await getData(params, searchParams);

  return (
    <div className="min-h-screen flex justify-center">
      <div
        className="w-full max-w-md px-2 py-2"
        data-receipt-root
      >
        {order ? (
          <ReceiptCard
            order={order}
            variant="plain"
            className="bg-white"
          />
        ) : (
          <p>Orderan tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
}