// components/Navbar.js
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {/* Brand */}
        <Link href="/" className="text-lg font-bold text-primary-600">
          Jokiwi
        </Link>

        {/* Nav links - SELALU terlihat, nggak pakai hidden md:flex */}
        <nav className="flex items-center gap-4 text-sm font-medium overflow-x-auto">
{/*          <Link
            href="/"
            className="text-gray-700 hover:text-gray-900 whitespace-nowrap"
          >
            Kategori
          </Link>*/}
          <Link
            href="/orders"
            className="text-gray-700 hover:text-gray-900 whitespace-nowrap"
          >
            All Orders
          </Link>
          <Link
            href="/orders/new"
            className="text-primary-600 hover:text-primary-800 whitespace-nowrap"
          >
            New Order
          </Link>
        </nav>
      </div>
    </header>
  );
}
