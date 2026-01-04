// app/page.js

/**
 * Root page simply redirects to the categories listing. This keeps the
 * application entry point focused on category management, which
 * represents the primary view when using Jokiwi. The redirect is
 * performed server-side at render time to avoid an extra client
 * roundtrip.
 */
import { redirect } from 'next/navigation';

export default function Home() {
  // Immediately redirect to the categories page. Using a server-side
  // redirect ensures that unauthenticated users will hit the auth
  // middleware in the categories route rather than seeing a blank
  // dashboard.
  redirect('/');
}
