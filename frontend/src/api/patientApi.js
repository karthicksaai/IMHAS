const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const patientApi = {
  // Get all patients
  getAllPatients: async () => {
    const response = await fetch(`${API_URL}/patients`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch patients');
    const data = await response.json();
    return data.patients || data; // Handle both formats
  },

  // Get single patient
  getPatient: async (id) => {
    const response = await fetch(`${API_URL}/patients/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch patient');
    return response.json();
  },

  // Create new patient (intake)
  createPatient: async (formData) => {
    const response = await fetch(`${API_URL}/intake`, {
      method: 'POST',
      body: formData, // FormData with file upload
    });
    if (!response.ok) throw new Error('Failed to create patient');
    return response.json();
  },

  // Get patient documents
  getPatientDocuments: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/documents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch documents');
      }
      
      return response.json();
    } catch (error) {
      console.warn('Documents not available:', error);
      return [];
    }
  },
};
