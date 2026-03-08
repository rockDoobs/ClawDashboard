import { formatTokens } from '../../utils/formatters';

function TokenPeriodCard({ title, tokens, inputLabel = true }) {
  const available = tokens?.available;
  
  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <h4 className="text-sm font-medium text-gray-300 mb-2">{title}</h4>
      {available ? (
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-bold text-white">{formatTokens(tokens.total)}</span>
          </div>
          {inputLabel && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">In:</span>
                <span className="text-gray-300 ml-1">{formatTokens(tokens.input)}</span>
              </div>
              <div>
                <span className="text-gray-500">Out:</span>
                <span className="text-gray-300 ml-1">{formatTokens(tokens.output)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic">
          N/A
          <span className="text-xs block text-gray-600">Historical data unavailable</span>
        </div>
      )}
    </div>
  );
}

export function TokenUsagePanel({ totals, agents }) {
  const tokensToday = totals?.tokensToday;
  const tokensWeek = totals?.tokensWeek;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <TokenPeriodCard title="Today" tokens={tokensToday} />
        <TokenPeriodCard title="This Week" tokens={tokensWeek} />
      </div>
      
      {agents && agents.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Agent Breakdown</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {agents.map(agent => {
              const today = agent.tokens?.today;
              return (
                <div key={agent.id} className="flex items-center justify-between text-xs bg-gray-750 rounded px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span>{agent.emoji}</span>
                    <span className="text-gray-300">{agent.name}</span>
                  </div>
                  <div className="text-gray-400">
                    {today?.available ? (
                      <span>{formatTokens(today.total)} today</span>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
