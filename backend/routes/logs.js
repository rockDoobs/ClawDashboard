/**
 * Logs Router
 * 
 * GET /api/logs - Recent errors and warnings
 */

const express = require('express');
const router = express.Router();
const cliService = require('../services/cliService');

/**
 * GET /api/logs
 * Recent errors and warnings
 * 
 * Query params:
 * - limit: Number of logs to return (default: 10, max: 100)
 * - level: Filter by level: 'error', 'warn', 'all'
 * - agent: Filter by agent ID
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const level = req.query.level || 'all';
  const agentFilter = req.query.agent;

  try {
    const logsArray = await cliService.getLogs();

    let logs = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    // Handle NDJSON array from CLI (each line is a separate object)
    if (Array.isArray(logsArray)) {
      // Filter for log entries only (skip meta entries)
      const logEntries = logsArray.filter(entry => entry.type === 'log');
      
      // Count totals
      logEntries.forEach(log => {
        if (log.level === 'error') totalErrors++;
        if (log.level === 'warn') totalWarnings++;
      });

      // Filter logs
      logs = logEntries
        .filter(log => {
          // Level filter
          if (level !== 'all' && log.level !== level) return false;
          // Agent filter (extract from raw if available)
          const agent = log.agent || (log.raw ? JSON.parse(log.raw).agent : null);
          if (agentFilter && agent !== agentFilter) return false;
          return true;
        })
        .slice(0, limit)
        .map((log, index) => ({
          id: `log-${String(index + 1).padStart(3, '0')}`,
          timestamp: log.time || log.timestamp,
          level: log.level,
          message: log.message,
          agent: log.agent || null,
          session: log.session || null,
          stack: log.stack || null,
          raw: log.raw || null
        }));
    }

    res.json({
      timestamp,
      logs,
      summary: {
        total: totalErrors + totalWarnings,
        errors: totalErrors,
        warnings: totalWarnings
      }
    });

  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({
      error: {
        code: 'CLI_ERROR',
        message: 'Failed to get logs',
        details: error.message
      },
      timestamp,
      logs: [],
      summary: { total: 0, errors: 0, warnings: 0 }
    });
  }
});

module.exports = router;
