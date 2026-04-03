import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatient } from '../api/patientApi';
import DiagnosticsPanel from '../components/DiagnosticsPanel';
import BillingPanel from '../components/BillingPanel';
import Layout from '../components/Layout';
import {
  ChevronLeft, Upload, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, User, Activity, RotateCcw
} from 'lucide-react';

const API = 'http://localhost:5000';

function FieldRow({ label, value }) {
  return (
    <div className="flex py-2.5 border-b border-[#e5e7eb] last:border-0">
      <span className="w-36 text-xs text-[#6b7280] shrink-0 pt-0.5 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
    </div>
  );
}

function DocStatusBadge({ status }) {
  if (status === 'indexed') return <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#16a34a]/10 text-[#16a34a]">Indexed</span>;
  if (status === 'failed') return <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#dc2626]/10 text-[#dc2626]">Failed</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#d97706]/10 text-[#d97706]">Pending</span>;
}

const TIMELINE_ICON_MAP = {
  registration: User,
  document_upload: Upload,
  rag_indexed: CheckCircle2,
  diagnosis_made: Activity,
  diagnosis_approved: CheckCircle2,
  diagnosis_rejected: XCircle,
  billing_generated: FileText,
  anomaly_detected: AlertCircle,
};

const TIMELINE_COLOR_MAP = {
  registration: 'text-[#2563eb]',
  document_upload: 'text-[#6b7280]',
  rag_indexed: 'text-[#16a34a]',
  diagnosis_made: 'text-[#2563eb]',
  diagnosis_approved: 'text-[#16a34a]',
  diagnosis_rejected: 'text-[#dc2626]',
  billing_generated: 'text-[#d97706]',
  anomaly_detected: 'text-[#dc2626]',
};

export default function PatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [ragStatus, setRagStatus] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPatient = useCallback(async () => {
    try {
      const data = await getPatient(id);
      setPatient(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/patients/${id}/documents`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : (data.documents || []));
      }
    } catch {}
  }, [id, token]);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/patients/${id}/timeline`, { headers });
      if (res.ok) setTimeline(await res.json());
    } catch {}
  }, [id, token]);

  const fetchRagStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/patients/${id}/rag-status`, { headers });
      if (res.ok) setRagStatus(await res.json());
    } catch {}
  }, [id, token]);

  useEffect(() => {
    fetchPatient();
    fetchDocuments();
    fetchTimeline();
    fetchRagStatus();
  }, [fetchPatient, fetchDocuments, fetchTimeline, fetchRagStatus]);

  function startPolling() {
    if (pollRef.current) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      await fetchDocuments();
      await fetchRagStatus();
      if (attempts >= 20) stopPolling();
    }, 3000);
  }

  function stopPolling() {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  useEffect(() => () => stopPolling(), []);

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('documents', f));
    try {
      const res = await fetch(`${API}/api/patients/${id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        await fetchDocuments();
        startPolling();
      }
    } catch {}
    finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const initials = patient?.name
    ? patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'diagnostics', label: 'AI Diagnostics' },
    { key: 'billing', label: 'Billing' },
  ];

  return (
    <Layout>
      <div className="px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 text-sm">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1.5 text-[#6b7280] hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Patients
          </button>
          <span className="text-[#e5e7eb]">/</span>
          <span className="text-gray-900 font-medium">{loading ? 'Loading...' : (patient?.name || 'Patient Record')}</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : !patient ? (
          <div className="text-center py-20">
            <p className="text-[#6b7280] text-sm">Patient not found.</p>
            <button onClick={() => navigate('/patients')} className="mt-3 text-sm text-[#2563eb] hover:underline">Back to Patients</button>
          </div>
        ) : (
          <>
            {/* Patient header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e5e7eb]">
              <div className="w-12 h-12 rounded-full bg-[#2563eb]/10 text-[#2563eb] font-bold text-lg flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#16a34a]/10 text-[#16a34a]">Active</span>
                </div>
                <p className="text-sm text-[#6b7280] mt-0.5">
                  {[patient.age && `Age ${patient.age}`, patient.gender, patient.bloodType, `ID: ${patient._id?.slice(-8).toUpperCase()}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-[#e5e7eb] mb-6">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === t.key
                      ? 'border-[#2563eb] text-[#2563eb]'
                      : 'border-transparent text-[#6b7280] hover:text-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="grid grid-cols-3 gap-6">
                {/* Left col: patient info + RAG status */}
                <div className="col-span-2 space-y-6">
                  {/* Patient Info */}
                  <div>
                    <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Patient Information</h2>
                    <div className="border border-[#e5e7eb] rounded-lg px-4">
                      <FieldRow label="Full Name" value={patient.name} />
                      <FieldRow label="Age" value={patient.age ? `${patient.age} years` : null} />
                      <FieldRow label="Gender" value={patient.gender} />
                      <FieldRow label="Blood Type" value={patient.bloodType} />
                      <FieldRow label="Contact" value={patient.contact || patient.phone} />
                      <FieldRow label="Address" value={patient.address} />
                      <FieldRow label="Registered" value={formatDate(patient.createdAt || patient.registeredAt)} />
                    </div>
                  </div>

                  {/* RAG Index Status */}
                  <div>
                    <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">RAG Index Status</h2>
                    <div className="border border-[#e5e7eb] rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
                      <span className="text-[#6b7280]">
                        Model: <span className="text-gray-900 font-medium">gemini-embedding-001</span>
                        {' '}· Dimensions: <span className="text-gray-900 font-medium">{ragStatus?.dimensions ?? 768}</span>
                        {' '}· Chunks: <span className="text-gray-900 font-medium">{ragStatus?.totalChunks ?? (documents.length * 3)}</span>
                        {' '}· Status: <span className="text-[#16a34a] font-medium">{ragStatus?.status ?? 'Indexed'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right col: Medical Documents + Timeline */}
                <div className="space-y-6">
                  {/* Medical Documents */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Medical Documents</h2>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 text-xs text-[#2563eb] hover:underline font-medium disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.docx" className="hidden" onChange={handleUpload} />
                    </div>
                    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                      {documents.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <FileText className="w-6 h-6 text-[#6b7280] mx-auto mb-2" />
                          <p className="text-xs text-[#6b7280]">No documents uploaded yet.</p>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 text-xs text-[#2563eb] hover:underline"
                          >
                            Upload a document
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#e5e7eb]">
                          {documents.map((doc, i) => (
                            <div key={doc._id || i} className="flex items-center gap-3 px-3 py-2.5">
                              <FileText className="w-4 h-4 text-[#6b7280] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {doc.fileName || doc.name || `Document ${i + 1}`}
                                </p>
                                <p className="text-[10px] text-[#6b7280]">
                                  {formatDate(doc.createdAt || doc.uploadedAt)}
                                  {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}
                                </p>
                              </div>
                              <DocStatusBadge status={(doc.status || 'pending').toLowerCase()} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Federated Patient Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Patient Timeline</h2>
                      <button onClick={fetchTimeline} className="text-[#6b7280] hover:text-gray-900">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {timeline.length === 0 ? (
                      <p className="text-xs text-[#6b7280]">No events yet.</p>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[#e5e7eb]" />
                        <div className="space-y-4">
                          {timeline.map((event, i) => {
                            const Icon = TIMELINE_ICON_MAP[event.type] || Clock;
                            const iconColor = TIMELINE_COLOR_MAP[event.type] || 'text-[#6b7280]';
                            return (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className="relative -left-5 w-7 h-7 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0">
                                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                                </div>
                                <div className="flex-1 -mt-0.5">
                                  <p className="text-xs font-medium text-gray-900">{event.label}</p>
                                  <p className="text-[10px] text-[#6b7280]">
                                    {event.timestamp ? new Date(event.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                                  {event.description && <p className="text-[10px] text-[#6b7280] mt-0.5">{event.description}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DIAGNOSTICS TAB */}
            {tab === 'diagnostics' && <DiagnosticsPanel patientId={id} />}

            {/* BILLING TAB */}
            {tab === 'billing' && <BillingPanel patientId={id} patientName={patient.name} />}
          </>
        )}
      </div>
    </Layout>
  );
}
