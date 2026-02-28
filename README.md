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
│   ├── server.js       # Express REST API
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

### Option 1: Development Mode (Recommended for Testing)

```bash
# Terminal 1: Start backend
cd backend
npm install
node server.js

# Terminal 2: Start frontend
cd frontend
npm install
cp .env.example .env   # optional: set VITE_API_BASE_URL for non-default API target
npm run dev
```

Then open http://localhost:5173 in your browser.

Notes:
- By default, frontend uses same-origin `/api` and Vite proxies `/api` to `http://localhost:3200` in dev.
- To point frontend at another backend, set `VITE_API_BASE_URL` in `frontend/.env`.

### Option 2: Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve with nginx (see Deployment section below)
```

---

## Testing via SSH

Since you access the server via SSH (no browser), use `curl` to test.

### Start the Server

```bash
cd backend
node server.js
```

You should see:
```
🚀 ClawDashboard API running on port 3200
📡 API available at http://localhost:3200/api
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

## Access via Tailscale

If you have Tailscale running on your server, you can access the API from any device on your tailnet.

### Option A: Direct Port Access

```bash
# From another machine on your Tailscale network
curl http://YOUR_SERVER_TAILSCALE_IP:3200/api/overview

# Find your Tailscale IP
tailscale ip
```

### Option B: Tailscale Serve (HTTPS, single-origin frontend + API)

This is the recommended setup for the dashboard UI. Serve frontend and backend under one hostname to avoid CORS issues.

```bash
# 1) Build and run frontend preview
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4173

# 2) Run backend
cd ../backend
node server.js

# 3) Expose both on one Tailscale origin
tailscale serve --bg / http://127.0.0.1:4173
tailscale serve --bg /api http://127.0.0.1:3200
tailscale serve --bg /health http://127.0.0.1:3200

# 4) Access from any device on tailnet
# https://YOUR_HOSTNAME.ts.net
# (frontend will call /api on the same origin)

# To remove serve config later
tailscale serve reset
```

Optional: If frontend is hosted elsewhere, set `frontend/.env` with `VITE_API_BASE_URL=https://YOUR_HOSTNAME.ts.net` before building.

---

## Production Deployment

### Run with PM2

PM2 keeps the server running and auto-restarts on failure.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
cd /home/openclaw/.openclaw/workspace/POC/ClawDashboard/backend
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

### Check Status

```bash
pm2 status
pm2 logs clawdashboard --lines 50
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
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

---

## Related

- **GitHub Issues:** #25, #26, #27, #28, #29 (Mission Control)
- **Mission Control:** https://github.com/rockDoobs/MissionControl
- **This Repo:** https://github.com/rockDoobs/ClawDashboard

---

## Agent Credits

Built by:
- **Alana** - Requirements & PRD
- **Archie** - Architecture
- **Neil** - Implementation
- **Tessa** - Testing (coming soon)

---

## Next Steps

- [ ] Build frontend (React)
- [ ] Add WebSocket for real-time updates
- [ ] Add authentication
- [ ] Deploy behind nginx
