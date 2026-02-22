# ClawDashboard

Agent Dashboard for OpenClaw - Monitor your agent team in real-time.

## Overview

A web-based dashboard for monitoring OpenClaw agents, tracking token usage, and viewing system health.

## Features

- **Agent Status Overview** - See all 6 agents at a glance
- **Token Usage Tracking** - Monitor token consumption per agent
- **Model Information** - View which models are being used
- **System Health** - Gateway status, recent errors, channel health

## Project Structure

```
ClawDashboard/
├── README.md           # This file
├── docs/
│   ├── ARCHITECTURE.md # System architecture (by Archie)
│   └── PRD-agent-dashboard.md # Requirements (by Alana)
├── backend/
│   ├── server.js       # Express REST API (also serves frontend in prod)
│   ├── routes/         # API endpoints
│   └── services/       # CLI wrapper
├── frontend/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   ├── services/   # API client
│   │   └── utils/      # Utilities
│   └── package.json
└── tests/
    └── TEST-RESULTS.md # Test results (by Tessa)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- OpenClaw CLI installed and configured
- Access to the VPS via SSH

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Running the Dashboard

### Option 1: Development Mode (with Hot Reload)

Run frontend and backend separately. Vite proxies `/api` calls to the backend automatically.

```bash
# Terminal 1: Start backend
cd backend
npm install
node server.js

# Terminal 2: Start frontend dev server
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

The Vite dev server proxies `/api/*` requests to `http://localhost:3200`.

### Option 2: Production Mode (Single Server)

Build the frontend and serve everything from a single Express server:

```bash
# Build frontend
cd frontend
npm run build

# Start server (serves both API and frontend)
cd ../backend
node server.js
```

Then open http://localhost:3200 in your browser.

The Express server:
- Serves the API at `/api/*`
- Serves the frontend static files at `/*`
- Falls back to `index.html` for SPA routing

---

## Production Deployment with Tailscale Serve

This setup lets you access the dashboard securely from anywhere on your Tailscale network via HTTPS.

### Step 1: Build and Start the Server

```bash
# SSH into your VPS
ssh your-user@your-vps

# Clone or navigate to the repo
cd /path/to/ClawDashboard

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build frontend for production
npm run build

# Go back to backend
cd ../backend

# Start with PM2 (keeps running after disconnect)
pm2 start server.js --name clawdashboard
pm2 save
```

### Step 2: Expose via Tailscale Serve

```bash
# Check your Tailscale hostname
tailscale status

# Expose the dashboard via HTTPS on your tailnet
tailscale serve --bg --https:443 tcp://localhost:3200

# Or use a specific funnel port (if you want public access)
# tailscale funnel --bg --https:443 tcp://localhost:3200
```

### Step 3: Access from Any Device

On any device on your Tailscale network:

```
https://your-hostname.ts.net
```

### Managing Tailscale Serve

```bash
# Check current serve config
tailscale serve status

# Remove the serve config
tailscale serve --bg=none tcp://localhost:3203

# Or reset all serve configs
tailscale serve reset
```

### Server Management with PM2

```bash
# View logs
pm2 logs clawdashboard

# Restart after updates
pm2 restart clawdashboard

# Stop
pm2 stop clawdashboard

# Auto-start on boot
pm2 startup
pm2 save
```

---

## Testing via SSH (API Only)

Since you access the server via SSH (no browser), use `curl` to test the API directly.

### Start the Server

```bash
cd backend
node server.js
```

You should see:
```
🚀 ClawDashboard running on port 3200
📡 API available at http://localhost:3200/api
🌐 Frontend available at http://localhost:3200
```

### Test Endpoints (in another SSH session)

```bash
# Health check
curl http://localhost:3200/health

# All agents with token usage
curl http://localhost:3200/api/agents

# Combined overview (all data in one call)
curl http://localhost:3200/api/overview

# System health (gateway + channels)
curl http://localhost:3200/api/health

# Recent logs/errors
curl http://localhost:3200/api/logs

# Session details
curl http://localhost:3200/api/sessions
```

### Pretty JSON Output

```bash
# Install jq if needed
sudo apt install jq -y

# Pretty print responses
curl -s http://localhost:3200/api/agents | jq
curl -s http://localhost:3200/api/overview | jq
```

### Stop the Server

Press `Ctrl+C` in the terminal running the server, or:

```bash
pkill -f "node.*ClawDashboard"
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Frontend (production) or API info (dev) |
| `GET /health` | Health check |
| `GET /api/overview` | Combined dashboard data |
| `GET /api/agents` | All agents + tokens |
| `GET /api/agents/:id` | Single agent details |
| `GET /api/health` | Gateway + channel status |
| `GET /api/logs` | Recent errors |
| `GET /api/sessions` | Session list |

### Example Response: GET /api/agents

```json
{
  "timestamp": "2026-02-17T18:00:00.000Z",
  "agents": [
    {
      "id": "main",
      "name": "Doobs",
      "emoji": "🎯",
      "status": "working",
      "model": "glm-5",
      "contextTokens": 204800,
      "inputTokens": 548860,
      "outputTokens": 1136,
      "totalTokens": 137215,
      "percentUsed": 67,
      "sessions": 12,
      "lastActiveMs": 551436,
      "lastActiveText": "9 min ago"
    }
  ],
  "totals": {
    "agents": 6,
    "activeAgents": 2,
    "totalTokens": 250000,
    "totalSessions": 15
  }
}
```

---

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :3200

# Kill any existing process
kill -9 $(lsof -t -i:3200)

# Try again
node server.js
```

### Frontend not loading in production

```bash
# Ensure frontend is built
cd frontend
npm run build

# Check dist folder exists
ls -la dist/

# Restart server
cd ../backend
pm2 restart clawdashboard
```

### CLI commands fail

```bash
# Test OpenClaw CLI directly
openclaw status --json
openclaw health --json

# Check gateway is running
openclaw gateway status
```

### Empty responses

```bash
# Ensure OpenClaw gateway is running
openclaw gateway status

# Check for sessions
openclaw sessions --json
```

### Tailscale Serve not working

```bash
# Check Tailscale status
tailscale status

# Check serve config
tailscale serve status

# Reset and reconfigure
tailscale serve reset
tailscale serve --bg --https:443 tcp://localhost:3200
```

---

## Related

- **GitHub Issues:** #25, #26, #27, #28, #29, #32 (Mission Control)
- **Mission Control:** https://github.com/rockDoobs/MissionControl
- **This Repo:** https://github.com/rockDoobs/ClawDashboard

---

## Agent Credits

Built by:
- **Alana** - Requirements & PRD
- **Archie** - Architecture
- **Neil** - Implementation
- **Tessa** - Testing

---

## Next Steps

- [x] Build frontend (React)
- [x] Tailscale Serve deployment
- [ ] Add WebSocket for real-time updates
- [ ] Add authentication
- [ ] Deploy behind nginx (alternative)
