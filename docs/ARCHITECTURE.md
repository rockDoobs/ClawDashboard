# ARCHITECTURE: ClawDashboard

*Created: 2026-02-17*
*Architect: Archie*
*Status: Ready for Implementation*

---

## Overview

ClawDashboard is a lightweight web application providing real-time visibility into OpenClaw agent activity, token consumption, and system health. It uses the OpenClaw CLI as its data source and exposes a REST API for agent skill integration.

**Key Design Decisions:**
- No database - data aggregated from CLI commands (stateless, simple)
- REST API first - enables agent skill integration
- Polling-based refresh - simpler than WebSockets for MVP
- Single VPS deployment - runs alongside OpenClaw

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (Vite)                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │AgentGrid│ │Health   │ │TokenCard│ │ErrorLog │ │Sessions │   │   │
│  │  │         │ │Panel    │ │         │ │         │ │Panel    │   │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │   │
│  │       │           │           │           │           │         │   │
│  │       └───────────┴───────────┴───────────┴───────────┘         │   │
│  │                               │                                  │   │
│  │                    Poll every 10s                               │   │
│  └───────────────────────────────┼──────────────────────────────────┘   │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │ HTTP/REST
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Dashboard Backend (Node.js)                         │
│                          Port: 3200                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Express REST API                            │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ /api/overview    → Combined dashboard data                 │  │   │
│  │  │ /api/agents      → Agent status + tokens                   │  │   │
│  │  │ /api/agents/:id  → Single agent details                    │  │   │
│  │  │ /api/health      → Gateway + channel health                │  │   │
│  │  │ /api/logs        → Recent errors/warnings                  │  │   │
│  │  │ /api/sessions    → Session list with details               │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                               │                                  │   │
│  │                    CLI Service Layer                            │   │
│  └───────────────────────────────┼──────────────────────────────────┘   │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │ child_process.exec()
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     OpenClaw CLI Commands                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ openclaw        │  │ openclaw        │  │ openclaw        │         │
│  │ status --json   │  │ health --json   │  │ logs --json     │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐                                                     │
│  │ openclaw        │                                                     │
│  │ sessions --json │                                                     │
│  └─────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Backend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 22+ | Matches OpenClaw stack, excellent async I/O |
| Framework | Express 4.x | Lightweight, well-documented, easy REST API |
| Process | PM2 | Production process manager, auto-restart |
| Validation | Zod | Type-safe schema validation (optional for MVP) |

### Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Build Tool | Vite 5.x | Fast dev server, optimized production builds |
| Framework | React 18+ | Component reusability, extensible for Phase 2+ |
| Styling | Tailwind CSS 3.x | Rapid UI development, consistent design |
| State | React useState/useEffect | Simple enough for MVP, no Redux needed |
| HTTP | Native fetch() | No axios dependency needed |

### Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Web Server | nginx | Reverse proxy, SSL termination |
| Process Manager | systemd + PM2 | Auto-start, restart on failure |
| OS | Ubuntu (existing VPS) | Runs alongside OpenClaw |

### Dependency Summary

```json
{
  "backend": {
    "express": "^4.18.x",
    "cors": "^2.8.x",
    "helmet": "^7.x"
  },
  "frontend": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "tailwindcss": "^3.4.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

---

## 3. Backend API Design

### Base URL

```
http://localhost:3200/api
```

### Endpoints

#### GET /api/overview

Combined dashboard data - single request for all widgets.

**Purpose:** Reduce API calls - frontend fetches everything in one request.

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
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
  "health": {
    "gateway": {
      "status": "running",
      "uptime": "2d 4h 32m",
      "version": "1.12.3"
    },
    "channels": {
      "telegram": "connected",
      "whatsapp": "connected"
    },
    "overall": "healthy"
  },
  "logs": [
    {
      "timestamp": "2026-02-17T15:00:00Z",
      "level": "error",
      "message": "API rate limit exceeded",
      "agent": "trevor"
    }
  ],
  "totals": {
    "agents": 6,
    "activeAgents": 2,
    "totalTokens": 892450,
    "totalSessions": 34
  }
}
```

---

#### GET /api/agents

All agents with status and token usage.

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
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
    },
    {
      "id": "archie",
      "name": "Archie",
      "emoji": "🏗️",
      "status": "idle",
      "model": "glm-5",
      "contextTokens": 204800,
      "inputTokens": 12000,
      "outputTokens": 800,
      "totalTokens": 12800,
      "percentUsed": 6,
      "sessions": 2,
      "lastActiveMs": 3600000,
      "lastActiveText": "1 hour ago"
    }
  ],
  "totals": {
    "agents": 6,
    "activeAgents": 2,
    "totalTokens": 892450,
    "totalSessions": 34
  }
}
```

**Status Logic:**
```
if (lastActiveMs < 300000)     → "working"  // 5 min
else if (recentError)          → "error"
else                           → "idle"
```

---

#### GET /api/agents/:id

Single agent details with session breakdown.

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
  "agent": {
    "id": "main",
    "name": "Doobs",
    "emoji": "🎯",
    "status": "working",
    "model": "glm-5",
    "contextTokens": 204800,
    "tokens": {
      "input": 548860,
      "output": 1136,
      "total": 137215,
      "percentUsed": 67
    },
    "sessions": [
      {
        "sessionKey": "main-session-1",
        "inputTokens": 45000,
        "outputTokens": 1200,
        "totalTokens": 46200,
        "lastActiveMs": 120000,
        "channel": "whatsapp"
      }
    ],
    "lastActiveMs": 551436,
    "lastActiveText": "9 min ago"
  }
}
```

---

#### GET /api/health

System health status.

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
  "gateway": {
    "status": "running",
    "uptime": "2d 4h 32m",
    "uptimeSeconds": 189120,
    "version": "1.12.3",
    "pid": 12345
  },
  "channels": {
    "telegram": {
      "status": "connected",
      "connectedAt": "2026-02-15T12:00:00Z"
    },
    "whatsapp": {
      "status": "connected",
      "connectedAt": "2026-02-15T12:00:00Z"
    }
  },
  "overall": "healthy",
  "indicators": {
    "gateway": "green",
    "channels": "green",
    "errors": "yellow"
  }
}
```

**Overall Status Logic:**
```
if (gateway !== "running") → "critical" (red)
else if (any channel disconnected) → "degraded" (yellow)
else if (recent errors > 5) → "warning" (yellow)
else → "healthy" (green)
```

---

#### GET /api/logs

Recent errors and warnings.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 10, max: 100)
- `level` (optional): Filter by level: `error`, `warn`, `all`
- `agent` (optional): Filter by agent ID

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
  "logs": [
    {
      "id": "log-001",
      "timestamp": "2026-02-17T15:00:00Z",
      "level": "error",
      "message": "API rate limit exceeded",
      "agent": "trevor",
      "session": "trevor-session-3",
      "stack": "Error: Rate limit..."
    },
    {
      "id": "log-002",
      "timestamp": "2026-02-17T14:45:00Z",
      "level": "warn",
      "message": "Slow response from model",
      "agent": "alana"
    }
  ],
  "summary": {
    "total": 42,
    "errors": 5,
    "warnings": 37
  }
}
```

---

#### GET /api/sessions

All sessions across all agents.

**Query Parameters:**
- `agent` (optional): Filter by agent ID
- `active` (optional): Only active sessions (true/false)

**Response:**
```json
{
  "timestamp": "2026-02-17T17:35:00Z",
  "sessions": [
    {
      "sessionKey": "main-session-1",
      "agentId": "main",
      "agentName": "Doobs",
      "model": "glm-5",
      "inputTokens": 45000,
      "outputTokens": 1200,
      "totalTokens": 46200,
      "lastActiveMs": 120000,
      "lastActiveText": "2 min ago",
      "channel": "whatsapp",
      "status": "active"
    }
  ],
  "totals": {
    "sessions": 34,
    "activeSessions": 12,
    "totalTokens": 892450
  }
}
```

---

### Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "CLI_ERROR",
    "message": "Failed to execute openclaw status",
    "details": "Command not found"
  },
  "timestamp": "2026-02-17T17:35:00Z"
}
```

**Error Codes:**
- `CLI_ERROR` - CLI command failed
- `PARSE_ERROR` - Failed to parse CLI output
- `NOT_FOUND` - Resource not found (e.g., invalid agent ID)
- `INTERNAL_ERROR` - Unexpected server error

---

## 4. Frontend Component Structure

### Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── ConnectionStatus
│   └── RefreshControls
│
├── Dashboard (main layout)
│   ├── OverviewBar
│   │   ├── TotalAgents
│   │   ├── TotalTokens
│   │   └── HealthBadge
│   │
│   ├── AgentGrid
│   │   └── AgentCard (×6)
│   │       ├── AgentHeader (name, emoji, status)
│   │       ├── TokenMeter (progress bar)
│   │       ├── TokenStats (in/out/total)
│   │       └── LastActive
│   │
│   ├── HealthPanel
│   │   ├── GatewayStatus
│   │   └── ChannelList
│   │
│   └── ErrorPanel
│       └── ErrorList
│           └── ErrorItem (×N)
│
└── AgentDetail (modal/expand)
    ├── SessionList
    └── TokenBreakdown
```

### File Structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── src/
    ├── main.jsx              # Entry point
    ├── App.jsx               # Root component
    ├── index.css             # Tailwind imports
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.jsx
    │   │   └── Dashboard.jsx
    │   │
    │   ├── agents/
    │   │   ├── AgentGrid.jsx
    │   │   ├── AgentCard.jsx
    │   │   └── AgentDetail.jsx
    │   │
    │   ├── health/
    │   │   ├── HealthPanel.jsx
    │   │   ├── GatewayStatus.jsx
    │   │   └── ChannelList.jsx
    │   │
    │   ├── logs/
    │   │   ├── ErrorPanel.jsx
    │   │   └── ErrorItem.jsx
    │   │
    │   └── common/
    │       ├── StatusBadge.jsx
    │       ├── TokenMeter.jsx
    │       └── RefreshControls.jsx
    │
    ├── hooks/
    │   ├── usePolling.js     # Polling logic
    │   └── useApi.js         # API fetch wrapper
    │
    ├── services/
    │   └── api.js            # API client
    │
    └── utils/
        ├── formatters.js     # Token formatting, time ago
        └── constants.js      # Status colors, thresholds
```

### Key Components

#### AgentCard.jsx

```jsx
// Visual representation of a single agent
// Props: agent (object from /api/agents)

<div className="agent-card">
  {/* Header: emoji, name, status badge */}
  <AgentHeader agent={agent} />
  
  {/* Token usage progress bar (0-100%) */}
  <TokenMeter percent={agent.percentUsed} />
  
  {/* Token stats: input/output/total */}
  <div className="token-stats">
    <span>In: {formatTokens(agent.inputTokens)}</span>
    <span>Out: {formatTokens(agent.outputTokens)}</span>
    <span>Total: {formatTokens(agent.totalTokens)}</span>
  </div>
  
  {/* Model info */}
  <div className="model-info">
    {agent.model} • {agent.sessions} sessions
  </div>
  
  {/* Last active */}
  <div className="last-active">
    {agent.lastActiveText}
  </div>
</div>
```

#### usePolling.js

```javascript
// Custom hook for polling API at interval
export function usePolling(fetchFn, intervalMs = 10000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const poll = async () => {
      try {
        const result = await fetchFn();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    poll(); // Initial fetch
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [fetchFn, intervalMs]);
  
  return { data, loading, error, refetch: () => poll() };
}
```

---

## 5. Data Flow Diagrams

### Request Flow

```
User Opens Dashboard
        │
        ▼
┌───────────────────┐
│ Initial Render    │
│ (loading state)   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     GET /api/overview
│ usePolling Hook   │───────────────────────┐
└────────┬──────────┘                        │
         │                                   ▼
         │                        ┌──────────────────┐
         │                        │ Express Router   │
         │                        └────────┬─────────┘
         │                                 │
         │                                 ▼
         │                        ┌──────────────────┐
         │                        │ CLI Service      │
         │                        │ (parallel exec)  │
         │                        └────────┬─────────┘
         │                                 │
         │              ┌──────────────────┼──────────────────┐
         │              │                  │                  │
         │              ▼                  ▼                  ▼
         │    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
         │    │ openclaw    │    │ openclaw    │    │ openclaw    │
         │    │ status      │    │ health      │    │ logs        │
         │    │ --json      │    │ --json      │    │ --json      │
         │    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
         │           │                  │                  │
         │           └──────────────────┴──────────────────┘
         │                              │
         │                              ▼
         │                    ┌──────────────────┐
         │                    │ Aggregate Data   │
         │                    │ Transform        │
         │                    └────────┬─────────┘
         │                             │
         │                             ▼
         │                    ┌──────────────────┐
         │◄───────────────────│ JSON Response    │
         │                    └──────────────────┘
         │
         ▼
┌───────────────────┐
│ Render Dashboard  │
│ (with data)       │
└────────┬──────────┘
         │
         │ (every 10s)
         │
         ▼
    [Repeat Poll]
```

### Agent Status Flow

```
openclaw status --json
        │
        ▼
┌───────────────────────────────────────┐
│ Raw CLI Output                         │
│ {                                      │
│   "sessions": {                        │
│     "byAgent": {                       │
│       "main": {                        │
│         "sessionCount": 12,            │
│         "inputTokens": 548860,         │
│         "outputTokens": 1136,          │
│         "totalTokens": 137215,         │
│         "lastActiveAgeMs": 551436      │
│       }                                │
│     }                                  │
│   }                                    │
│ }                                      │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ Transform Layer                        │
│ - Calculate status from lastActiveMs   │
│ - Format time ago text                 │
│ - Merge with agent metadata            │
│ - Calculate totals                     │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ API Response                           │
│ {                                      │
│   "id": "main",                        │
│   "name": "Doobs",                     │
│   "status": "working",                 │
│   "lastActiveText": "9 min ago",       │
│   ...                                  │
│ }                                      │
└───────────────────────────────────────┘
```

---

## 6. Deployment Strategy

### Directory Structure

```
/opt/clawdashboard/
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── routes/
│   │   │   ├── agents.js
│   │   │   ├── health.js
│   │   │   ├── logs.js
│   │   │   └── sessions.js
│   │   ├── services/
│   │   │   └── cli.js         # CLI execution wrapper
│   │   └── utils/
│   │       ├── transform.js   # Data transformation
│   │       └── formatters.js  # Output formatting
│   └── ecosystem.config.js    # PM2 config
│
├── frontend/
│   └── dist/                  # Built React app (served by nginx)
│
└── nginx/
    └── clawdashboard.conf     # nginx config
```

### systemd Service (Backend)

```ini
# /etc/systemd/system/clawdashboard.service
[Unit]
Description=ClawDashboard API Server
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/opt/clawdashboard/backend
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3200

[Install]
WantedBy=multi-user.target
```

### PM2 Alternative

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'clawdashboard-api',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3200
    }
  }]
};
```

### nginx Configuration

```nginx
# /etc/nginx/sites-available/clawdashboard.conf

server {
    listen 3210;
    server_name localhost;

    # Frontend (static files)
    location / {
        root /opt/clawdashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS for local development
        add_header Access-Control-Allow-Origin *;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3200/api/health;
    }
}
```

### Ports

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 3200 | Internal only (localhost) |
| nginx | 3210 | Public dashboard access |
| OpenClaw Gateway | 3100 | Existing (unchanged) |

### Deployment Commands

```bash
# Initial setup
sudo mkdir -p /opt/clawdashboard
sudo chown openclaw:openclaw /opt/clawdashboard

# Deploy backend
cd /opt/clawdashboard/backend
npm install --production
pm2 start ecosystem.config.js

# Build and deploy frontend
cd /opt/clawdashboard/frontend
npm install
npm run build

# Enable nginx
sudo ln -s /etc/nginx/sites-available/clawdashboard.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Implementation Notes for Neil

### Phase 1: Backend MVP (Priority Order)

1. **Setup Project**
   ```bash
   mkdir -p /opt/clawdashboard/backend/src/{routes,services,utils}
   cd /opt/clawdashboard/backend
   npm init -y
   npm install express cors helmet
   ```

2. **Create CLI Service** (`src/services/cli.js`)
   - Wrap `child_process.exec()` with Promise
   - Add timeout handling (5s default)
   - Parse JSON output safely
   - Handle CLI errors gracefully

3. **Implement Routes** (in order)
   - `GET /api/health` - Simplest, tests CLI integration
   - `GET /api/agents` - Core functionality
   - `GET /api/overview` - Aggregates health + agents
   - `GET /api/logs` - Error listing
   - `GET /api/sessions` - Session details

4. **Add Error Handling**
   - Global error handler middleware
   - Consistent error response format
   - Log errors to console (not to OpenClaw logs)

5. **Start Server**
   - Listen on port 3200
   - CORS enabled for development
   - Helmet for security headers

### Phase 2: Frontend MVP

1. **Setup Vite + React**
   ```bash
   npm create vite@latest frontend -- --template react
   cd frontend
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Configure Tailwind**
   ```javascript
   // tailwind.config.js
   export default {
     content: ['./index.html', './src/**/*.{js,jsx}'],
     theme: {
       extend: {
         colors: {
           'status-working': '#10B981',  // green
           'status-idle': '#6B7280',     // gray
           'status-error': '#EF4444',    // red
         }
       }
     }
   }
   ```

3. **Build Components** (in order)
   - `usePolling` hook - foundation for all data
   - `App.jsx` - basic layout
   - `AgentCard.jsx` - single agent display
   - `AgentGrid.jsx` - 6 agents in grid
   - `HealthPanel.jsx` - gateway status
   - `ErrorPanel.jsx` - recent errors
   - `RefreshControls.jsx` - manual refresh

4. **Polish UI**
   - Loading states
   - Error states
   - Responsive layout (mobile-friendly)
   - Dark mode (optional, Tailwind makes easy)

### Phase 3: Deployment

1. **Build Production Frontend**
   ```bash
   npm run build
   # Output: dist/ folder
   ```

2. **Configure nginx**
   - Copy config from above
   - Test with `sudo nginx -t`
   - Reload nginx

3. **Setup Process Management**
   - Either PM2 or systemd (PM2 recommended)
   - Enable auto-restart on boot

4. **Test End-to-End**
   - Open `http://localhost:3210`
   - Verify all agents appear
   - Check polling refreshes data
   - Verify error handling

### Key Implementation Details

#### CLI Service Timeout Handling

```javascript
// src/services/cli.js
import { exec } from 'child_process';

const CLI_TIMEOUT_MS = 5000;

export async function runCli(command) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`CLI command timed out: ${command}`));
    }, CLI_TIMEOUT_MS);

    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (error) {
        reject(new Error(`CLI error: ${error.message}`));
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        reject(new Error(`Failed to parse CLI output: ${parseError.message}`));
      }
    });
  });
}
```

#### Status Calculation

```javascript
// src/utils/status.js
const WORKING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function calculateStatus(lastActiveMs, hasRecentErrors) {
  if (hasRecentErrors) return 'error';
  if (lastActiveMs < WORKING_THRESHOLD_MS) return 'working';
  return 'idle';
}

export function formatTimeAgo(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
```

#### Token Formatting

```javascript
// src/utils/formatters.js
export function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
```

### Testing Checklist

- [ ] Backend starts without errors
- [ ] `/api/health` returns valid JSON
- [ ] `/api/agents` shows all 6 agents
- [ ] `/api/overview` combines data correctly
- [ ] Frontend loads and renders agents
- [ ] Polling updates data every 10s
- [ ] Manual refresh button works
- [ ] Error states display properly
- [ ] Mobile responsive layout works
- [ ] nginx serves frontend correctly
- [ ] API accessible through nginx proxy

### Future Enhancements (Post-MVP)

These are out of scope for initial implementation but noted for Phase 2+:

1. **WebSocket Support** - Real-time updates without polling
2. **Authentication** - Basic auth or OAuth for remote access
3. **Historical Data** - SQLite for time-series tracking
4. **Custom Alerts** - Configure thresholds for notifications
5. **Agent Progress** - Parse progress JSON from agent output

---

## ADR: Architecture Decision Records

### ADR-001: No Database for MVP

**Context:** Need to store and aggregate token usage over time.

**Decision:** Use CLI aggregation for MVP, no database.

**Rationale:**
- Simpler deployment (one less dependency)
- CLI provides real-time data
- Token tracking across sessions already available
- Can add SQLite later for historical charts

**Consequences:**
- No historical data beyond current sessions
- Cannot show usage trends over days/weeks
- Future enhancement: Add SQLite for Phase 2

---

### ADR-002: Polling over WebSockets

**Context:** Frontend needs to refresh data periodically.

**Decision:** Use HTTP polling (10s interval) for MVP.

**Rationale:**
- Simpler implementation (no WebSocket server)
- Sufficient for dashboard use case
- Easy to implement with React hooks
- Can upgrade to WebSockets later

**Consequences:**
- Slight delay in updates (up to 10s)
- More HTTP requests than WebSockets
- Acceptable for monitoring dashboard

---

### ADR-003: Express over Fastify/Fastify

**Context:** Need a Node.js web framework for REST API.

**Decision:** Use Express 4.x for backend.

**Rationale:**
- Most widely used, best documented
- Team familiarity
- Sufficient performance for expected load
- Large ecosystem of middleware

**Consequences:**
- Slightly slower than Fastify (negligible for this use case)
- Well-known patterns for Neil to follow

---

### ADR-004: React over Vue/Vanilla

**Context:** Need frontend framework for component-based UI.

**Decision:** Use React 18 with Vite.

**Rationale:**
- Component reusability for 6 agent cards
- Extensible for Phase 2+ enhancements
- Vite provides fast dev experience
- Large ecosystem, well-documented

**Consequences:**
- Slightly more complex than vanilla JS
- Better long-term maintainability
- Easy to add charts/libraries later

---

## Summary

ClawDashboard is designed for simplicity and extensibility:

- **Backend**: Lightweight Express API that wraps OpenClaw CLI
- **Frontend**: React dashboard with polling updates
- **Deployment**: nginx + PM2 on existing VPS
- **Data Flow**: CLI → API → Frontend (stateless, no database)

Neil can implement this in phases, starting with backend routes and building up to the full UI. The architecture supports future enhancements (WebSockets, database, auth) without requiring major refactoring.

---

*Ready for implementation. Questions? Ask Archie.*
