/**
 * components/StatusBadge.js
 * Badge status untuk order di dashboard penjoki.
 * Mendukung type: "done", "paid", "order-status"
 */
export default function StatusBadge({ type, status }) {
  const base =
    "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap";

  let label = "";
  let className = base;

  if (type === "done") {
    if (status) {
      label = "Selesai";
      className += " bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    } else {
      label = "Belum Selesai";
      className += " bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  } else if (type === "paid") {
    if (status) {
      label = "Lunas";
      className += " bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    } else {
      label = "Belum Lunas";
      className += " bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    }
  } else if (type === "order-status") {
    // status = "pending" | "accepted" | "rejected" | "done" | "manual"
    switch (status) {
      case "pending":
        label = "Pending";
        className += " bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
        break;
      case "accepted":
        label = "Diterima";
        className += " bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        break;
      case "rejected":
        label = "Ditolak";
        className += " bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
        break;
      case "done":
        label = "Done";
        className += " bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
        break;
      default:
        label = "Manual";
        className += " bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400";
    }
  }

  if (!label) return null;
  return <span className={className}>{label}</span>;
}
