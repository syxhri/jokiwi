// app/layout.js

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Joki Tugas App - Order Management',
  description: 'Manage your freelance assignment orders',
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
              © {new Date().getFullYear()} Joki Tugas App. All rights reserved.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
