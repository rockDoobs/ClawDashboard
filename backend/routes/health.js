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
            connectedAt: channelData.connectedAt || null,
            configured: channelData.configured || false,
            running: channelData.running || false,
            probeOk: channelData.probeOk || false
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
    // Channels with probeOk=true are considered healthy even if not running
    // Channels with probeOk=false and configured=true are disconnected (problem)
    const channelList = Object.values(channels);
    const hasDisconnected = channelList.some(c => c.status === 'disconnected' || c.status === 'error');
    const hasConnecting = channelList.some(c => c.status === 'connecting');
    const hasNotConfigured = channelList.some(c => c.status === 'not_configured');
    const hasProbeOkNotRunning = channelList.some(c => c.probeOk && !c.running);

    if (hasDisconnected) {
      // Configured but can't connect - this is a problem
      if (overall !== 'critical') overall = 'degraded';
      indicators.channels = 'yellow';
    } else if (hasConnecting) {
      // Still trying to connect
      if (overall !== 'critical') overall = 'degraded';
      indicators.channels = 'yellow';
    } else if (hasProbeOkNotRunning) {
      // Connected but listener not running - minor degradation
      if (overall === 'healthy') overall = 'degraded';
      indicators.channels = 'yellow';
    } else if (hasNotConfigured) {
      // Not configured - informational, not necessarily degraded
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
