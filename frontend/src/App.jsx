import { usePolling } from './hooks/usePolling';
import { fetchOverview } from './services/api';
import { AgentGrid } from './components/agents/AgentGrid';
import { HealthPanel } from './components/health/HealthPanel';
import { ErrorPanel } from './components/logs/ErrorPanel';
import { RefreshControls } from './components/common/RefreshControls';
import { formatTokens } from './utils/formatters';

function App() {
  const { data, loading, error, refetch } = usePolling(fetchOverview, 10000);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <h2 className="text-red-400 font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-red-300">{error}</p>
            <button 
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h1 className="text-2xl font-bold">ClawDashboard</h1>
              <p className="text-sm text-gray-400">OpenClaw Agent Monitoring</p>
            </div>
          </div>
          <RefreshControls onRefresh={refetch} loading={loading} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && !data ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            {data?.totals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-400 text-sm">Total Agents</p>
                  <p className="text-2xl font-bold">{data.totals.agents}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-400 text-sm">Active Agents</p>
                  <p className="text-2xl font-bold text-green-400">{data.totals.activeAgents}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-400 text-sm">Total Tokens</p>
                  <p className="text-2xl font-bold">{formatTokens(data.totals.totalTokens)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-400 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold">{data.totals.totalSessions}</p>
                </div>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agents Grid - Takes up 2 columns */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>🤖</span> Agent Status
                </h2>
                <AgentGrid agents={data?.agents} />
              </div>

              {/* Sidebar - Health & Errors */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span>💚</span> System Health
                  </h2>
                  <HealthPanel health={data?.health} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span>⚠️</span> Recent Errors
                  </h2>
                  <ErrorPanel logs={data?.logs} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
              <p>Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'Never'}</p>
              <p className="mt-1">Auto-refresh every 10 seconds</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
