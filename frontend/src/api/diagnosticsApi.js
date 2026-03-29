const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const diagnosticsApi = {
  createDiagnostic: async (data) => {
    const response = await fetch(`${API_URL}/diagnostics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create diagnostic');
    }
    return response.json();
  },

  getPatientDiagnostics: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/diagnostics/patient/${patientId}`);
      if (!response.ok) return [];
      return response.json();
    } catch { return []; }
  },

  getDiagnostic: async (id) => {
    const response = await fetch(`${API_URL}/diagnostics/${id}`);
    if (!response.ok) throw new Error('Failed to fetch diagnostic');
    return response.json();
  },

  // Approve or reject an AI diagnostic result
  reviewDiagnostic: async (id, { approvalStatus, reviewNote, reviewedBy }) => {
    const response = await fetch(`${API_URL}/diagnostics/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus, reviewNote, reviewedBy }),
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return response.json();
  },

  // Request a second opinion on an existing diagnostic
  getSecondOpinion: async (id) => {
    const response = await fetch(`${API_URL}/diagnostics/${id}/second-opinion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to request second opinion');
    return response.json();
  },

  // Drug interaction check — rule-based, no AI
  checkInteractions: async ({ patientId, proposedDrugs }) => {
    const response = await fetch(`${API_URL}/diagnostics/check-interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, proposedDrugs }),
    });
    if (!response.ok) throw new Error('Failed to check interactions');
    return response.json();
  },
};
