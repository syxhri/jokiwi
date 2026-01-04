// app/orders/new/page.js

import { requireAuth } from '../../../lib/auth.js';
import OrderForm from '../../../components/OrderForm';

/**
 * New order page. Presents a blank order form for the authenticated user to
 * create a new task. Authentication is enforced at the server layer
 * before rendering the form. The OrderForm component handles the
 * client-side submission and navigation.
 */
export const metadata = {
  title: 'Jokiwi - Tambah Orderan',
  description: 'Tambah orderan joki baru',
};

export default async function NewOrderPage() {
  // Ensure the user is logged in; otherwise they will be redirected
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
