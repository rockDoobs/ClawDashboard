/**
 * Test fixtures for ClawDashboard backend tests
 * Sample data from actual openclaw CLI commands
 */

const sampleHealthData = {
  ok: true,
  ts: 1771682531353,
  durationMs: 299,
  channels: {
    telegram: {
      configured: true,
      tokenSource: "none",
      running: false,
      mode: null,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
      probe: {
        ok: true,
        status: null,
        error: null,
        elapsedMs: 299,
        bot: {
          id: 8538309852,
          username: "ewieD_AI_bot",
          canJoinGroups: true,
          canReadAllGroupMessages: false,
          supportsInlineQueries: false
        },
        webhook: {
          url: "",
          hasCustomCert: false
        }
      },
      lastProbeAt: 1771682531353,
      accountId: "default"
    }
  }
};

const sampleStatusData = {
  gateway: {
    mode: "local",
    url: "ws://127.0.0.1:18789",
    urlSource: "local loopback",
    misconfigured: false,
    reachable: true,
    connectLatencyMs: 22,
    self: {
      host: "ubuntu-8gb-hel1-1",
      ip: "89.167.26.214",
      version: "2026.2.3-1",
      platform: "linux 6.8.0-100-generic"
    },
    error: null
  },
  sessions: {
    paths: [
      "/home/openclaw/.openclaw/agents/main/sessions/sessions.json"
    ],
    count: 18,
    defaults: {
      model: "glm-5",
      contextTokens: 204800
    },
    recent: [],
    byAgent: [
      {
        agentId: "main",
        path: "/home/openclaw/.openclaw/agents/main/sessions/sessions.json",
        count: 18,
        recent: [
          {
            agentId: "main",
            key: "agent:main:main",
            kind: "direct",
            sessionId: "279aebab-8855-4841-b1d4-7ef56478230f",
            updatedAt: 1771682398352,
            age: 132700,
            systemSent: true,
            abortedLastRun: false,
            inputTokens: 50883,
            outputTokens: 378,
            totalTokens: 54202,
            totalTokensFresh: true,
            remainingTokens: 217798,
            percentUsed: 20,
            model: "gpt-5.2",
            contextTokens: 272000,
            flags: [
              "system",
              "id:279aebab-8855-4841-b1d4-7ef56478230f"
            ]
          }
        ]
      },
      {
        agentId: "neil",
        path: "/home/openclaw/.openclaw/agents/neil/sessions/sessions.json",
        count: 2,
        recent: [
          {
            agentId: "neil",
            key: "agent:neil:main",
            kind: "direct",
            sessionId: "65b7ed60-20d4-4849-8000-1620c292a9ea",
            updatedAt: 1771351661776,
            age: 330869276,
            thinkingLevel: "high",
            totalTokens: null,
            totalTokensFresh: false,
            remainingTokens: null,
            percentUsed: null,
            model: "glm-5",
            contextTokens: 204800,
            flags: [
              "think:high",
              "id:65b7ed60-20d4-4849-8000-1620c292a9ea"
            ]
          }
        ]
      }
    ]
  }
};

module.exports = {
  sampleHealthData,
  sampleStatusData
};
