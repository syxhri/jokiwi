import { requireAuth } from "@/lib/auth.js";
import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "Jokiwi - Buat Orderan",
  description: "Tambah orderan joki",
};

export default async function NewOrderPage({ params }) {
  await requireAuth();
  const { category } = params;
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Buat Orderan Baru</h1>
        <p className="text-gray-600">Isi detail orderan joki tugas</p>
      </div>
      <OrderForm data={{ category, order: null }} />
    </div>
  );
}
