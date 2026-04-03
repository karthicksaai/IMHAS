import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../api/securityApi';

const FILTERS = ['All', 'Normal', 'Anomaly'];

const ACTION_COLORS = {
  view:   '#0ea5e9',
  create: '#22c55e',
  update: '#f59e0b',
  delete: '#ef4444',
  login:  '#8b5cf6',
};

export default function AuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [filter, setFilter]   = useState('All');
  const [loading, setLoading] = useState(true);
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

  const filtered = logs.filter(log => {
    if (filter === 'All')     return true;
    if (filter === 'Anomaly') return log.isAnomaly || log.anomaly || log.type === 'anomaly';
    if (filter === 'Normal')  return !log.isAnomaly && !log.anomaly && log.type !== 'anomaly';
    return true;
  });

  const anomalyCount = logs.filter(l => l.isAnomaly || l.anomaly || l.type === 'anomaly').length;

  return (
    <div className="flex flex-col gap-4">

      {/* Filter pills + meta */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ background:'none', border: filter === f ? 'none' : '1px solid #e2e8f0' }}
            >
              {f}
              {f === 'Anomaly' && anomalyCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">{anomalyCount}</span>
              )}
            </button>
          ))}
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
          <div className="text-3xl mb-2"></div>
          <p className="font-medium">No logs found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Patient ID</th>
                <th>IP Address</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const isAnomaly = log.isAnomaly || log.anomaly || log.type === 'anomaly';
                const actionColor = ACTION_COLORS[log.action?.toLowerCase()] || '#64748b';
                return (
                  <tr key={log._id || i} className={isAnomaly ? 'anomaly-row' : ''}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actionColor }} />
                        <span className="capitalize font-medium text-slate-700">{log.action || 'view'}</span>
                      </span>
                    </td>
                    <td className="text-slate-600">{log.userId || log.user || '—'}</td>
                    <td className="font-mono text-xs text-slate-500">
                      {log.patientId ? log.patientId.slice(-8).toUpperCase() : '—'}
                    </td>
                    <td className="font-mono text-xs text-slate-500">{log.ip || log.ipAddress || '—'}</td>
                    <td className="text-xs text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td>
                      {isAnomaly ? (
                        <span className="badge badge-danger"> Anomaly</span>
                      ) : (
                        <span className="badge badge-success"> Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
