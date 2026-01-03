// app/orders/[id]/page.js

import { findOrder } from '../../../lib/db.js';
import { notFound } from 'next/navigation';
import OrderForm from '../../../components/OrderForm';

export default async function EditOrderPage({ params }) {
  const id = parseInt(params.id, 10);
  const order = await findOrder(id);
  if (!order) {
    notFound();
  }
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Order</h1>
        <p className="text-gray-600">Edit detail order untuk {order.client_name}</p>
      </div>
      <OrderForm order={order} />
    </div>
  );
}