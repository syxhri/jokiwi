"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const current =
    theme === "system" ? systemTheme : theme;

  function toggle() {
    setTheme(current === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
      aria-label="Toggle theme"
    >
      {current === "dark" ? "☀️" : "🌙"}
    </button>
  );
}