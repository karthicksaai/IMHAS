const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const billingApi = {
  // Optimize billing
  optimizeBilling: async (data) => {
    const response = await fetch(`${API_URL}/billing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to optimize billing');
    return response.json();
  },

  // Get billing history for patient
  getPatientBilling: async (patientId) => {
    const response = await fetch(`${API_URL}/billing/patient/${patientId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch billing');
    return response.json();
  },

  // Get single billing proposal
  getBilling: async (id) => {
    const response = await fetch(`${API_URL}/billing/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch billing');
    return response.json();
  },
};
