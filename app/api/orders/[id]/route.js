import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "../../../../lib/auth.js";
import { findOrder, updateOrder, deleteOrder } from "../../../../lib/db.js";

function parseIds(params) {
  const id = Number(params.id);
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  let userId = null;
  if (token) {
    try {
      userId = verifyToken(token).userId;
    } catch {
      userId = null;
    }
  }
  return { id: Number.isNaN(id) ? null : id, userId };
}

export async function GET(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const order = await findOrder(userId, id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error("Failed to fetch order:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const body = await request.json();
    const updated = await updateOrder(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update order:", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const ok = await deleteOrder(userId, id);
    return NextResponse.json({ deleted: ok });
  } catch (err) {
    console.error("Failed to delete order:", err);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
