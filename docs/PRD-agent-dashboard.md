# PRD: OpenClaw Agent Dashboard
*Created: 2026-02-17*
*Author: Alana (Business Analyst Agent)*
*Status: Updated - Ready for Architecture*
*Updated: 2026-02-17 17:10 UTC*

---

## Background

The user operates an OpenClaw system with 6 specialized agents working collaboratively:
- **Doobs** - Main orchestrator/coordinator
- **Alana** - Business analyst (requirements, PRDs)
- **Archie** - Solution architect
- **Neil** - Coder/developer
- **Tessa** - Tester
- **Trevor** - Researcher

Currently, there's no unified view to monitor what these agents are doing, how they're performing, or the resources they're consuming.

## Problem Statement

**There is no centralized way to see what each agent is doing at any given moment.** Users lack visibility into agent activity, resource consumption, and system health.

---

## Solution Overview

A **separate web application** with a **REST API backend** that can be called from agent skills. The dashboard will use OpenClaw's existing CLI commands to gather data.

---

## Data Sources Confirmed ✅

### Available via CLI (JSON output)

| Data | Command | What's Available |
|------|---------|------------------|
| **Agent Status** | `openclaw status --json` | All 6 agents, session counts, last active |
| **Token Usage** | `openclaw status --json` | inputTokens, outputTokens, totalTokens per session |
| **Model Info** | `openclaw status --json` | model, contextTokens, percentUsed |
| **Session Details** | `openclaw sessions --json` | Per-agent sessions with token breakdown |
| **Gateway Health** | `openclaw health --json` | Gateway status, channel status, agent availability |
| **System Logs** | `openclaw logs --json` | Recent errors and warnings |
| **Agent List** | `openclaw agents list` | All configured agents with models |

### Sample Data Structure

```json
{
  "agentId": "main",
  "inputTokens": 548860,
  "outputTokens": 1136,
  "totalTokens": 137215,
  "percentUsed": 67,
  "model": "glm-5",
  "contextTokens": 204800,
  "lastActiveAgeMs": 551436
}
```

---

## Goals

1. **Provide real-time visibility** into agent activity and status
2. **Track token usage** per agent (session/today/week)
3. **Surface system health** issues quickly
4. **Enable informed decisions** about resource usage
5. **Reduce debugging time** when agents encounter issues

---

## Feature Requirements

### Must Have (MVP)

#### F1: Agent Status Overview
- **F1.1** Display all 6 agents in a single view
- **F1.2** Show current status:
  - `idle` - No recent activity (lastActiveAgeMs > threshold)
  - `working` - Recently active (lastActiveAgeMs < 5 min)
  - `error` - Recent errors in logs
- **F1.3** Show session count per agent
- **F1.4** Show time since last activity
- **F1.5** Visual indicators (color coding) for quick scanning

**API:** `openclaw status --json` → sessions.byAgent

#### F2: Token Usage Tracking
- **F2.1** Tokens consumed per agent (current session)
- **F2.2** Tokens consumed today (per agent) - aggregate from sessions
- **F2.3** Tokens consumed this week (per agent) - aggregate from sessions
- **F2.4** Aggregate totals (all agents combined)
- **F2.5** Context window percentage used

**API:** `openclaw status --json` → inputTokens, outputTokens, totalTokens, percentUsed

**Note:** Cost tracking NOT included - just tokens per user request.

#### F3: Model Information
- **F3.1** Current model per agent (e.g., `glm-5`)
- **F3.2** Context window size (e.g., 204800)
- **F3.3** Percentage of context used

**API:** `openclaw status --json` → model, contextTokens, percentUsed

#### F4: System Health
- **F4.1** Gateway status (running/stopped)
- **F4.2** Gateway uptime
- **F4.3** Channel status (Telegram, etc.)
- **F4.4** Recent errors (last 10 from logs)
- **F4.5** Overall health indicator (green/yellow/red)

**API:** `openclaw health --json`, `openclaw logs --json --limit 10`

### Should Have

#### F5: Task Progress Indicators
- **F5.1** Progress percentage (0-100%)
- **F5.2** Current step description
- **F5.3** Status message from agent

**Note:** This requires changes to agents to report progress. See F12 below.

#### F6: Historical Usage
- **F6.1** Token usage over time (hourly/daily chart)
- **F6.2** Agent activity patterns
- **F6.3** Export usage data (CSV/JSON)

#### F7: Error Details
- **F7.1** Click to expand error details
- **F7.2** Error timestamp
- **F7.3** Related session info

### New Requirement

#### F12: Agent Progress Reporting (Infrastructure)
**Note:** This is a prerequisite for F5 and requires changes to all agents.

- **F12.1** Define progress reporting format in agent output
- **F12.2** Update SOUL.md with progress reporting guidelines
- **F12.3** Progress format:
  ```json
  {
    "progress": {
      "percent": 50,
      "step": "Researching APIs",
      "totalSteps": 4,
      "currentStep": 2,
      "message": "Fetching data from OpenClaw CLI"
    }
  }
  ```
- **F12.4** Parse progress from agent output in dashboard
- **F12.5** Display progress bar in dashboard

---

## Non-Functional Requirements

### Deployment
- **Separate web application** (not built into Gateway)
- **REST API backend** for agent skill integration
- **Frontend** - React/Vue or simple HTML/JS

### Performance
- Dashboard loads in < 2 seconds
- Data refresh via polling (configurable, default 10 seconds)
- No impact on agent performance

### Security
- Dashboard accessible only via local network or auth
- Read-only access to OpenClaw data
- No exposure of sensitive task content

### Compatibility
- Works in major browsers
- Mobile-responsive design
- API endpoints for programmatic access

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                    │
│              (React/Vue - separate web app)              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Dashboard REST API                      │
│  - /api/agents - Agent status and token usage            │
│  - /api/health - System health                           │
│  - /api/logs   - Recent errors                           │
│  - /api/sessions - Session details                       │
└─────────────────────┬───────────────────────────────────┘
                      │ exec()
                      ▼
┌─────────────────────────────────────────────────────────┐
│                OpenClaw CLI Commands                      │
│  - openclaw status --json                                │
│  - openclaw health --json                                │
│  - openclaw sessions --json                              │
│  - openclaw logs --json --limit 10                       │
│  - openclaw agents list                                  │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### GET /api/agents
Returns all agents with status and token usage.

```json
{
  "agents": [
    {
      "id": "main",
      "name": "Doobs",
      "emoji": "🎯",
      "status": "working",
      "model": "glm-5",
      "sessions": 12,
      "tokensToday": 137215,
      "tokensWeek": 450000,
      "contextUsed": "67%",
      "lastActive": "5 min ago"
    }
  ]
}
```

### GET /api/health
Returns system health status.

```json
{
  "gateway": {
    "status": "running",
    "uptime": "2 days"
  },
  "channels": {
    "telegram": "connected"
  },
  "overall": "healthy"
}
```

### GET /api/logs?limit=10
Returns recent errors.

```json
{
  "logs": [
    {
      "timestamp": "2026-02-17T15:00:00Z",
      "level": "error",
      "message": "Gateway agent failed",
      "agent": "trevor"
    }
  ]
}
```

### GET /api/sessions/:agentId
Returns session details for an agent.

---

## Sub-Agent Display

Per user requirement: **Sub-agents shown separately** (not nested under parent).

All 6 agents displayed as peers in the dashboard, regardless of who spawned them.

---

## Out of Scope

- **Task tracking** - Using GitHub Issues for this
- **Cost calculation** - Just tracking tokens
- **Agent configuration** - Dashboard is read-only
- **Real-time WebSockets** - Polling is sufficient for MVP

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Dashboard load time | < 2 seconds |
| Issue detection time | < 5 minutes |
| Token awareness | User knows daily usage |

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- Agent status overview
- Token usage tracking
- Model information
- System health

### Phase 2: Enhanced (Week 3)
- Error details view
- Historical usage
- Better visualizations

### Phase 3: Progress Tracking (Week 4)
- Add progress reporting to agents
- Display progress in dashboard

---

## Related Documents

- User Stories: GitHub Issues (to be created)
- Architecture: Archie to design
- Implementation: Neil to build

---

*PRD updated with confirmed data sources and user requirements.*
