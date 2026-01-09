import { requireAuth } from "../../../lib/auth.js";
import OrderForm from "../../../components/OrderForm";

export const metadata = {
  title: "Jokiwi - Tambah Orderan",
  description: "Tambah orderan joki baru",
};

export default async function NewOrderPage() {
  await requireAuth();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Buat Order Baru</h1>
        <p className="text-gray-600">Isi detail order joki tugas baru</p>
      </div>
      <OrderForm />
    </div>
  );
}
