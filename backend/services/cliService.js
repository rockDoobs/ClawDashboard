/**
 * CLI Service
 * 
 * Wraps OpenClaw CLI commands with Promise-based execution
 */

const { exec } = require('child_process');

const CLI_TIMEOUT_MS = 5000;

// Agent metadata for display
const AGENT_METADATA = {
  main: { name: 'Doobs', emoji: '🎯' },
  neil: { name: 'Neil', emoji: '💻' },
  archie: { name: 'Archie', emoji: '🏗️' },
  alana: { name: 'Alana', emoji: '📅' },
  trevor: { name: 'Trevor', emoji: '🔐' },
  kai: { name: 'Kai', emoji: '🧠' }
};

/**
 * Execute a CLI command and parse JSON output
 * @param {string} command - CLI command to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object>} Parsed JSON output
 */
async function runCli(command, timeout = CLI_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`CLI command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      clearTimeout(timeoutId);

      if (error) {
        console.error(`CLI error for "${command}":`, error.message);
        reject(new Error(`CLI error: ${error.message}`));
        return;
      }

      if (stderr && !stdout) {
        console.error(`CLI stderr for "${command}":`, stderr);
        reject(new Error(`CLI stderr: ${stderr}`));
        return;
      }

      // Try to parse JSON
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        console.error(`Failed to parse CLI output for "${command}":`, parseError.message);
        console.error('Raw output:', stdout.substring(0, 500));
        reject(new Error(`Failed to parse CLI output: ${parseError.message}`));
      }
    });
  });
}

async function runCliNdjson(command, timeout = CLI_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`CLI command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      clearTimeout(timeoutId);

      if (error) {
        console.error(`CLI error for "${command}":`, error.message);
        reject(new Error(`CLI error: ${error.message}`));
        return;
      }

      if (stderr && !stdout) {
        console.error(`CLI stderr for "${command}":`, stderr);
        reject(new Error(`CLI stderr: ${stderr}`));
        return;
      }

      try {
        const lines = stdout.trim().split('\n');
        const results = [];
        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line);
            results.push(parsed);
          }
        }
        resolve(results);
      } catch (parseError) {
        console.error(`Failed to parse NDJSON for "${command}":`, parseError.message);
        console.error('Raw output:', stdout.substring(0, 500));
        reject(new Error(`Failed to parse NDJSON: ${parseError.message}`));
      }
    });
  });
}

/**
 * Get status from OpenClaw CLI
 * @returns {Promise<object>} Status data with normalized structure
 */
async function getStatus() {
  const rawStatus = await runCli('openclaw status --json');
  
  // Normalize byAgent from array to object if needed
  if (rawStatus?.sessions?.byAgent && Array.isArray(rawStatus.sessions.byAgent)) {
    const byAgentObj = {};
    for (const agent of rawStatus.sessions.byAgent) {
      const agentId = agent.agentId;
      if (!agentId) continue;
      
      // Get the most recent session for this agent to extract token/model info
      const recentSession = agent.recent && agent.recent.length > 0 ? agent.recent[0] : null;
      
      byAgentObj[agentId] = {
        sessionCount: agent.count || 0,
        model: recentSession?.model || 'glm-5',
        contextTokens: recentSession?.contextTokens || 204800,
        inputTokens: recentSession?.inputTokens || 0,
        outputTokens: recentSession?.outputTokens || 0,
        totalTokens: recentSession?.totalTokens || 0,
        lastActiveAgeMs: recentSession?.age || Infinity
      };
    }
    rawStatus.sessions.byAgent = byAgentObj;
  }
  
  return rawStatus;
}

/**
 * Get health from OpenClaw CLI
 * @returns {Promise<object>} Health data with normalized structure
 */
async function getHealth() {
  const rawHealth = await runCli('openclaw health --json');
  
  // Normalize the health structure
  // The actual CLI returns: { ok, channels: { telegram: { running, configured, ... } } }
  // We need to transform it to match expected structure with gateway and channel status
  
  const normalized = {
    ok: rawHealth.ok || false,
    gateway: {
      status: 'unknown',
      uptime: 'N/A',
      uptimeSeconds: 0,
      version: 'N/A',
      pid: null
    },
    channels: {}
  };
  
  // Get gateway status from the status command if possible
  // For now, infer gateway status from overall health
  if (rawHealth.ok) {
    normalized.gateway.status = 'running';
  }
  
  // Normalize channels
  if (rawHealth.channels) {
    for (const [channelName, channelData] of Object.entries(rawHealth.channels)) {
      if (typeof channelData === 'string') {
        normalized.channels[channelName] = {
          status: channelData,
          connectedAt: null
        };
      } else if (typeof channelData === 'object') {
        // Map channel connectivity from probe/running booleans.
        // Some channels (e.g. Telegram) report connected via probe.ok even when running=false.
        let status = 'unknown';
        const probeOk = channelData?.probe?.ok === true;
        if (probeOk || channelData.running === true) {
          status = 'connected';
        } else if (channelData.running === false) {
          status = channelData.configured ? 'disconnected' : 'not_configured';
        }
        
        normalized.channels[channelName] = {
          status: status,
          connectedAt: channelData.lastStartAt || null,
          configured: channelData.configured || false,
          running: channelData.running || false,
          probeOk
        };
      }
    }
  }
  
  return normalized;
}

/**
 * Get logs from OpenClaw CLI
 * @returns {Promise<object>} Logs data
 */
async function getLogs() {
  return runCliNdjson('openclaw logs --json');
}

/**
 * Get sessions from OpenClaw CLI
 * @returns {Promise<object>} Sessions data
 */
async function getSessions() {
  return runCli('openclaw sessions --json');
}

/**
 * Get agent metadata
 * @param {string} agentId - Agent ID
 * @returns {object} Agent metadata
 */
function getAgentMetadata(agentId) {
  return AGENT_METADATA[agentId] || { name: agentId, emoji: '🤖' };
}

/**
 * Calculate agent status based on last active time
 * @param {number} lastActiveMs - Milliseconds since last active
 * @param {boolean} hasRecentErrors - Whether agent has recent errors
 * @returns {string} Status: 'working', 'idle', or 'error'
 */
function calculateStatus(lastActiveMs, hasRecentErrors = false) {
  const WORKING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  if (hasRecentErrors) return 'error';
  if (lastActiveMs < WORKING_THRESHOLD_MS) return 'working';
  return 'idle';
}

/**
 * Get agents with recent errors from logs
 * @param {Array} logs - Array of log entries
 * @param {number} errorWindowMs - Time window to consider recent (default 5 minutes)
 * @returns {Set} Set of agent IDs with recent errors
 */
function getAgentsWithRecentErrors(logs, errorWindowMs = 5 * 60 * 1000) {
  const agentsWithErrors = new Set();
  const now = Date.now();
  
  if (!Array.isArray(logs)) return agentsWithErrors;
  
  for (const entry of logs) {
    if (entry.type !== 'log' || entry.level !== 'error') continue;
    
    const logTime = entry.time ? new Date(entry.time).getTime() : 
                    entry.timestamp ? new Date(entry.timestamp).getTime() : null;
    
    if (logTime && (now - logTime) < errorWindowMs && entry.agent) {
      agentsWithErrors.add(entry.agent);
    }
  }
  
  return agentsWithErrors;
}

/**
 * Calculate token aggregations for time periods
 * @param {Array} sessions - Array of session objects
 * @param {string} agentId - Optional agent ID to filter by
 * @returns {Object} Token stats for current session, today, and week
 */
function calculateTokenAggregations(sessions, agentId = null) {
  const result = {
    current: { input: 0, output: 0, total: 0 },
    today: { input: 0, output: 0, total: 0, available: false },
    week: { input: 0, output: 0, total: 0, available: false }
  };
  
  if (!Array.isArray(sessions)) return result;
  
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = todayStart - (6 * 24 * 60 * 60 * 1000); // Last 7 days
  
  let hasTimeData = false;
  
  for (const session of sessions) {
    if (agentId && session.agentId !== agentId) continue;
    
    const sessionTime = session.lastActiveAgeMs !== undefined && session.lastActiveAgeMs !== Infinity
      ? now - session.lastActiveAgeMs
      : null;
    
    if (sessionTime) hasTimeData = true;
    
    const input = session.inputTokens || 0;
    const output = session.outputTokens || 0;
    const total = input + output;
    
    // Current session (most recent)
    if (!result.current.total || (sessionTime && sessionTime > (now - (result.current.lastActiveMs || Infinity)))) {
      result.current = { input, output, total, lastActiveMs: session.lastActiveAgeMs };
    }
    
    // Today's tokens
    if (sessionTime && sessionTime >= todayStart) {
      result.today.input += input;
      result.today.output += output;
      result.today.total += total;
      result.today.available = true;
    }
    
    // This week's tokens
    if (sessionTime && sessionTime >= weekStart) {
      result.week.input += input;
      result.week.output += output;
      result.week.total += total;
      result.week.available = true;
    }
  }
  
  // If no time data available, mark as N/A
  if (!hasTimeData) {
    result.today.available = false;
    result.week.available = false;
  }
  
  return result;
}

/**
 * Format milliseconds to human-readable time ago
 * @param {number} ms - Milliseconds
 * @returns {string} Human-readable time
 */
function formatTimeAgo(ms) {
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

/**
 * Format token count to human-readable
 * @param {number} tokens - Token count
 * @returns {string} Formatted string
 */
function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

/**
 * Calculate percentage of context used
 * @param {number} totalTokens - Total tokens used
 * @param {number} contextTokens - Context window size
 * @returns {number} Percentage (0-100)
 */
function calculatePercentUsed(totalTokens, contextTokens) {
  if (!contextTokens || contextTokens === 0) return 0;
  return Math.min(100, Math.round((totalTokens / contextTokens) * 100));
}

module.exports = {
  runCli,
  getStatus,
  getHealth,
  getLogs,
  getSessions,
  getAgentMetadata,
  calculateStatus,
  getAgentsWithRecentErrors,
  calculateTokenAggregations,
  formatTimeAgo,
  formatTokens,
  calculatePercentUsed,
  AGENT_METADATA
};
