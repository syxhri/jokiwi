import { requireAuth } from "../../../lib/auth.js";
import CategoryForm from "../../../components/CategoryForm";

export const metadata = {
  title: "Jokiwi - Tambah Kategori",
  description: "Tambah kategori baru untuk jokian mu",
};

export default async function NewCategoryPage() {
  await requireAuth();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kategori Baru</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tambahkan kategori baru untuk mengelompokkan orderan joki mu.
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}
