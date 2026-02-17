/**
 * Health Router
 * 
 * GET /api/health - Gateway + channel health
 */

const express = require('express');
const router = express.Router();
const cliService = require('../services/cliService');

/**
 * GET /api/health
 * System health status
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const healthData = await cliService.getHealth();

    // Process gateway status
    const gateway = {
      status: healthData?.gateway?.status || 'unknown',
      uptime: healthData?.gateway?.uptime || 'N/A',
      uptimeSeconds: healthData?.gateway?.uptimeSeconds || 0,
      version: healthData?.gateway?.version || 'N/A',
      pid: healthData?.gateway?.pid || null
    };

    // Process channels
    const channels = {};
    if (healthData?.channels) {
      for (const [channelName, channelData] of Object.entries(healthData.channels)) {
        if (typeof channelData === 'string') {
          channels[channelName] = {
            status: channelData,
            connectedAt: null
          };
        } else {
          channels[channelName] = {
            status: channelData.status || 'unknown',
            connectedAt: channelData.connectedAt || null
          };
        }
      }
    }

    // Calculate overall status and indicators
    let overall = 'healthy';
    const indicators = {
      gateway: 'green',
      channels: 'green',
      errors: 'green'
    };

    // Check gateway
    if (gateway.status !== 'running') {
      overall = 'critical';
      indicators.gateway = 'red';
    }

    // Check channels
    const channelStatuses = Object.values(channels).map(c => c.status);
    if (channelStatuses.some(s => s === 'disconnected' || s === 'error')) {
      if (overall !== 'critical') overall = 'degraded';
      indicators.channels = 'yellow';
    } else if (channelStatuses.some(s => s === 'connecting')) {
      if (overall !== 'critical') overall = 'degraded';
      indicators.channels = 'yellow';
    }

    res.json({
      timestamp,
      gateway,
      channels,
      overall,
      indicators
    });

  } catch (error) {
    console.error('Health error:', error);
    res.status(500).json({
      error: {
        code: 'CLI_ERROR',
        message: 'Failed to get health data',
        details: error.message
      },
      timestamp,
      gateway: { status: 'error' },
      channels: {},
      overall: 'critical',
      indicators: { gateway: 'red', channels: 'unknown', errors: 'unknown' }
    });
  }
});

module.exports = router;
