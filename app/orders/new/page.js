// app/orders/new/page.js

import OrderForm from '../../../components/OrderForm';

export default function NewOrderPage() {
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