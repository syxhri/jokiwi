import Link from "next/link";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navbar from "../components/Navbar";
import { getCurrentUser } from "../lib/auth.js";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Jokiwi - Joki with Izee",
  description: "Kelola jokian mu dengan mudah di sini",
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  const initialUser = user
    ? { id: user.id, username: user.username, name: user.name || "" }
    : null;
  return (
    <html lang="id">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Navbar initialUser={initialUser} />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-gray-200 py-6 text-center text-gray-600">
            <p>
              Made with 🤖 By{" "}
              <Link
                href="https://github.com/syxhri/"
                className="text-xs text-primary-600 hover:text-primary-800 whitespace-nowrap"
              >
                @syxhri
              </Link>
              .
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
