/**
 * Agents Router
 * 
 * GET /api/agents - All agents with status and tokens
 * GET /api/agents/:id - Single agent details
 */

const express = require('express');
const router = express.Router();
const cliService = require('../services/cliService');

/**
 * GET /api/agents
 * All agents with status and token usage
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const statusData = await cliService.getStatus();
    
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

    // Sort by status (working first) then by name
    agents.sort((a, b) => {
      if (a.status === 'working' && b.status !== 'working') return -1;
      if (a.status !== 'working' && b.status === 'working') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      timestamp,
      agents,
      totals: {
        agents: agents.length,
        activeAgents,
        totalTokens,
        totalSessions
      }
    });

  } catch (error) {
    console.error('Agents error:', error);
    res.status(500).json({
      error: {
        code: 'CLI_ERROR',
        message: 'Failed to get agent data',
        details: error.message
      },
      timestamp
    });
  }
});

/**
 * GET /api/agents/:id
 * Single agent details with session breakdown
 */
router.get('/:id', async (req, res) => {
  const timestamp = new Date().toISOString();
  const agentId = req.params.id;
  
  try {
    const [statusData, sessionsData] = await Promise.all([
      cliService.getStatus(),
      cliService.getSessions()
    ]);

    // Find the agent
    const agentStats = statusData?.sessions?.byAgent?.[agentId];
    if (!agentStats) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Agent not found: ${agentId}`
        },
        timestamp
      });
    }

    const metadata = cliService.getAgentMetadata(agentId);
    const tokens = agentStats.totalTokens || 0;
    const contextTokens = agentStats.contextTokens || 204800;
    const lastActiveMs = agentStats.lastActiveAgeMs || Infinity;

    // Get sessions for this agent
    const agentSessions = [];
    if (sessionsData?.sessions && Array.isArray(sessionsData.sessions)) {
      sessionsData.sessions
        .filter(s => s.agentId === agentId)
        .forEach(session => {
          agentSessions.push({
            sessionKey: session.sessionKey,
            inputTokens: session.inputTokens || 0,
            outputTokens: session.outputTokens || 0,
            totalTokens: session.totalTokens || 0,
            lastActiveMs: session.lastActiveAgeMs || Infinity,
            lastActiveText: cliService.formatTimeAgo(session.lastActiveAgeMs),
            channel: session.channel || 'unknown',
            status: cliService.calculateStatus(session.lastActiveAgeMs)
          });
        });
    }

    res.json({
      timestamp,
      agent: {
        id: agentId,
        name: metadata.name,
        emoji: metadata.emoji,
        status: cliService.calculateStatus(lastActiveMs),
        model: agentStats.model || 'glm-5',
        contextTokens: contextTokens,
        tokens: {
          input: agentStats.inputTokens || 0,
          output: agentStats.outputTokens || 0,
          total: tokens,
          percentUsed: cliService.calculatePercentUsed(tokens, contextTokens)
        },
        sessions: agentSessions,
        lastActiveMs: lastActiveMs,
        lastActiveText: cliService.formatTimeAgo(lastActiveMs)
      }
    });

  } catch (error) {
    console.error('Agent detail error:', error);
    res.status(500).json({
      error: {
        code: 'CLI_ERROR',
        message: `Failed to get agent data for ${agentId}`,
        details: error.message
      },
      timestamp
    });
  }
});

module.exports = router;
