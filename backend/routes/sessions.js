/**
 * Sessions Router
 * 
 * GET /api/sessions - Session list with details
 */

const express = require('express');
const router = express.Router();
const cliService = require('../services/cliService');

/**
 * GET /api/sessions
 * All sessions across all agents
 * 
 * Query params:
 * - agent: Filter by agent ID
 * - active: Only active sessions (true/false)
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  const agentFilter = req.query.agent;
  const activeOnly = req.query.active === 'true';

  try {
    const sessionsData = await cliService.getSessions();

    let sessions = [];
    let totalTokens = 0;
    let activeSessions = 0;

    if (sessionsData?.sessions && Array.isArray(sessionsData.sessions)) {
      sessions = sessionsData.sessions
        .filter(session => {
          // Agent filter
          if (agentFilter && session.agentId !== agentFilter) return false;
          
          // Active filter
          if (activeOnly) {
            const lastActiveMs = session.lastActiveAgeMs || Infinity;
            const status = cliService.calculateStatus(lastActiveMs);
            if (status !== 'working') return false;
          }
          
          return true;
        })
        .map(session => {
          const metadata = cliService.getAgentMetadata(session.agentId);
          const lastActiveMs = session.lastActiveAgeMs || Infinity;
          const status = cliService.calculateStatus(lastActiveMs);
          const tokens = session.totalTokens || 0;
          
          totalTokens += tokens;
          if (status === 'working') activeSessions++;

          return {
            sessionKey: session.sessionKey,
            agentId: session.agentId,
            agentName: metadata.name,
            model: session.model || 'glm-5',
            inputTokens: session.inputTokens || 0,
            outputTokens: session.outputTokens || 0,
            totalTokens: tokens,
            lastActiveMs: lastActiveMs,
            lastActiveText: cliService.formatTimeAgo(lastActiveMs),
            channel: session.channel || 'unknown',
            status: status
          };
        });

      // Sort by last active (most recent first)
      sessions.sort((a, b) => a.lastActiveMs - b.lastActiveMs);
    }

    res.json({
      timestamp,
      sessions,
      totals: {
        sessions: sessions.length,
        activeSessions,
        totalTokens
      }
    });

  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({
      error: {
        code: 'CLI_ERROR',
        message: 'Failed to get sessions data',
        details: error.message
      },
      timestamp,
      sessions: [],
      totals: { sessions: 0, activeSessions: 0, totalTokens: 0 }
    });
  }
});

module.exports = router;
