const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const diagnosticsApi = {
  // Submit diagnostic query
  createDiagnostic: async (data) => {
    try {
      const response = await fetch(`${API_URL}/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create diagnostic');
      }
      
      return response.json();
    } catch (error) {
      console.error('Diagnostic API error:', error);
      throw error;
    }
  },

  // Get diagnostics for a patient
  getPatientDiagnostics: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/diagnostics/patient/${patientId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch diagnostics');
      }
      
      return response.json();
    } catch (error) {
      console.warn('Could not load diagnostics:', error);
      return [];
    }
  },

  // Get single diagnostic
  getDiagnostic: async (id) => {
    const response = await fetch(`${API_URL}/diagnostics/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) throw new Error('Failed to fetch diagnostic');
    return response.json();
  },
};
