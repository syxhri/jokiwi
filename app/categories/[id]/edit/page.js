// app/categories/[id]/edit/page.js

import { notFound } from 'next/navigation';
import { findCategory } from '../../../../lib/db.js';
import CategoryForm from '../../../../components/CategoryForm';

export default async function EditCategoryPage({ params }) {
  const id = Number(params.id);
  const category = await findCategory(id);

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Kategori
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Ubah detail kategori joki tugas.
        </p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}
