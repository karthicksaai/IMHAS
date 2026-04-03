const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const billingApi = {
  optimizeBilling: async (data) => {
    const response = await fetch(`${API_URL}/billing/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to optimize billing');
    }
    return response.json();
  },

  getBillingProposals: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/billing/${patientId}`);
      if (!response.ok) return [];
      return response.json();
    } catch { return []; }
  },

  // Approve or reject a billing proposal
  reviewBilling: async (id, { approvalStatus, reviewNote, reviewedBy }) => {
    const response = await fetch(`${API_URL}/billing/proposal/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus, reviewNote, reviewedBy }),
    });
    if (!response.ok) throw new Error('Failed to submit billing review');
    return response.json();
  },
};
