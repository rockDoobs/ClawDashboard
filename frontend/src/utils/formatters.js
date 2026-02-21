export function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function formatTimeAgo(ms) {
  if (!ms || ms < 0 || !isFinite(ms)) return 'Never';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function getStatusColor(status) {
  switch (status) {
    case 'working': return 'text-green-500';
    case 'idle': return 'text-gray-500';
    case 'error': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function getStatusBgColor(status) {
  switch (status) {
    case 'working': return 'bg-green-500';
    case 'idle': return 'bg-gray-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}
