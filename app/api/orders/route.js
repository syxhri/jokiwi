// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { getDb, computeStats } from '../../../lib/db.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get('search') || '').toLowerCase();
  const isDone = searchParams.get('is_done');
  const isPaid = searchParams.get('is_paid');
  const sortBy = searchParams.get('sortBy') || 'assigned_date';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const categoryIdParam = searchParams.get('categoryId');

  const db = await getDb();
  let orders = db.data.orders || [];

  // filter by kategori kalau ada
  if (categoryIdParam) {
    const categoryId = Number(categoryIdParam);
    orders = orders.filter((o) => Number(o.categoryId) === categoryId);
  }

  // search nama client / tugas
  if (search) {
    orders = orders.filter((o) => {
      const name = (o.client_name || '').toLowerCase();
      const task = (o.task_name || '').toLowerCase();
      return name.includes(search) || task.includes(search);
    });
  }

  // filter selesai
  if (isDone === 'true') {
    orders = orders.filter((o) => !!o.is_done);
  } else if (isDone === 'false') {
    orders = orders.filter((o) => !o.is_done);
  }

  // filter lunas
  if (isPaid === 'true') {
    orders = orders.filter((o) => !!o.is_paid);
  } else if (isPaid === 'false') {
    orders = orders.filter((o) => !o.is_paid);
  }

  // sort
  orders = orders.slice().sort((a, b) => {
    let va = a[sortBy];
    let vb = b[sortBy];

    if (sortBy === 'price') {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else if (sortBy === 'assigned_date' || sortBy === 'deadline_date') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    }

    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const stats = computeStats(orders);

  return NextResponse.json({ orders, stats });
}
