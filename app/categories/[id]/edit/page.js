import { notFound } from "next/navigation";
import { requireAuth } from "../../../../lib/auth.js";
import { findCategory } from "../../../../lib/db.js";
import CategoryForm from "../../../../components/CategoryForm";

async function getData(params) {
  const user = await requireAuth();
  const id = params.id;
  const category = await findCategory(user.id, id);
  return { user, id, category };
}

export async function generateMetadata({ params }) {
  const { user, id, category } = await getData(params);
  if (!category) {
    return {
      title: "Kategori tidak ditemukan",
    };
  }

  return {
    title: "Jokiwi - Edit Kategori",
    description: `Ubah detail untuk kategori ${category.name}`,
  };
}

export default async function EditCategoryPage({ params }) {
  const { user, id, category } = await getData(params);
  if (!category) {
    notFound();
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Kategori</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ubah detail kategori joki tugas.
        </p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}
