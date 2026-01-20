import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth.js";
import { findOrder } from "@/lib/db.js";
import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "Jokiwi - Edit Orderan",
  description: "Ubah detail orderan",
};

export default async function EditOrderPage({ params }) {
  const user = await requireAuth();
  const id = params.id;
  const order = await findOrder(user.id, id);
  if (!order) {
    notFound();
  }
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Orderan</h1>
        <p className="text-gray-600">
          Edit detail orderan untuk {order.client_name}
        </p>
      </div>
      <OrderForm data={{ order, category: null }} />
    </div>
  );
}
