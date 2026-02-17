const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const securityApi = {
  // Get audit logs
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/security/logs?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  // Get anomalies
  getAnomalies: async () => {
    const response = await fetch(`${API_URL}/security/alerts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch anomalies');
    return response.json();
  },

  // Log access
  logAccess: async (data) => {
    const response = await fetch(`${API_URL}/security/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to log access');
    return response.json();
  },
};
