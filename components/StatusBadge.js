// components/StatusBadge.js

const baseClass =
  'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap';

export default function StatusBadge({ type, status }) {
  let label = '';
  let className = baseClass;

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
