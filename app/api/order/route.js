export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { filterOrders, computeStats, createOrder } from "@/lib/db.js";

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isDone = searchParams.get("is_done");
    const isPaid = searchParams.get("is_paid");
    const categoryCode = searchParams.get("categoryCode");
    const sortBy = searchParams.get("sortBy") || "assigned_date";
    const sortDir = searchParams.get("sortDir") || "desc";
    const orders = await filterOrders({
      userId,
      search,
      isDone,
      isPaid,
      categoryCode,
      sortBy,
      sortDir,
    });
    const stats = computeStats(orders);
    return NextResponse.json({ orders, stats });
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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
    console.error("Failed to create order:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
