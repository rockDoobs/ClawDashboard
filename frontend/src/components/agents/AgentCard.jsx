import { StatusBadge } from '../common/StatusBadge';
import { TokenMeter } from '../common/TokenMeter';
import { formatTokens, formatTimeAgo } from '../../utils/formatters';

export function AgentCard({ agent }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-gray-400">{agent.model}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Context Usage</span>
            <span>{agent.percentUsed}%</span>
          </div>
          <TokenMeter percent={agent.percentUsed} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-400">Input</p>
            <p className="font-semibold text-white">{formatTokens(agent.inputTokens)}</p>
          </div>
          <div>
            <p className="text-gray-400">Output</p>
            <p className="font-semibold text-white">{formatTokens(agent.outputTokens)}</p>
          </div>
          <div>
            <p className="text-gray-400">Total</p>
            <p className="font-semibold text-white">{formatTokens(agent.totalTokens)}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
          <span>{agent.sessions} sessions</span>
          <span>{formatTimeAgo(agent.lastActiveMs)}</span>
        </div>
      </div>
    </div>
  );
}
