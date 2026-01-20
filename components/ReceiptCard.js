import { forwardRef } from "react";

const ReceiptCard = forwardRef(function ReceiptCard({ order }, ref) {
  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div
      ref={ref}
      className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800"
    >
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-300 pb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">Client</p>
          <p className="text-base font-semibold text-gray-900">
            {order.client_name || "-"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-500">Total</p>
          <p className="text-base font-bold text-emerald-600">
            Rp {Number(order.price || 0).toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Tugas</span>
          <span className="font-medium text-gray-900">
            {order.task_name || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Kategori</span>
          <span className="font-medium text-gray-900">
            {order.category_name || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tanggal Disuruh</span>
          <span className="font-medium text-gray-900">
            {formatDate(order.assigned_date)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Deadline</span>
          <span className="font-medium text-gray-900">
            {formatDate(order.deadline_date)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status Pengerjaan</span>
          <span className="font-medium text-gray-900">
            {order.is_done ? "Selesai" : "Belum Selesai"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status Pembayaran</span>
          <span className="font-medium text-emerald-700">
            {order.is_paid ? "Lunas" : "Belum Lunas"}
          </span>
        </div>
        {order.notes && (
          <div className="mt-2">
            <p className="text-gray-500">Catatan</p>
            <p className="whitespace-pre-line text-gray-800">
              {order.notes}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-dashed border-gray-300 pt-2 text-xs text-gray-500">
        <p>
          {new Date().toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          | Order ID: {order.orderCode || "-"}
        </p>
      </div>

      <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-[11px] text-gray-500">
        <p>Terima kasih sudah menggunakan jasa Jokiwi 🎓</p>
        <p>
          Struk ini dibuat secara otomatis dari{" "}
          <a
            href="https://jokiwi.app/"
            className="text-primary-600 hover:text-primary-800 whitespace-nowrap"
          >
            jokiwi.app
          </a>.
        </p>
      </div>
    </div>
  );
});

export default ReceiptCard;