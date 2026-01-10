"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <footer className="border-t border-gray-200 py-6 text-center text-gray-600">
      <p className="text-xs">
        Made with 🤖 By{" "}
        <Link
          href="https://github.com/syxhri/"
          className="text-primary-600 hover:text-primary-800 whitespace-nowrap"
        >
          @syxhri
        </Link>
        .
      </p>
    </footer>
  );
}
