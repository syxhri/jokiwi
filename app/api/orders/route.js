// app/api/orders/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  filterOrders,
  computeStats,
  createOrder,
} from '../../../lib/db.js';

/**
 * GET /api/orders
 *
 * Retrieves orders for the authenticated user, applying optional
 * filters and sorting. Accepts the following query parameters:
 *   - search: string to match against client_name, task_name,
 *     category_name and notes
 *   - is_done: 'true' | 'false' to filter by completion status
 *   - is_paid: 'true' | 'false' to filter by payment status
 *   - categoryId: numeric ID of a category to restrict results
 *   - sortBy: 'assigned_date' | 'deadline_date' | 'price'
 *   - sortDir: 'asc' | 'desc'
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const idStr = cookieStore.get('userId')?.value;
    if (!idStr) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = Number(idStr);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const isDone = searchParams.get('is_done');
    const isPaid = searchParams.get('is_paid');
    const categoryId = searchParams.get('categoryId');
    const sortBy = searchParams.get('sortBy') || 'assigned_date';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const orders = await filterOrders({
      userId,
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
    console.error('Failed to fetch orders:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

/**
 * POST /api/orders
 *
 * Creates a new order for the authenticated user. Expects a JSON body
 * containing at least `client_name`, `task_name` and `price`. Optional
 * fields: `categoryId`, `notes`, `is_done`, `is_paid`, `assigned_date`,
 * `deadline_date`.
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const idStr = cookieStore.get('userId')?.value;
    if (!idStr) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = Number(idStr);
    const data = await request.json();
    const {
      client_name,
      task_name,
      price,
      categoryId,
      notes,
      is_done = false,
      is_paid = false,
      assigned_date,
      deadline_date,
    } = data || {};
    if (!client_name || !task_name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const newOrder = await createOrder(userId, {
      client_name,
      task_name,
      price,
      categoryId,
      notes,
      is_done,
      is_paid,
      assigned_date,
      deadline_date,
    });
    return NextResponse.json(newOrder, { status: 201 });
  } catch (err) {
    console.error('Failed to create order:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}