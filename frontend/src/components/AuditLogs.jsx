import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../api/securityApi';

const FILTERS = ['All', 'Normal', 'Anomaly'];

const ACTOR_META = {
  'billing-agent':     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'billing-agent'     },
  'diagnostics-agent': { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'diagnostics-agent' },
  'security-agent':    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'security-agent'    },
  'intake-agent':      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'intake-agent'      },
  'rag-indexer-agent': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'rag-indexer'       },
};

const SEVERITY_META = {
  critical: { color: '#fff',    bg: '#dc2626', label: 'critical' },
  high:     { color: '#fff',    bg: '#ea580c', label: 'high'     },
  medium:   { color: '#fff',    bg: '#d97706', label: 'medium'   },
  low:      { color: '#fff',    bg: '#65a30d', label: 'low'      },
  none:     { color: '#64748b', bg: '#f1f5f9', label: 'none'     },
};

function ActorBadge({ actor }) {
  if (!actor) return <span className="text-slate-400 text-xs">—</span>;
  const meta = ACTOR_META[actor] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: actor };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const s = (severity || 'none').toLowerCase();
  const meta = SEVERITY_META[s] || SEVERITY_META.none;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function AnomalyFlag({ isAnomaly }) {
  if (!isAnomaly) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-300" /> normal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> anomaly
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs]             = useState([]);
  const [filter, setFilter]         = useState('All');
  const [actorFilter, setActorFilter] = useState('All');
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getAuditLogs();
      setLogs(Array.isArray(data) ? data : (data?.logs || []));
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Derive unique actors from live data
  const actors = ['All', ...Array.from(new Set(logs.map(l => l.actor).filter(Boolean)))];

  const filtered = logs.filter(log => {
    const anomalyMatch =
      filter === 'All'     ? true :
      filter === 'Anomaly' ? (log.isAnomaly === true) :
      filter === 'Normal'  ? (log.isAnomaly !== true) : true;
    const actorMatch = actorFilter === 'All' ? true : log.actor === actorFilter;
    return anomalyMatch && actorMatch;
  });

  const anomalyCount = logs.filter(l => l.isAnomaly === true).length;

  return (
    <div className="flex flex-col gap-4">

      {/* Filter row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Anomaly / Normal filters */}
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                background: filter === f ? '#0f172a' : 'transparent',
                color:      filter === f ? '#fff' : '#64748b',
                border:     '1px solid #e2e8f0',
              }}
            >
              {f}
              {f === 'Anomaly' && anomalyCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">{anomalyCount}</span>
              )}
            </button>
          ))}

          {/* Actor filters — rendered only when multiple actors exist */}
          {actors.length > 2 && (
            <span className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              {actors.map(a => {
                const meta = a !== 'All' ? (ACTOR_META[a] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }) : null;
                return (
                  <button
                    key={a}
                    onClick={() => setActorFilter(a)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{
                      background: actorFilter === a ? (meta?.bg || '#f1f5f9') : 'transparent',
                      color:      actorFilter === a ? (meta?.color || '#0f172a') : '#94a3b8',
                      border:     `1px solid ${actorFilter === a ? (meta?.color || '#cbd5e1') + '50' : '#e2e8f0'}`,
                    }}
                  >
                    {a === 'All' ? 'All Agents' : a}
                  </button>
                );
              })}
            </span>
          )}
        </div>

        {lastUpdated && (
          <span className="text-xs text-slate-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="font-medium">No logs found</p>
          <p className="text-xs mt-1">Run a diagnostic or generate a bill to populate the audit trail.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table text-sm w-full">
            <thead>
              <tr>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resource</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Anomaly</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient ID</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr
                  key={log._id || i}
                  style={log.isAnomaly ? { background: 'rgba(239,68,68,0.04)' } : {}}
                >
                  {/* Actor */}
                  <td><ActorBadge actor={log.actor} /></td>

                  {/* Action */}
                  <td>
                    <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {log.action || '—'}
                    </span>
                  </td>

                  {/* Resource type */}
                  <td className="text-xs text-slate-500 capitalize">
                    {log.resourceType || '—'}
                  </td>

                  {/* Severity */}
                  <td><SeverityBadge severity={log.severity || log.meta?.severity} /></td>

                  {/* isAnomaly */}
                  <td><AnomalyFlag isAnomaly={log.isAnomaly === true} /></td>

                  {/* Patient ID */}
                  <td className="font-mono text-xs text-slate-500">
                    {(log.meta?.patientId || log.patientId)
                      ? String(log.meta?.patientId || log.patientId).slice(-8).toUpperCase()
                      : '—'}
                  </td>

                  {/* IP */}
                  <td className="font-mono text-xs text-slate-500">
                    {log.ipAddress || log.ip || '—'}
                  </td>

                  {/* Timestamp */}
                  <td className="text-xs text-slate-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {logs.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium">Agents:</span>
          {Object.entries(ACTOR_META).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1 text-xs" style={{ color: meta.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
