// app/api/categories/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getAllCategoriesForUser,
  createCategory,
} from '../../../lib/db.js';

// GET /api/categories
// Returns a list of categories belonging to the authenticated user.

export async function GET() {
  try {
    const cookieStore = cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = Number(userIdStr);
    const categories = await getAllCategoriesForUser(userId);
    return NextResponse.json(categories);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

// POST /api/categories
// Creates a new category for the authenticated user.

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = Number(userIdStr);
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const category = await createCategory(userId, body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}