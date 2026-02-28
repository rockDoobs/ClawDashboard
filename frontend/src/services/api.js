// API client for ClawDashboard backend

const rawBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = (rawBase ?? '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function fetchOverview() {
  const response = await fetch(apiUrl('/api/overview'));
  if (!response.ok) throw new Error('Failed to fetch overview');
  return response.json();
}

export async function fetchAgents() {
  const response = await fetch(apiUrl('/api/agents'));
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
}

export async function fetchAgent(id) {
  const response = await fetch(apiUrl(`/api/agents/${id}`));
  if (!response.ok) throw new Error(`Failed to fetch agent ${id}`);
  return response.json();
}

export async function fetchHealth() {
  const response = await fetch(apiUrl('/api/health'));
  if (!response.ok) throw new Error('Failed to fetch health');
  return response.json();
}

export async function fetchLogs(limit = 10, level = 'all') {
  const params = new URLSearchParams({ limit, level });
  const response = await fetch(apiUrl(`/api/logs?${params}`));
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}
