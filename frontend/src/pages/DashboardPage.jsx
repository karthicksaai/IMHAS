import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, UserPlus, RefreshCw, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

const AGENT_NAMES = [
  { key: 'intake', label: 'Intake Agent' },
  { key: 'rag-indexer', label: 'RAG Indexer' },
  { key: 'diagnostics', label: 'Diagnostics Agent' },
  { key: 'billing', label: 'Billing Agent' },
  { key: 'security', label: 'Security Agent' },
];

function StatusDot({ active }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        active ? 'bg-[#16a34a]' : 'bg-[#dc2626]'
      }`}
    />
  );
}

function StatCard({ label, value, trend }) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg p-5 bg-white">
      <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value ?? '—'}</span>
        {trend != null && (
          <span className="flex items-center gap-1 text-xs text-[#16a34a] font-medium mb-1">
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({});
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [pRes, hRes] = await Promise.allSettled([
        fetch(`${API}/api/patients`, { headers }),
        fetch(`${API}/api/health`, { headers }),
      ]);

      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const data = await pRes.value.json();
        const list = Array.isArray(data) ? data : (data.patients || []);
        setPatients(list);
        setFiltered(list);
        setStats({
          total: list.length,
          indexedToday: list.filter(p => {
            const d = new Date(p.createdAt || p.registeredAt);
            return d.toDateString() === new Date().toDateString();
          }).length,
        });
      }

      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        const h = await hRes.value.json();
        setHealth(h);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/health`, { headers });
        if (res.ok) setHealth(await res.json());
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? patients.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.patientId || '').toLowerCase().includes(q)
      ) : patients
    );
  }, [search, patients]);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(status) {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">Active</span>;
    if (s === 'inactive') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#6b7280]/10 text-[#6b7280]">Inactive</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#d97706]/10 text-[#d97706]">{status}</span>;
  }

  const agentStatus = health.agents || {};
  const diagToday = health.diagnosticsToday ?? '—';
  const avgTime = health.avgProcessingMs ? `${(health.avgProcessingMs / 1000).toFixed(1)}s` : '—';

  return (
    <Layout>
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">Hospital overview and system status</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] w-56"
              />
            </div>
            <Link
              to="/patients"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2563eb] border border-[#2563eb]/30 rounded-lg hover:bg-[#2563eb]/5 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register Patient
            </Link>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Patients" value={stats.total} />
          <StatCard label="Registered Today" value={stats.indexedToday} />
          <StatCard label="AI Diagnostics Today" value={diagToday} />
          <StatCard label="Avg Processing Time" value={avgTime} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Recent Patients Table */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Patients</h2>
              <Link to="/patients" className="text-xs text-[#2563eb] hover:underline">View all</Link>
            </div>
            <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-[#6b7280]">Loading patients...</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[#6b7280]">No patients found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Age</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Registered</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {filtered.slice(0, 8).map(p => (
                      <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-xs font-bold flex items-center justify-center shrink-0">
                              {(p.name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6b7280]">{p.age || '—'}</td>
                        <td className="px-4 py-3">{statusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-[#6b7280]">{formatDate(p.createdAt || p.registeredAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/patients/${p._id}`)}
                            className="text-xs text-[#2563eb] hover:underline font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* System Status */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">System Status</h2>
            <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
              <div className="divide-y divide-[#e5e7eb]">
                {AGENT_NAMES.map(({ key, label }) => {
                  const agent = agentStatus[key] || {};
                  const isUp = agent.status === 'running';
                  const lastSeen = agent.lastSeen
                    ? new Date(agent.lastSeen).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : null;
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <StatusDot active={isUp} />
                        <span className="text-sm text-gray-900">{label}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${ isUp ? 'text-[#16a34a]' : 'text-[#dc2626]' }`}>
                          {isUp ? 'Running' : 'Stopped'}
                        </span>
                        {lastSeen && <p className="text-[10px] text-[#6b7280] mt-0.5">{lastSeen}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 bg-gray-50 border-t border-[#e5e7eb]">
                <p className="text-[10px] text-[#6b7280]">Polling every 10s</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
