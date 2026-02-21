export function HealthPanel({ health }) {
  if (!health) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400">Loading health data...</p>
      </div>
    );
  }

  const overallColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-500'
  }[health.overall] || 'bg-gray-500';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">System Health</h3>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${overallColor}`}>
          {health.overall}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400">Gateway</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              health.gateway?.status === 'running' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-white">{health.gateway?.status || 'unknown'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400">Uptime</span>
          <span className="text-white">{health.gateway?.uptime || 'N/A'}</span>
        </div>

        {health.channels && Object.entries(health.channels).map(([name, data]) => {
          const status = typeof data === 'string' ? data : data.status;
          return (
            <div key={name} className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 capitalize">{name}</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="text-white">{status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
