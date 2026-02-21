import { getStatusColor, getStatusBgColor } from '../../utils/formatters';

export function StatusBadge({ status }) {
  const colorClass = getStatusColor(status);
  const bgClass = getStatusBgColor(status);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass} text-white`}>
      <span className={`w-2 h-2 mr-1.5 rounded-full ${bgClass}`}></span>
      {status}
    </span>
  );
}
