// app/api/categories/route.js

import {
  getAllCategories,
  createCategory,
} from '../../../lib/db.js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi' },
        { status: 400 },
      );
    }
    const category = await createCategory(body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 },
    );
  }
}
