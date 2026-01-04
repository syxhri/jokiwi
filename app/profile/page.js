// app/profile/page.js

import { requireAuth } from '../../lib/auth.js';
import ProfileClient from './profileClient';

export default async function ProfilePage() {
  const user = await requireAuth();

  // Only pass safe fields to the client component
  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name || '',
    hasQris: Boolean(user.qrisPayload),
  };

  return <ProfileClient user={safeUser} />;
}
