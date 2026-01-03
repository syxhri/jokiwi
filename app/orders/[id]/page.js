// app/orders/[id]/page.js

import { notFound } from 'next/navigation';
import { requireAuth } from '../../../lib/auth.js';
import { findOrder } from '../../../lib/db.js';
import OrderForm from '../../../components/OrderForm';

/**
 * Edit order page. Loads the specified order for the authenticated user
 * and renders a form for editing it. If the order does not exist or
 * belongs to another user, the page results in a 404. The user is
 * authenticated via requireAuth() prior to data retrieval.
 */
export default async function EditOrderPage({ params }) {
  const user = await requireAuth();
  const id = Number(params.id);
  const order = await findOrder(user.id, id);
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