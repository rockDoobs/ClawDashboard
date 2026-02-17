# ClawDashboard Backend

REST API for OpenClaw monitoring dashboard. Aggregates data from OpenClaw CLI commands.

## Quick Start

```bash
# Navigate to backend
cd /home/openclaw/.openclaw/workspace/POC/ClawDashboard/backend

# Install dependencies
npm install

# Start server
npm start
```

Server runs on **port 3200** by default.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
| `GET /health` | Health check |
| `GET /api/overview` | Combined dashboard data |
| `GET /api/agents` | All agents + tokens |
| `GET /api/agents/:id` | Single agent details |
| `GET /api/health` | Gateway + channels |
| `GET /api/logs` | Recent errors |
| `GET /api/sessions` | Session list |

### Query Parameters

**GET /api/logs**
- `limit` - Number of logs (default: 10, max: 100)
- `level` - Filter: `error`, `warn`, `all`
- `agent` - Filter by agent ID

**GET /api/sessions**
- `agent` - Filter by agent ID
- `active` - Only active sessions (`true`)

## Testing via SSH

Since you're accessing via SSH + Tailscale, test with curl:

### Basic Tests

```bash
# Check server is running
curl http://localhost:3200/health

# Get all agents
curl http://localhost:3200/api/agents

# Get overview (combined data)
curl http://localhost:3200/api/overview | jq

# Get health status
curl http://localhost:3200/api/health

# Get recent logs
curl http://localhost:3200/api/logs?limit=5

# Get sessions
curl http://localhost:3200/api/sessions

# Get single agent (e.g., main)
curl http://localhost:3200/api/agents/main
```

### Pretty JSON Output

```bash
# Install jq if needed
sudo apt install jq -y

# Pretty print responses
curl -s http://localhost:3200/api/overview | jq
```

### Test Error Handling

```bash
# Should return 404
curl http://localhost:3200/api/nonexistent

# Should return agent not found
curl http://localhost:3200/api/agents/invalid-id
```

## Running with PM2 (Production)

```bash
# Install PM2 if needed
sudo npm install -g pm2

# Start with PM2
pm2 start server.js --name clawdashboard

# View logs
pm2 logs clawdashboard

# Restart
pm2 restart clawdashboard

# Stop
pm2 stop clawdashboard

# Save PM2 config (auto-start on reboot)
pm2 save
pm2 startup
```

## Tailscale Access

With Tailscale running, access the API from any device on your tailnet:

```bash
# From another machine on Tailscale
curl http://YOUR_TAILSCALE_IP:3200/api/overview

# Or use Tailscale hostname
curl http://YOUR_HOSTNAME:3200/api/overview
```

### Expose via Tailscale Serve (Optional)

```bash
# Expose port 3200 to tailnet
tailscale serve --bg --https=443 tcp://localhost:3200

# Then access via
curl https://YOUR_TAILSCALE_NAME.ts.net/api/overview
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3200 | Server port |
| `NODE_ENV` | development | Environment |

```bash
# Run on different port
PORT=3300 npm start
```

## File Structure

```
backend/
├── package.json          # Dependencies
├── server.js             # Main server entry
├── routes/
│   ├── overview.js       # Combined data endpoint
│   ├── agents.js         # Agent endpoints
│   ├── health.js         # Health endpoint
│   ├── logs.js           # Logs endpoint
│   └── sessions.js       # Sessions endpoint
├── services/
│   └── cliService.js     # CLI wrapper + utilities
└── README.md             # This file
```

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :3200

# Kill any existing process
kill -9 $(lsof -t -i:3200)
```

### CLI commands fail
```bash
# Test OpenClaw CLI directly
openclaw status --json
openclaw health --json

# Check OpenClaw is running
openclaw gateway status
```

### Empty responses
```bash
# Check OpenClaw gateway is running
openclaw gateway status

# Check for sessions
openclaw sessions --json
```

## Response Format

All successful responses include a `timestamp` field:

```json
{
  "timestamp": "2026-02-17T18:00:00.000Z",
  "data": { ... }
}
```

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "Technical details (dev mode only)"
  },
  "timestamp": "2026-02-17T18:00:00.000Z"
}
```

## Next Steps

1. Start the server: `npm start`
2. Test endpoints with curl
3. Connect frontend (coming next)
4. Set up PM2 for production
5. Configure Tailscale access
