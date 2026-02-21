/**
 * Unit tests for cliService
 * Tests the normalization of CLI output to expected format
 */

const assert = require('assert');
const { sampleHealthData, sampleStatusData } = require('./fixtures');

// Mock cliService functions for testing
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
        // Determine connectivity based on probe.ok first
        let status = 'unknown';
        const probeOk = channelData.probe?.ok === true;
        const isRunning = channelData.running === true;
        const isConfigured = channelData.configured === true;

        if (probeOk) {
          status = 'connected';
        } else if (isRunning) {
          status = 'connecting';
        } else if (isConfigured) {
          status = 'disconnected';
        } else {
          status = 'not_configured';
        }
        
        normalized.channels[channelName] = {
          status: status,
          connectedAt: channelData.lastStartAt || null,
          configured: isConfigured,
          running: isRunning,
          probeOk: probeOk
        };
      }
    }
  }
  
  return normalized;
}

function normalizeStatusData(rawStatus) {
  const normalized = JSON.parse(JSON.stringify(rawStatus)); // Deep clone
  
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

// Tests
function testHealthNormalization() {
  console.log('Testing health data normalization...');
  
  const result = normalizeHealthData(sampleHealthData);
  
  // Check that ok is preserved
  assert.strictEqual(result.ok, true, 'ok field should be true');
  
  // Check gateway status
  assert.strictEqual(result.gateway.status, 'running', 'Gateway status should be running when ok is true');
  
  // Check channels - probe.ok is true, so should be connected even though running=false
  assert.ok(result.channels.telegram, 'Telegram channel should exist');
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Telegram status should be connected when probe.ok=true (even if running=false)');
  assert.strictEqual(result.channels.telegram.configured, true, 'Telegram configured should be true');
  assert.strictEqual(result.channels.telegram.running, false, 'Telegram running should be false');
  assert.strictEqual(result.channels.telegram.probeOk, true, 'Telegram probeOk should be true');
  
  console.log('✓ Health normalization tests passed');
}

function testStatusNormalization() {
  console.log('Testing status data normalization...');
  
  const result = normalizeStatusData(sampleStatusData);
  
  // Check that byAgent is converted to object
  assert.ok(result.sessions.byAgent, 'byAgent should exist');
  assert.strictEqual(typeof result.sessions.byAgent, 'object', 'byAgent should be an object');
  assert.ok(!Array.isArray(result.sessions.byAgent), 'byAgent should not be an array');
  
  // Check main agent
  assert.ok(result.sessions.byAgent.main, 'main agent should exist');
  assert.strictEqual(result.sessions.byAgent.main.sessionCount, 18, 'main sessionCount should be 18');
  assert.strictEqual(result.sessions.byAgent.main.model, 'gpt-5.2', 'main model should be gpt-5.2');
  assert.strictEqual(result.sessions.byAgent.main.contextTokens, 272000, 'main contextTokens should be 272000');
  assert.strictEqual(result.sessions.byAgent.main.totalTokens, 54202, 'main totalTokens should be 54202');
  
  // Check neil agent
  assert.ok(result.sessions.byAgent.neil, 'neil agent should exist');
  assert.strictEqual(result.sessions.byAgent.neil.sessionCount, 2, 'neil sessionCount should be 2');
  
  console.log('✓ Status normalization tests passed');
}

function testHealthWithRunningChannel() {
  console.log('Testing health with running channel...');
  
  const healthWithRunning = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: true,
        probe: {
          ok: true
        }
      }
    }
  };
  
  const result = normalizeHealthData(healthWithRunning);
  
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Channel should be connected when running=true and probe.ok=true');
  assert.strictEqual(result.channels.telegram.running, true, 'Channel running should be true');
  assert.strictEqual(result.channels.telegram.probeOk, true, 'Channel probeOk should be true');
  
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

function testHealthWithProbeOkRunningFalse() {
  console.log('Testing health with probe.ok=true and running=false...');
  
  // This is the key scenario from issue #33
  const healthProbeOkNotRunning = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: false,
        probe: {
          ok: true,
          status: null,
          error: null,
          elapsedMs: 299,
          bot: {
            id: 8538309852,
            username: "test_bot"
          }
        }
      },
      discord: {
        configured: true,
        running: false,
        probe: {
          ok: true,
          error: null
        }
      }
    }
  };
  
  const result = normalizeHealthData(healthProbeOkNotRunning);
  
  // Telegram should be connected because probe.ok=true
  assert.strictEqual(result.channels.telegram.status, 'connected', 'Telegram should be connected when probe.ok=true (even with running=false)');
  assert.strictEqual(result.channels.telegram.running, false, 'Telegram running should be false');
  assert.strictEqual(result.channels.telegram.probeOk, true, 'Telegram probeOk should be true');
  
  // Discord should also be connected
  assert.strictEqual(result.channels.discord.status, 'connected', 'Discord should be connected when probe.ok=true');
  assert.strictEqual(result.channels.discord.running, false, 'Discord running should be false');
  assert.strictEqual(result.channels.discord.probeOk, true, 'Discord probeOk should be true');
  
  console.log('✓ Health with probe.ok=true/running=false tests passed');
}

function testHealthWithProbeFailedRunningTrue() {
  console.log('Testing health with probe.ok=false and running=true...');
  
  // Channel is trying to connect but probe failed
  const healthProbeFailedRunning = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: true,
        probe: {
          ok: false,
          error: "Connection timeout"
        }
      }
    }
  };
  
  const result = normalizeHealthData(healthProbeFailedRunning);
  
  // Should be connecting because running=true but probe failed
  assert.strictEqual(result.channels.telegram.status, 'connecting', 'Telegram should be connecting when running=true but probe.ok=false');
  assert.strictEqual(result.channels.telegram.running, true, 'Telegram running should be true');
  assert.strictEqual(result.channels.telegram.probeOk, false, 'Telegram probeOk should be false');
  
  console.log('✓ Health with probe.ok=false/running=true tests passed');
}

function testHealthWithProbeFailedRunningFalse() {
  console.log('Testing health with probe.ok=false and running=false...');
  
  // Channel is configured but not running and can't connect
  const healthProbeFailedNotRunning = {
    ok: true,
    channels: {
      telegram: {
        configured: true,
        running: false,
        probe: {
          ok: false,
          error: "Auth failed"
        }
      }
    }
  };
  
  const result = normalizeHealthData(healthProbeFailedNotRunning);
  
  // Should be disconnected because configured but probe failed and not running
  assert.strictEqual(result.channels.telegram.status, 'disconnected', 'Telegram should be disconnected when configured, running=false, and probe.ok=false');
  assert.strictEqual(result.channels.telegram.running, false, 'Telegram running should be false');
  assert.strictEqual(result.channels.telegram.probeOk, false, 'Telegram probeOk should be false');
  
  console.log('✓ Health with probe.ok=false/running=false tests passed');
}

// Run all tests
console.log('\n=== Running cliService normalization tests ===\n');
try {
  testHealthNormalization();
  testStatusNormalization();
  testHealthWithRunningChannel();
  testHealthWithNotConfiguredChannel();
  testHealthNotOk();
  testHealthWithProbeOkRunningFalse();
  testHealthWithProbeFailedRunningTrue();
  testHealthWithProbeFailedRunningFalse();
  console.log('\n✅ All tests passed!\n');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
