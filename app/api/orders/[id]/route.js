// app/api/orders/[id]/route.js

import { findOrder, updateOrder, deleteOrder } from '../../../../lib/db.js';
import { NextResponse } from 'next/server';

/**
 * GET /api/orders/[id]
 *
 * Returns a single order by its ID. If the order does not exist,
 * responds with a 404 status.
 */
export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const order = await findOrder(id);
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
 * Updates an existing order. Expects the same payload as the POST
 * endpoint. Returns the updated order or a 404 if the order
 * does not exist.
 */
export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const data = await request.json();
    const {
      client_name,
      task_name,
      subject_or_category = null,
      price,
      note = null,
      is_done = false,
      is_paid = false,
    } = data;
    if (!client_name || !task_name || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const updated = await updateOrder(id, {
      client_name,
      task_name,
      subject_or_category,
      price,
      note,
      is_done,
      is_paid,
    });
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
 * Deletes an order by its ID. If the order does not exist the
 * response is still considered successful (idempotent delete).
 */
export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    await deleteOrder(id);
    return NextResponse.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Failed to delete order:', err);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}