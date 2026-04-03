import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatient, downloadPatientRecords } from '../api/patientApi';
import DiagnosticsPanel from '../components/DiagnosticsPanel';
import BillingPanel    from '../components/BillingPanel';

/* ── Sidebar (shared) ───────────────────────────────────── */
function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const nav = [
    { icon: '', label: 'Dashboard', path: '/' },
    { icon: '', label: 'Patients',  path: '/patients' },
    { icon: '', label: 'Security',  path: '/security' },
    { icon: '',  label: 'Settings',  path: '/settings' },
  ];
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
             style={{ background:'rgba(14,165,233,0.2)', border:'1px solid rgba(14,165,233,0.3)' }}></div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base">IMHAS</div>
            <div className="text-xs" style={{ color:'#0ea5e9' }}>Hospital AI System</div>
          </div>
        )}
        <button onClick={onToggle} style={{ background:'none', border:'none', cursor:'pointer', marginLeft:'auto', color:'#94a3b8', fontSize:'1.2rem' }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {nav.map(item => {
          const active = location.pathname.startsWith(item.path) && item.path !== '/';
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              style={{ background:'none', border:'none', width:'100%', textAlign:'left' }}>
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="border-t p-4" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{ background:'#0ea5e9', color:'white' }}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{user?.name || 'Clinician'}</div>
                <div className="text-slate-400 text-xs capitalize">{user?.role || 'doctor'}</div>
              </div>
              <button onClick={logout} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>↪</button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Avatar helpers ─────────────────────────────────────── */
const AVATAR_COLORS = ['#0ea5e9','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4'];
function avatarColor(name) {
  const c = (name || 'P').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[c];
}

/* ── PatientPage ───────────────────────────────────────── */
export default function PatientPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [patient, setPatient]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPatient(id);
        setPatient(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadPatientRecords(id); }
    catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  const initials = patient?.name
    ? patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  return (
    <div>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      <main className={`page-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Header */}
        <header className="page-header">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-700 transition-colors text-sm"
              style={{ background:'none', border:'none', cursor:'pointer' }}>
              ← Back
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {loading ? 'Loading…' : (patient?.name || 'Patient Record')}
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="page-content flex flex-col gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 w-full" />)}
          </div>
        ) : !patient ? (
          <div className="page-content text-center py-20 text-slate-400">
            <div className="text-5xl mb-4"></div>
            <p className="text-lg font-medium">Patient not found</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/')}>Back to Dashboard</button>
          </div>
        ) : (
          <div className="page-content flex flex-col gap-6">

            {/* Hero section */}
            <div className="card p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center animate-fade-in-up">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
                   style={{ background: avatarColor(patient.name) }}>
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                  <span className="badge badge-success">Active</span>
                  {patient.status === 'critical' && <span className="badge badge-danger">Critical</span>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  {patient.age      && <span> Age {patient.age}</span>}
                  {patient._id      && <span> ID: {patient._id.slice(-8).toUpperCase()}</span>}
                  {patient.createdAt && <span> Registered {new Date(patient.createdAt).toLocaleDateString()}</span>}
                  {patient.documents?.length > 0 && <span> {patient.documents.length} document{patient.documents.length > 1 ? 's' : ''}</span>}
                </div>
              </div>

              {/* Download */}
              <button
                className="btn-primary flex-shrink-0"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? '⏳ Preparing…' : '↓ Download Records'}
              </button>
            </div>

            {/* Tab bar */}
            <div className="tab-bar animate-fade-in-up delay-100">
              {['overview', 'diagnostics', 'billing'].map(t => (
                <button key={t}
                  className={`tab-item ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                  style={{ background:'none', border:'none', cursor:'pointer' }}>
                  {t === 'overview'     && ' Overview'}
                  {t === 'diagnostics'  && ' AI Diagnostics'}
                  {t === 'billing'      && ' Billing'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">

                {/* Patient info */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Patient Information</h3>
                  <dl className="flex flex-col gap-3">
                    {[
                      ['Full Name',   patient.name],
                      ['Age',         patient.age ? `${patient.age} years` : '—'],
                      ['Gender',      patient.gender || '—'],
                      ['Blood Type',  patient.bloodType || '—'],
                      ['Contact',     patient.contact || patient.phone || '—'],
                      ['Address',     patient.address || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{k}</dt>
                        <dd className="text-sm text-slate-800 font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Medical docs */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Medical Documents</h3>
                  {patient.documents?.length ? (
                    <div className="flex flex-col gap-2">
                      {patient.documents.map((doc, i) => (
                        <div key={i}
                             className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                             style={{ background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                          <span className="text-lg"></span>
                          <span className="text-sm text-slate-700 truncate flex-1">
                            {typeof doc === 'string' ? doc.split('/').pop() : (doc.name || `Document ${i + 1}`)}
                          </span>
                          <span className="badge badge-success">Indexed</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                  )}
                </div>

                {/* RAG Index status */}
                <div className="card p-5 lg:col-span-2"
                     style={{ border:'1px solid rgba(14,165,233,0.2)', background:'rgba(14,165,233,0.03)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl"></span>
                    <h3 className="text-sm font-bold text-slate-700">RAG Index Status</h3>
                    <span className="badge badge-success ml-auto">Ready</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      ['Model',     'Gemini gemini-embedding-001'],
                      ['Dimension', '768'],
                      ['Chunks',    patient.documents?.length ? `${patient.documents.length * 3}` : '0'],
                      ['Status',    'Indexed'],
                    ].map(([k, v]) => (
                      <div key={k} className="text-center p-3 rounded-xl bg-white border border-slate-100">
                        <div className="text-lg font-bold" style={{ color:'#0ea5e9' }}>{v}</div>
                        <div className="text-xs text-slate-500 mt-1">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'diagnostics' && (
              <div className="card p-5 animate-fade-in-up">
                <DiagnosticsPanel patientId={id} />
              </div>
            )}

            {tab === 'billing' && (
              <div className="card p-5 animate-fade-in-up">
                <BillingPanel patientId={id} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
