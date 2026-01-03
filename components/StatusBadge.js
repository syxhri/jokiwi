// components/StatusBadge.js

export default function StatusBadge({ type, status }) {
  const config = {
    done: {
      true: { text: 'Selesai', color: 'bg-green-100 text-green-800' },
      false: { text: 'Belum Selesai', color: 'bg-yellow-100 text-yellow-800' },
    },
    paid: {
      true: { text: 'Lunas', color: 'bg-blue-100 text-blue-800' },
      false: { text: 'Belum Lunas', color: 'bg-red-100 text-red-800' },
    },
  };

  const value = Boolean(status);
  const { text, color } = config[type]?.[value] ?? {
    text: '-',
    color: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {text}
    </span>
  );
}
