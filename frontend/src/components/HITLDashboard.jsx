import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

const BAND_META = {
  auto_approve: {
    label: 'Auto Approve',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Confidence >= 90%',
  },
  mandatory_review: {
    label: 'Mandatory Review',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    desc: 'Confidence 70-89%',
  },
  second_opinion: {
    label: 'Second Opinion',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    desc: 'Confidence < 70%',
  },
};

function BandCard({ band, data }) {
  const meta = BAND_META[band];
  const barWidth = data.count > 0 ? Math.round(data.approvalRate) : 0;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: meta.bg, borderColor: meta.border }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: meta.color }}
          >
            {meta.label}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{meta.desc}</p>
        </div>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: meta.color }}
        >
          {data.count}
        </span>
      </div>

      <div className="space-y-1.5 mt-3">
        <div className="flex justify-between text-[11px] text-gray-600">
          <span>Approval rate</span>
          <span className="font-semibold tabular-nums">{data.approvalRate}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%`, background: meta.color }}
          />
        </div>
      </div>

      <div className="flex justify-between mt-3 text-[11px] text-gray-500">
        <span>
          Approved:{' '}
          <strong className="text-gray-800 tabular-nums">{data.approved}</strong>
        </span>
        <span>
          Rejected:{' '}
          <strong className="text-gray-800 tabular-nums">{data.rejected}</strong>
        </span>
        {data.avgConfidence != null && (
          <span>
            Avg conf:{' '}
            <strong className="text-gray-800 tabular-nums">{data.avgConfidence}%</strong>
          </span>
        )}
      </div>
    </div>
  );
}

export default function HITLDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API}/api/diagnostics/hitl-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data.stats);
        setTotal(data.total);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="border border-[#e5e7eb] rounded-lg p-5">
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">
          Research Metrics - HITL Band Distribution
        </p>
        <div className="text-sm text-[#6b7280] py-4 text-center">Loading HITL stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-100 rounded-lg p-5 bg-red-50">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
          Research Metrics - HITL Band Distribution
        </p>
        <p className="text-xs text-red-600">
          Could not load stats: {error}. Ensure the backend is running and GET
          /api/diagnostics/hitl-stats is registered.
        </p>
      </div>
    );
  }

  if (!stats || total === 0) {
    return (
      <div className="border border-[#e5e7eb] rounded-lg p-5">
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">
          Research Metrics - HITL Band Distribution
        </p>
        <p className="text-sm text-[#6b7280] py-4 text-center">
          No diagnostics with HITL bands yet. Run a few diagnostics after deploying the updated
          agent.
        </p>
      </div>
    );
  }

  const bands = ['auto_approve', 'mandatory_review', 'second_opinion'];
  const empty = { count: 0, approved: 0, rejected: 0, approvalRate: 0, avgConfidence: null };

  return (
    <div className="border border-[#e5e7eb] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Research Metrics - HITL Band Distribution
          </p>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Confidence-calibrated human-in-the-loop thresholds across {total} diagnostic(s)
          </p>
        </div>
        <span className="text-xs font-medium text-[#6b7280] border border-[#e5e7eb] rounded-full px-2.5 py-1">
          {total} total
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {bands.map(band => (
          <BandCard key={band} band={band} data={stats[band] || empty} />
        ))}
      </div>

      <p className="text-[10px] text-[#6b7280] mt-3 leading-relaxed">
        Over-reliance risk: auto_approve rate above 60% may indicate over-confident thresholds.
        Under-reliance risk: second_opinion rate above 40% suggests poor document coverage.
      </p>
    </div>
  );
}
