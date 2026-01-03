// app/api/orders/[id]/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  findOrder,
  updateOrder,
  deleteOrder,
} from '../../../../lib/db.js';

/**
 * Helper to parse the current userId from cookies and the order ID from
 * params. Returns { userId, id } where either may be null if invalid.
 */
function parseIds(params) {
  const id = Number(params.id);
  const uid = cookies().get('userId')?.value;
  const userId = uid ? Number(uid) : null;
  return { id: Number.isNaN(id) ? null : id, userId };
}

/**
 * GET /api/orders/[id]
 *
 * Returns a single order for the authenticated user. If the user
 * isn't logged in or the order doesn't exist / belong to them, an
 * appropriate error response is returned.
 */
export async function GET(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const order = await findOrder(userId, id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error('Failed to fetch order:', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

/**
 * PUT /api/orders/[id]
 *
 * Updates an existing order. Payload fields match those accepted by
 * the POST endpoint. If the order doesn't exist or belongs to another
 * user, a 404 is returned.
 */
export async function PUT(request, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const body = await request.json();
    const updated = await updateOrder(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Failed to update order:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/[id]
 *
 * Deletes an order belonging to the authenticated user. If the order
 * doesn't exist, the response is idempotent.
 */
export async function DELETE(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const ok = await deleteOrder(userId, id);
    return NextResponse.json({ deleted: ok });
  } catch (err) {
    console.error('Failed to delete order:', err);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}