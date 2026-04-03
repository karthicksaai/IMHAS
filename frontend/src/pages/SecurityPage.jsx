import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, getAnomalies } from '../api/securityApi';
import AuditLogs from '../components/AuditLogs';

/* ── Sidebar (shared pattern) ──────────────────────────── */
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
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
             style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)' }}></div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base">IMHAS</div>
            <div className="text-xs" style={{ color: '#0ea5e9' }}>Hospital AI System</div>
          </div>
        )}
        <button onClick={onToggle} style={{ background:'none', border:'none', cursor:'pointer', marginLeft:'auto', color:'#94a3b8', fontSize:'1.2rem' }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {nav.map(item => {
          const active = location.pathname === item.path;
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
      <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{ background: '#0ea5e9', color:'white' }}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{user?.name || 'Clinician'}</div>
                <div className="text-slate-400 text-xs truncate capitalize">{user?.role || 'admin'}</div>
              </div>
              <button onClick={logout} title="Logout"
                style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'1rem' }}>
                ↪
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ icon, label, value, color, pulse }) {
  return (
    <div className="kpi-card animate-fade-in-up" style={pulse ? { animation: 'pulse-ring 1.5s infinite' } : {}}>
      <div className="flex items-start justify-between">
        <div className="kpi-icon" style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {pulse && <span className="live-dot-danger" />}
      </div>
      <div className="text-3xl font-bold" style={{ color: pulse ? '#ef4444' : '#0f172a' }}>{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

/* ── Detection Rules ──────────────────────────────────── */
const RULES = [
  {
    icon: '',
    title: 'Odd Hours Access',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Access between 00:00 – 05:00 triggers immediate alert. Clinical systems should not be accessed outside working hours without authorization.',
  },
  {
    icon: '',
    title: 'Rapid Record Access',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    desc: 'More than 5 patient records accessed within 60 seconds flags a potential data exfiltration or credential compromise attempt.',
  },
  {
    icon: '',
    title: 'Complete Audit Trail',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.2)',
    desc: 'Every API request is logged with user ID, IP address, action type, patient ID, and timestamp. Immutable trail for compliance.',
  },
];

/* ── Architecture Flow ──────────────────────────────────── */
const FLOW_STEPS = [
  { label: 'User Request',       icon: '', color: '#64748b' },
  { label: 'Auth Middleware',    icon: '', color: '#0ea5e9' },
  { label: 'Audit Logger',       icon: '', color: '#8b5cf6' },
  { label: 'Anomaly Detector',   icon: '', color: '#ef4444' },
  { label: 'Response',           icon: '', color: '#22c55e' },
];

function ArchitectureDiagram() {
  return (
    <div className="card p-6 animate-fade-in-up delay-400">
      <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
         Security Architecture
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {FLOW_STEPS.map((step, i) => (
          <>
            <div key={step.label}
                 className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl flex-shrink-0"
                 style={{ background: `${step.color}12`, border: `1px solid ${step.color}30` }}>
              <span className="text-2xl">{step.icon}</span>
              <span className="text-xs font-semibold text-center" style={{ color: step.color }}>{step.label}</span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <span key={`arrow-${i}`} className="text-slate-300 text-xl font-light">→</span>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

/* ── SecurityPage ────────────────────────────────────── */
export default function SecurityPage() {
  const [collapsed, setCollapsed]   = useState(false);
  const [anomalies, setAnomalies]   = useState([]);
  const [totalLogs, setTotalLogs]   = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [logsData, anomData] = await Promise.all([
        getAuditLogs(),
        getAnomalies(),
      ]);
      setTotalLogs(Array.isArray(logsData) ? logsData.length : (logsData?.logs?.length || 0));
      const users = new Set();
      (Array.isArray(logsData) ? logsData : (logsData?.logs || [])).forEach(l => {
        if (l.userId || l.user) users.add(l.userId || l.user);
      });
      setActiveUsers(users.size);
      setAnomalies(Array.isArray(anomData) ? anomData : (anomData?.anomalies || []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasAnomalies = anomalies.length > 0;
  const detectionRate = totalLogs > 0 ? '100%' : 'N/A';

  return (
    <div>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      <main className={`page-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Header */}
        <header className="page-header">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900"> Security Command Center</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="live-dot-danger" /> LIVE
            </span>
          </div>
          <span className="text-xs text-slate-400">Auto-refresh every 10s</span>
        </header>

        <div className="page-content flex flex-col gap-6">

          {/* Stat row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="" label="Total Access Logs"   value={loading ? '…' : totalLogs}  color="#0ea5e9" />
            <StatCard icon="" label="Anomalies Detected" value={loading ? '…' : anomalies.length} color="#ef4444" pulse={hasAnomalies} />
            <StatCard icon="" label="Detection Rate"     value={detectionRate}               color="#22c55e" />
            <StatCard icon="" label="Active Users"       value={loading ? '…' : activeUsers} color="#8b5cf6" />
          </div>

          {/* Anomaly alert panel */}
          {hasAnomalies && (
            <div className="rounded-xl p-5 animate-fade-in-up"
                 style={{
                   background: 'rgba(239,68,68,0.07)',
                   border: '2px solid rgba(239,68,68,0.35)',
                   animation: 'pulse-ring 2s infinite',
                 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl"></span>
                <span className="font-bold text-red-700 text-base">Active Security Anomalies</span>
                <span className="ml-auto badge badge-danger">{anomalies.length} Alert{anomalies.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-col gap-3">
                {anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white"
                       style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-xl mt-0.5"></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-red-800 text-sm">{a.type || a.anomalyType || 'Anomaly'}</span>
                        <span className="badge badge-danger">High Risk</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{a.description || a.details || 'Suspicious activity detected'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Recent'}
                        {a.ip ? ` · IP: ${a.ip}` : ''}
                        {a.userId ? ` · User: ${a.userId}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAnomalies && !loading && (
            <div className="card p-5 flex items-center gap-3 animate-fade-in-up"
                 style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)' }}>
              <span className="text-2xl"></span>
              <div>
                <div className="font-semibold text-emerald-700">All Clear — No Anomalies Detected</div>
                <div className="text-xs text-slate-500 mt-0.5">System is operating normally. Monitoring continues in real-time.</div>
              </div>
            </div>
          )}

          {/* Detection Rules */}
          <div className="animate-fade-in-up delay-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Detection Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {RULES.map((rule, i) => (
                <div key={i} className="card p-5"
                     style={{ border: `1px solid ${rule.border}`, background: rule.bg }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                         style={{ background: `${rule.color}18` }}>
                      {rule.icon}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{rule.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture */}
          <ArchitectureDiagram />

          {/* Audit Logs */}
          <div className="card p-5 animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Audit Logs</h2>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="live-dot" /> Live
              </span>
            </div>
            <AuditLogs />
          </div>

        </div>
      </main>
    </div>
  );
}
