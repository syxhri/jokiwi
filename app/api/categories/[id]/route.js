// app/api/categories/[id]/route.js

import {
  findCategory,
  updateCategory,
  deleteCategory,
} from '../../../../lib/db.js';
import { NextResponse } from 'next/server';

export async function GET(_request, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const category = await findCategory(id);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(request, { params }) {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const updated = await updateCategory(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = Number(params.id);
    await deleteCategory(id);
    return NextResponse.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete category' },
      { status: 400 },
    );
  }
}
