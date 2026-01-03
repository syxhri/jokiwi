// app/api/orders/[id]/route.js

import {
  findOrder,
  updateOrder,
  deleteOrder,
} from '../../../../lib/db.js';
import { NextResponse } from 'next/server';

export async function GET(_request, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const order = await findOrder(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(request, { params }) {
  try {
    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateOrder(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const ok = await deleteOrder(id);
    if (!ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 },
    );
  }
}
