// components/StatusBadge.js

export default function StatusBadge({ type, status }) {
  const config = {
    done: {
      true: { text: 'Selesai', color: 'bg-green-100 text-green-800' },
      false: { text: 'Belum', color: 'bg-yellow-100 text-yellow-800' },
    },
    paid: {
      true: { text: 'Lunas', color: 'bg-blue-100 text-blue-800' },
      false: { text: 'Belum', color: 'bg-red-100 text-red-800' },
    },
  };
  const { text, color } = config[type][status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
}