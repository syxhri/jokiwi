// app/categories/new/page.js

import { requireAuth } from '../../../lib/auth.js';
import CategoryForm from '../../../components/CategoryForm';

/**
 * Page for creating a new category. This page enforces authentication.
 */
export default async function NewCategoryPage() {
  await requireAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kategori Baru</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tambahkan kategori baru untuk mengelompokkan order joki tugas Anda.
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}