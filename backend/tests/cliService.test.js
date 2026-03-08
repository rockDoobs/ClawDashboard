/**
 * Unit tests for cliService
 * Tests the normalization of CLI output to expected format
 */

const assert = require('assert');
const { sampleHealthData, sampleStatusData } = require('./fixtures');

function normalizeHealthData(rawHealth) {
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
  
  if (rawHealth.ok) {
    normalized.gateway.status = 'running';
  }
  
  if (rawHealth.channels) {
    for (const [channelName, channelData] of Object.entries(rawHealth.channels)) {
      if (typeof channelData === 'string') {
        normalized.channels[channelName] = {
          status: channelData,
          connectedAt: null
        };
      } else if (typeof channelData === 'object') {
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

function normalizeStatusData(rawStatus) {
  const normalized = JSON.parse(JSON.stringify(rawStatus));
  
  if (normalized?.sessions?.byAgent && Array.isArray(normalized.sessions.byAgent)) {
    const byAgentObj = {};
    for (const agent of normalized.sessions.byAgent) {
      const agentId = agent.agentId;
      if (!agentId) continue;
      
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
    normalized.sessions.byAgent = byAgentObj;
  }
  
  return normalized;
}

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

function calculateTokenAggregations(sessions, agentId = null) {
  const result = {
    current: { input: 0, output: 0, total: 0 },
    today: { input: 0, output: 0, total: 0, available: false },
    week: { input: 0, output: 0, total: 0, available: false }
  };
  
  if (!Array.isArray(sessions)) return result;
  
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = todayStart - (6 * 24 * 60 * 60 * 1000);
  
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
    
    if (!result.current.total || (sessionTime && sessionTime > (now - (result.current.lastActiveAgeMs || Infinity)))) {
      result.current = { input, output, total, lastActiveAgeMs: session.lastActiveAgeMs };
    }
    
    if (sessionTime && sessionTime >= todayStart) {
      result.today.input += input;
      result.today.output += output;
      result.today.total += total;
      result.today.available = true;
    }
    
    if (sessionTime && sessionTime >= weekStart) {
      result.week.input += input;
      result.week.output += output;
      result.week.total += total;
      result.week.available = true;
    }
  }
  
  if (!hasTimeData) {
    result.today.available = false;
    result.week.available = false;
  }
  
  return result;
}

function testHealthNormalization() {
  console.log('Testing health data normalization...');
  
  const result = normalizeHealthData(sampleHealthData);
  
  assert.strictEqual(result.ok, true, 'ok field should be true');
  assert.strictEqual(result.gateway.status, 'running', 'Gateway status should be running when ok is true');
  assert.ok(result.channels.telegram, 'Telegram channel should exist');
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Telegram status should be connected when probe.ok=true even if running=false');
  assert.strictEqual(result.channels.telegram.configured, true, 'Telegram configured should be true');
  assert.strictEqual(result.channels.telegram.running, false, 'Telegram running should be false');
  
  console.log('✓ Health normalization tests passed');
}

function testStatusNormalization() {
  console.log('Testing status data normalization...');
  
  const result = normalizeStatusData(sampleStatusData);
  
  assert.ok(result.sessions.byAgent, 'byAgent should exist');
  assert.strictEqual(typeof result.sessions.byAgent, 'object', 'byAgent should be an object');
  assert.ok(!Array.isArray(result.sessions.byAgent), 'byAgent should not be an array');
  assert.ok(result.sessions.byAgent.main, 'main agent should exist');
  assert.strictEqual(result.sessions.byAgent.main.sessionCount, 18, 'main sessionCount should be 18');
  assert.strictEqual(result.sessions.byAgent.main.model, 'gpt-5.2', 'main model should be gpt-5.2');
  assert.strictEqual(result.sessions.byAgent.main.contextTokens, 272000, 'main contextTokens should be 272000');
  assert.strictEqual(result.sessions.byAgent.main.totalTokens, 54202, 'main totalTokens should be 54202');
  assert.ok(result.sessions.byAgent.neil, 'neil agent should exist');
  assert.strictEqual(result.sessions.byAgent.neil.sessionCount, 2, 'neil sessionCount should be 2');
  
  console.log('✓ Status normalization tests passed');
}

function testHealthProbeConnected() {
  console.log('Testing health with probe-based connectivity...');
  
  const healthWithProbe = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: false,
        probe: { ok: true }
      }
    }
  };
  
  const result = normalizeHealthData(healthWithProbe);
  
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Channel should be connected when probe.ok=true');
  assert.strictEqual(result.channels.telegram.probeOk, true, 'probeOk should be true');
  
  console.log('✓ Health with probe-based connectivity tests passed');
}

function testHealthWithRunningChannel() {
  console.log('Testing health with running channel...');
  
  const healthWithRunning = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: true
      }
    }
  };
  
  const result = normalizeHealthData(healthWithRunning);
  
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Channel should be connected when running=true');
  
  console.log('✓ Health with running channel tests passed');
}

function testHealthWithNotConfiguredChannel() {
  console.log('Testing health with not configured channel...');
  
  const healthNotConfigured = {
    ok: true,
    channels: {
      telegram: {
        configured: false,
        running: false
      }
    }
  };
  
  const result = normalizeHealthData(healthNotConfigured);
  
  assert.strictEqual(result.channels.telegram.status, 'not_configured', 'Channel should be not_configured when configured=false and running=false');
  
  console.log('✓ Health with not configured channel tests passed');
}

function testHealthNotOk() {
  console.log('Testing health when not ok...');
  
  const healthNotOk = {
    ok: false,
    channels: {}
  };
  
  const result = normalizeHealthData(healthNotOk);
  
  assert.strictEqual(result.ok, false, 'ok field should be false');
  assert.strictEqual(result.gateway.status, 'unknown', 'Gateway status should be unknown when ok is false');
  
  console.log('✓ Health not ok tests passed');
}

function testGetAgentsWithRecentErrors() {
  console.log('Testing getAgentsWithRecentErrors...');
  
  const now = Date.now();
  const recentErrorTime = new Date(now - 2 * 60 * 1000).toISOString();
  const oldErrorTime = new Date(now - 10 * 60 * 1000).toISOString();
  
  const logs = [
    { type: 'log', level: 'error', agent: 'main', time: recentErrorTime, message: 'Test error' },
    { type: 'log', level: 'warn', agent: 'neil', time: recentErrorTime, message: 'Test warning' },
    { type: 'log', level: 'error', agent: 'archie', time: oldErrorTime, message: 'Old error' },
    { type: 'log', level: 'info', agent: 'kai', time: recentErrorTime, message: 'Info message' }
  ];
  
  const result = getAgentsWithRecentErrors(logs);
  
  assert.ok(result.has('main'), 'main should have recent error');
  assert.ok(!result.has('neil'), 'neil should not have error (warning not error)');
  assert.ok(!result.has('archie'), 'archie error is too old');
  assert.ok(!result.has('kai'), 'kai only has info message');
  
  console.log('✓ getAgentsWithRecentErrors tests passed');
}

function testCalculateTokenAggregations() {
  console.log('Testing calculateTokenAggregations...');
  
  const now = Date.now();
  const todayAge = 30 * 60 * 1000;
  const weekAge = 2 * 24 * 60 * 60 * 1000;
  const oldAge = 10 * 24 * 60 * 60 * 1000;
  
  const sessions = [
    { agentId: 'main', inputTokens: 1000, outputTokens: 500, lastActiveAgeMs: todayAge },
    { agentId: 'main', inputTokens: 2000, outputTokens: 1000, lastActiveAgeMs: weekAge },
    { agentId: 'neil', inputTokens: 500, outputTokens: 250, lastActiveAgeMs: todayAge },
    { agentId: 'archie', inputTokens: 300, outputTokens: 150, lastActiveAgeMs: oldAge }
  ];
  
  const allResult = calculateTokenAggregations(sessions);
  assert.strictEqual(allResult.today.input, 1500, 'Today input should be 1500');
  assert.strictEqual(allResult.today.output, 750, 'Today output should be 750');
  assert.strictEqual(allResult.today.total, 2250, 'Today total should be 2250');
  assert.strictEqual(allResult.today.available, true, 'Today should be available');
  assert.strictEqual(allResult.week.total, 5250, 'Week total should include weekAge session');
  
  const mainResult = calculateTokenAggregations(sessions, 'main');
  assert.strictEqual(mainResult.today.input, 1000, 'Main today input should be 1000');
  assert.strictEqual(mainResult.week.total, 4500, 'Main week total should be 4500');
  
  const emptyResult = calculateTokenAggregations(null);
  assert.strictEqual(emptyResult.today.available, false, 'Empty should not be available');
  assert.strictEqual(emptyResult.week.available, false, 'Empty should not be available');
  
  console.log('✓ calculateTokenAggregations tests passed');
}

console.log('\n=== Running cliService normalization tests ===\n');
try {
  testHealthNormalization();
  testStatusNormalization();
  testHealthProbeConnected();
  testHealthWithRunningChannel();
  testHealthWithNotConfiguredChannel();
  testHealthNotOk();
  testGetAgentsWithRecentErrors();
  testCalculateTokenAggregations();
  console.log('\n✅ All tests passed!\n');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
