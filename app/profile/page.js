import { requireAuth } from "@/lib/auth.js";
import ProfileClient from "./profileClient";

export const metadata = {
  title: "Jokiwi - Profil",
  description: "Profil akun",
};

export default async function ProfilePage() {
  const user = await requireAuth();

  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name || "",
    qrisPayload: user.qrisPayload,
  };

  return <ProfileClient user={safeUser} />;
}
