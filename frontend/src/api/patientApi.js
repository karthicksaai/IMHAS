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
    return data.patients || data;
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
      body: formData,
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
        if (response.status === 404) return [];
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    } catch (error) {
      console.warn('Documents not available:', error);
      return [];
    }
  },

  // Get patient diagnostics
  getPatientDiagnostics: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/diagnostics`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  },

  // Get patient billing proposals
  getPatientBilling: async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/billing`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  },

  // Download all patient records as JSON
  downloadRecords: async (patientId, patientName) => {
    const [patient, documents, diagnostics, billing] = await Promise.allSettled([
      patientApi.getPatient(patientId),
      patientApi.getPatientDocuments(patientId),
      patientApi.getPatientDiagnostics(patientId),
      patientApi.getPatientBilling(patientId),
    ]);

    const record = {
      exportedAt: new Date().toISOString(),
      patient:    patient.status    === 'fulfilled' ? patient.value    : null,
      documents:  documents.status  === 'fulfilled' ? documents.value  : [],
      diagnostics:diagnostics.status=== 'fulfilled' ? diagnostics.value: [],
      billing:    billing.status    === 'fulfilled' ? billing.value    : [],
    };

    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const safeName = (patientName || 'patient').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `IMHAS_${safeName}_${patientId.slice(-6)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/* ── Named exports (used by redesigned components) ───────────────────── */
export const getPatients            = () => patientApi.getAllPatients();
export const getPatient             = (id) => patientApi.getPatient(id);
export const registerPatient        = (formData) => patientApi.createPatient(formData);
export const downloadPatientRecords = (id, name) => patientApi.downloadRecords(id, name);
