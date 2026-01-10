import Link from "next/link";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getCurrentUser } from "../lib/auth.js";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Jokiwi - Joki with Izee",
  description: "Catat dan kelola jokian mu dengan mudah di sini",
  icons: {
    icon: "/logo-jokiwi.svg",
    shortcut: "/logo-jokiwi.svg",
    apple: "/logo-jokiwi.svg",
  },
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
          <Footer />
        </div>
      </body>
    </html>
  );
}
