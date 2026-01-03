// app/api/orders/route.js

import { filterOrders, computeStats, createOrder } from '../../../lib/db.js';
import { NextResponse } from 'next/server';

/**
 * GET /api/orders
 *
 * Returns a list of orders along with aggregate statistics. Supports
 * filtering by search term, completion status and payment status via
 * query parameters. For example:
 *   /api/orders?search=Budi&is_done=true&is_paid=false
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    // Convert query parameters to booleans or null
    const isDoneParam = searchParams.get('is_done');
    const isPaidParam = searchParams.get('is_paid');
    const filters = {
      search: search || null,
      is_done:
        isDoneParam === null ? null : isDoneParam === 'true' ? true : false,
      is_paid:
        isPaidParam === null ? null : isPaidParam === 'true' ? true : false,
    };
    const orders = await filterOrders(filters);
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
 * Creates a new order. Expects a JSON body with the following fields:
 *   - client_name (string, required)
 *   - task_name (string, required)
 *   - subject_or_category (string, optional)
 *   - price (number, required)
 *   - note (string, optional)
 *   - is_done (boolean, optional)
 *   - is_paid (boolean, optional)
 */
export async function POST(request) {
  try {
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
    const newOrder = await createOrder({
      client_name,
      task_name,
      subject_or_category,
      price,
      note,
      is_done,
      is_paid,
    });
    return NextResponse.json(newOrder, { status: 201 });
  } catch (err) {
    console.error('Failed to create order:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}