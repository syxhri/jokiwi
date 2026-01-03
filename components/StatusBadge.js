// components/StatusBadge.js

/**
 * StatusBadge renders a labelled pill representing either completion or
 * payment state. For completion (type "done") it displays
 * "Selesai" or "Belum Selesai". For payment (type "paid") it
 * displays "Lunas" or "Belum Lunas". Colors are chosen to
 * communicate meaning (green for success, yellow for pending,
 * blue for payment complete, red for payment pending). The badge
 * text never wraps onto multiple lines.
 *
 * @param {object} props
 * @param {'done'|'paid'} props.type
 * @param {boolean} props.status
 */
export default function StatusBadge({ type, status }) {
  const base =
    'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap';
  let label = '';
  let className = base;
  if (type === 'done') {
    if (status) {
      label = 'Selesai';
      className += ' bg-emerald-100 text-emerald-700';
    } else {
      label = 'Belum Selesai';
      className += ' bg-yellow-100 text-yellow-700';
    }
  } else if (type === 'paid') {
    if (status) {
      label = 'Lunas';
      className += ' bg-blue-100 text-blue-700';
    } else {
      label = 'Belum Lunas';
      className += ' bg-red-100 text-red-700';
    }
  }
  return <span className={className}>{label}</span>;
}