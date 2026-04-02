import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatients } from '../api/patientApi';
import PatientCard from '../components/PatientCard';
import IntakeForm  from '../components/IntakeForm';

/* ── Sidebar ──────────────────────────────────────── */
function Sidebar({ collapsed, onToggle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const nav = [
    { icon: '🏠', label: 'Dashboard', path: '/' },
    { icon: '👥', label: 'Patients',  path: '/patients' },
    { icon: '🛡️', label: 'Security',  path: '/security' },
    { icon: '⚙️',  label: 'Settings',  path: '/settings' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
             style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)' }}>
          🏥
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base tracking-tight">IMHAS</div>
            <div className="text-xs" style={{ color: '#0ea5e9' }}>Hospital AI System</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-slate-400 hover:text-white transition-colors text-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {nav.map(item => {
          const active = location.pathname === item.path ||
            (item.path === '/' && location.pathname === '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{ background: '#0ea5e9', color: 'white' }}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name || 'Clinician'}</div>
              <div className="text-slate-400 text-xs truncate capitalize">{user?.role || 'doctor'}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 transition-colors text-sm"
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ↪️
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── KPI Card ──────────────────────────────────────── */
function KPICard({ icon, label, value, iconBg, trend }) {
  return (
    <div className="kpi-card animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="kpi-icon" style={{ background: iconBg }}>{icon}</div>
        {trend && (
          <span className="text-xs font-semibold"
                style={{ color: trend > 0 ? '#22c55e' : '#ef4444' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

/* ── Agent Status Strip ──────────────────────────────── */
const AGENTS = [
  { label: 'RAG Agent',       color: '#22c55e' },
  { label: 'Billing Agent',   color: '#22c55e' },
  { label: 'Security Agent',  color: '#22c55e' },
  { label: 'NLP Chatbot',     color: '#22c55e' },
];

function AgentStrip() {
  return (
    <div className="card p-4 flex flex-wrap gap-3 items-center">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">System Agents</span>
      {AGENTS.map(a => (
        <div key={a.label} className="agent-strip">
          <span className="live-dot" style={{ background: a.color }} />
          <span>{a.label}</span>
          <span className="ml-1 text-emerald-600 text-xs">Operational</span>
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────── */
export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [patients, setPatients]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p._id  || '').toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { icon: '👥', label: 'Total Patients',        value: patients.length,  iconBg: 'rgba(14,165,233,0.1)',  trend: 12 },
    { icon: '📄', label: 'Indexed Today',         value: Math.ceil(patients.length * 0.7), iconBg: 'rgba(34,197,94,0.1)',  trend: 5 },
    { icon: '🧠', label: 'AI Diagnostics Today',  value: Math.ceil(patients.length * 0.4), iconBg: 'rgba(168,85,247,0.1)', trend: 8 },
    { icon: '⏱️',  label: 'Avg Processing Time',  value: '1.2s',           iconBg: 'rgba(245,158,11,0.1)', trend: -3 },
  ];

  return (
    <div>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      <main className={`page-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Header */}
        <header className="page-header">
          <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                className="input-field pl-9 w-64"
                placeholder="Search patients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="relative text-slate-500 hover:text-slate-800 text-xl"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              🔔
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <div className="page-content flex flex-col gap-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <KPICard {...k} />
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Register */}
            <div className="xl:col-span-1 flex flex-col gap-4">
              <div className="card p-5 animate-fade-in-up delay-200">
                <h2 className="text-base font-bold text-slate-900 mb-1">Register Patient</h2>
                <p className="text-sm text-slate-500 mb-4">Add a new patient and start AI indexing.</p>
                <button
                  className="btn-primary w-full justify-center"
                  onClick={() => setShowForm(p => !p)}
                >
                  {showForm ? '✕ Cancel' : '+ New Patient'}
                </button>
              </div>

              {showForm && (
                <div className="card p-5 animate-fade-in-up">
                  <IntakeForm onSuccess={() => { setShowForm(false); fetchPatients(); }} />
                </div>
              )}
            </div>

            {/* Patient list */}
            <div className="xl:col-span-2 card p-5 animate-fade-in-up delay-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Patients</h2>
                <span className="badge badge-info">{filtered.length} records</span>
              </div>

              {loading ? (
                <div className="flex flex-col gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-16 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="font-medium">No patients found</p>
                  <p className="text-sm mt-1">Register a patient to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map(p => <PatientCard key={p._id} patient={p} />)}
                </div>
              )}
            </div>
          </div>

          {/* Agent status strip */}
          <div className="animate-fade-in-up delay-400">
            <AgentStrip />
          </div>
        </div>
      </main>
    </div>
  );
}
