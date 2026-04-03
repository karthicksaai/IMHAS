const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const billingApi = {
  getBillingProposals: async (patientId, token) => {
    try {
      const response = await fetch(`${API_URL}/billing/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    } catch { return []; }
  },

  reviewBilling: async (id, { approvalStatus, reviewNote, reviewedBy }, token) => {
    const response = await fetch(`${API_URL}/billing/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approvalStatus, reviewNote, reviewedBy }),
    });
    if (!response.ok) throw new Error('Failed to submit billing review');
    return response.json();
  },
};
