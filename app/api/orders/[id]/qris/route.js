// app/api/orders/[id]/qris/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyToken } from '../../../../../lib/auth.js';
import { findOrder, findUserById } from '../../../../../lib/db.js';
import { defGen } from '../../../../../lib/qris.js';

export async function GET(_req, { params }) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const orderId = Number(params.id);
    if (!Number.isFinite(orderId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const order = await findOrder(userId, orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const user = await findUserById(userId);
    const qris = user?.qrisPayload;
    if (!qris) {
      return NextResponse.json({ error: 'Silakan upload QRIS kamu terlebih dahulu' }, { status: 400 });
    }

    const amount = String(Math.max(0, Number(order.price || 0) || 0)).replace(/\.0+$/, '');
    if (!/^\d+$/.test(amount)) {
      return NextResponse.json({ error: 'Nominal order tidak valid' }, { status: 400 });
    }

    const { dataUrl } = await defGen({ qris, amount });
    return NextResponse.json({ dataUrl });
  } catch (err) {
    console.error('Failed to generate QRIS:', err);
    return NextResponse.json({ error: 'Failed to generate QRIS' }, { status: 500 });
  }
}
