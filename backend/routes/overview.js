/**
 * Overview Router
 * 
 * GET /api/overview - Combined dashboard data
 * Aggregates all data into single response for frontend
 */

const express = require('express');
const router = express.Router();
const cliService = require('../services/cliService');

/**
 * GET /api/overview
 * Combined dashboard data - single request for all widgets
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    // Fetch all data in parallel for performance
    const [statusData, healthData, logsData, sessionsData] = await Promise.all([
      cliService.getStatus().catch(e => {
        console.error('Failed to get status:', e.message);
        return null;
      }),
      cliService.getHealth().catch(e => {
        console.error('Failed to get health:', e.message);
        return null;
      }),
      cliService.getLogs().catch(e => {
        console.error('Failed to get logs:', e.message);
        return null;
      }),
      cliService.getSessions().catch(e => {
        console.error('Failed to get sessions:', e.message);
        return null;
      })
    ]);

    // Process agents data
    const agents = [];
    let totalTokens = 0;
    let totalSessions = 0;
    let activeAgents = 0;

    if (statusData?.sessions?.byAgent) {
      for (const [agentId, agentData] of Object.entries(statusData.sessions.byAgent)) {
        const metadata = cliService.getAgentMetadata(agentId);
        const tokens = agentData.totalTokens || 0;
        const contextTokens = agentData.contextTokens || 204800;
        const lastActiveMs = agentData.lastActiveAgeMs || Infinity;
        const status = cliService.calculateStatus(lastActiveMs);
        
        if (status === 'working') activeAgents++;
        totalTokens += tokens;
        totalSessions += agentData.sessionCount || 0;

        agents.push({
          id: agentId,
          name: metadata.name,
          emoji: metadata.emoji,
          status: status,
          model: agentData.model || 'glm-5',
          contextTokens: contextTokens,
          inputTokens: agentData.inputTokens || 0,
          outputTokens: agentData.outputTokens || 0,
          totalTokens: tokens,
          percentUsed: cliService.calculatePercentUsed(tokens, contextTokens),
          sessions: agentData.sessionCount || 0,
          lastActiveMs: lastActiveMs,
          lastActiveText: cliService.formatTimeAgo(lastActiveMs)
        });
      }
    }

    // Process health data
    const health = {
      gateway: {
        status: healthData?.gateway?.status || 'unknown',
        uptime: healthData?.gateway?.uptime || 'N/A',
        version: healthData?.gateway?.version || 'N/A'
      },
      channels: {},
      overall: 'unknown'
    };

    if (healthData?.channels) {
      for (const [channelName, channelData] of Object.entries(healthData.channels)) {
        health.channels[channelName] = typeof channelData === 'string' 
          ? channelData 
          : channelData.status || 'unknown';
      }
    }

    // Calculate overall health
    const channelStatuses = Object.values(health.channels);
    if (health.gateway.status === 'running' && channelStatuses.every(s => s === 'connected')) {
      health.overall = 'healthy';
    } else if (health.gateway.status === 'running') {
      health.overall = 'degraded';
    } else {
      health.overall = 'critical';
    }

    // Process logs (errors only, limited)
    const logs = [];
    if (Array.isArray(logsData)) {
      logsData
        .filter(entry => entry.type === 'log' && entry.level === 'error')
        .slice(0, 5)
        .forEach(log => {
          logs.push({
            timestamp: log.time || log.timestamp,
            level: log.level,
            message: log.message,
            agent: log.agent
          });
        });
    }

    // Build response
    const response = {
      timestamp,
      agents,
      health,
      logs,
      totals: {
        agents: agents.length,
        activeAgents,
        totalTokens,
        totalSessions
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to aggregate overview data',
        details: error.message
      },
      timestamp
    });
  }
});

module.exports = router;
