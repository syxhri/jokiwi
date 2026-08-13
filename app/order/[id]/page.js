export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth.js";
import { findOrder } from "@/lib/db.js";
import OrderDetailClient from "./orderDetailClient.js";

export const metadata = {
  title: "Jokiwi - Detail Order",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({ params }) {
  const user = await requireAuth();
  const { id } = await params;

  const order = await findOrder(user.id, id);
  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} userId={user.id} />;
}
