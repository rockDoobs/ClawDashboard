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
    // Get both health and status for comprehensive info
    const [healthData, statusData] = await Promise.all([
      cliService.getHealth().catch(e => {
        console.error('Failed to get health:', e.message);
        return null;
      }),
      cliService.getStatus().catch(e => {
        console.error('Failed to get status:', e.message);
        return null;
      })
    ]);

    // Process gateway status - prefer status command data
    const gateway = {
      status: 'unknown',
      uptime: 'N/A',
      uptimeSeconds: 0,
      version: 'N/A',
      pid: null
    };
    
    // Extract gateway info from status if available
    if (statusData?.gateway) {
      if (statusData.gateway.reachable === true) {
        gateway.status = 'running';
      } else if (statusData.gateway.reachable === false) {
        gateway.status = 'stopped';
      }
      if (statusData.gateway.self?.version) {
        gateway.version = statusData.gateway.self.version;
      }
    } else if (healthData?.gateway) {
      // Fallback to health data
      gateway.status = healthData.gateway.status || 'unknown';
      gateway.version = healthData.gateway.version || 'N/A';
    }
    
    // If health.ok is true, gateway should be running
    if (healthData?.ok && gateway.status === 'unknown') {
      gateway.status = 'running';
    }

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
    } else if (channelStatuses.some(s => s === 'connecting' || s === 'not_configured')) {
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
