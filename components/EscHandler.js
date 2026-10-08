"use client";

import { useEffect } from "react";

/**
 * EscHandler — dipasang sekali di root layout.
 * Saat Escape ditekan, dispatch custom event "close-modal"
 * yang didengarkan oleh semua dialog/dropdown terbuka.
 */
export default function EscHandler() {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      window.dispatchEvent(new CustomEvent("close-modal"));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
