import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "../../../../lib/auth.js";
import {
  findCategory,
  updateCategory,
  deleteCategory,
} from "../../../../lib/db.js";

function parseIds(params) {
  const id = params.id;
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  let userId = null;
  if (token) {
    try {
      userId = verifyToken(token).userId;
    } catch {
      userId = null;
    }
  }
  return { id, userId };
}

export async function GET(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const category = await findCategory(userId, id);
    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load category" },
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
    const body = await request.json();
    const updated = await updateCategory(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to update category" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id, userId } = parseIds(params);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const ok = await deleteCategory(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to delete category" },
      { status: 400 }
    );
  }
}
