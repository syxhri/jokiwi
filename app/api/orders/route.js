// app/api/orders/route.js

import {
  filterOrders,
  computeStats,
  createOrder,
} from '../../../lib/db.js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const isDone = searchParams.get('is_done'); // 'true'|'false'|null
    const isPaid = searchParams.get('is_paid');
    const categoryId = searchParams.get('categoryId');
    const sortBy = searchParams.get('sortBy') || 'assigned_date';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const orders = await filterOrders({
      search,
      isDone,
      isPaid,
      categoryId,
      sortBy,
      sortDir,
    });

    const stats = computeStats(orders);

    return NextResponse.json({ orders, stats });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to load orders' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.client_name || !body.task_name) {
      return NextResponse.json(
        { error: 'Nama client dan nama tugas wajib diisi' },
        { status: 400 },
      );
    }

    const order = await createOrder(body);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
