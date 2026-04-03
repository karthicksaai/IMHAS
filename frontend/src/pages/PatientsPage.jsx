import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import IntakeForm from '../components/IntakeForm';

const API = 'http://localhost:5000';
const PAGE_SIZE = 10;

function Avatar({ name }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-xs font-bold flex items-center justify-center shrink-0">
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  if (s === 'active') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">Active</span>;
  if (s === 'inactive') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#6b7280]/10 text-[#6b7280]">Inactive</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#d97706]/10 text-[#d97706]">{status}</span>;
}

export default function PatientsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/patients`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.patients || []);
        setPatients(list);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const q = search.toLowerCase();
    let result = patients;
    if (statusFilter !== 'all') result = result.filter(p => (p.status || 'active').toLowerCase() === statusFilter);
    if (q) result = result.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.patientId || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1);
  }, [search, statusFilter, patients]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (showForm) {
    return (
      <Layout>
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowForm(false)} className="text-sm text-[#2563eb] hover:underline">
              Back to Patients
            </button>
          </div>
          <IntakeForm onSuccess={() => { setShowForm(false); fetchPatients(); }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">{patients.length} total patients registered</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Register Patient
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] text-[#6b7280]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-[#6b7280]">Loading patients...</div>
          ) : paginated.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[#6b7280]">
              {search || statusFilter !== 'all' ? 'No patients match your filters.' : 'No patients registered yet.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Age</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Gender</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Blood Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Registered</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {paginated.map(p => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patients/${p._id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-[#6b7280] text-xs">{p.patientId || p._id?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{p.age || '—'}</td>
                    <td className="px-4 py-3 text-[#6b7280] capitalize">{p.gender || '—'}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{p.bloodType || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDate(p.createdAt || p.registeredAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/patients/${p._id}`); }}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[#6b7280]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded text-xs font-medium border transition-colors ${
                    n === page
                      ? 'border-[#2563eb] bg-[#2563eb] text-white'
                      : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
