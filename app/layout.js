import Link from "next/link";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MissingWhatsappDialog from "@/components/MissingWhatsappDialog";
import { getCurrentUser } from "@/lib/auth.js";
import { ThemeProvider } from "./ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Jokiwi - Joki with Izee",
  description: "Catat dan kelola jokian mu dengan mudah di sini.",
  icons: {
    icon: "/images/logo-jokiwi-white.svg",
    shortcut: "/images/logo-jokiwi-white.svg",
    apple: "/images/logo-jokiwi-white.svg",
  },
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  const initialUser = user
    ? { id: user.id, username: user.username, name: user.name || "" }
    : null;

  // Dialog wajib WA: hanya tampil untuk penjoki yang sudah login tapi belum isi WA
  const showWhatsappDialog =
    user && user.role === "joki" && !user.whatsappPhone;

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-50">
            <Navbar initialUser={initialUser} />
            <main className="container mx-auto px-4 py-8">{children}</main>
            <Footer />
            {/* Modal mandatory jika penjoki belum isi nomor WhatsApp */}
            {showWhatsappDialog && <MissingWhatsappDialog />}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

