export function TokenMeter({ percent, className = '' }) {
  const colorClass = percent > 80 ? 'bg-red-500' : percent > 50 ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className={`w-full bg-gray-700 rounded-full h-2.5 ${className}`}>
      <div 
        className={`${colorClass} h-2.5 rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, percent)}%` }}
      ></div>
    </div>
  );
}
