// app/layout.js

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Jokiwi - Manager Jokian',
  description: 'Kelola semua jokian kamu di sini',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-gray-200 py-6 text-center text-gray-600">
            <p>
              © {new Date().getFullYear()} Jokiwi Made with 💩 by
              <Link
                  href="https://github.com/syxhri"
                  className="text-primary-600 hover:text-primary-800 whitespace-nowrap"
              >
               @syxhri
              </Link>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
