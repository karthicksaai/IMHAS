import { useState, useEffect } from 'react';
import { securityApi } from '../api/securityApi';
import { useApp } from '../context/AppContext';

const AuditLogs = () => {
  const { addNotification } = useApp();
  const [logs, setLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, normal, anomaly

  useEffect(() => {
    loadData();
    // Poll for updates every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [logsData, anomaliesData] = await Promise.all([
        securityApi.getAuditLogs(),
        securityApi.getAnomalies()
      ]);
      setLogs(logsData);
      setAnomalies(anomaliesData);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to load security data' });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      login: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      access: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      create: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      update: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      delete: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    };
    return icons[action] || icons.access;
  };

  const isAnomaly = (log) => {
    return anomalies.some(a => a.logId === log._id);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'anomaly') return isAnomaly(log);
    if (filter === 'normal') return !isAnomaly(log);
    return true;
  });

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-3">Loading security logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-1">
                Security Anomalies Detected ({anomalies.length})
              </h3>
              <div className="space-y-2 mt-3">
                {anomalies.slice(0, 3).map((anomaly) => (
                  <div key={anomaly._id} className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-red-900">{anomaly.type}</p>
                        <p className="text-sm text-gray-700 mt-1">{anomaly.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="badge badge-error ml-3">High Risk</span>
                    </div>
                  </div>
                ))}
              </div>
              {anomalies.length > 3 && (
                <button className="text-sm text-red-700 hover:text-red-800 font-medium mt-3">
                  View all {anomalies.length} anomalies →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
              <p className="text-sm text-gray-500">{filteredLogs.length} entries</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('normal')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'normal' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilter('anomaly')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'anomaly' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anomalies ({anomalies.length})
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.map((log) => {
            const hasAnomaly = isAnomaly(log);
            return (
              <div
                key={log._id}
                className={`p-4 rounded-lg border transition-colors ${
                  hasAnomaly 
                    ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      hasAnomaly ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{log.userId || 'System'}</p>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600 capitalize">{log.action}</span>
                        {hasAnomaly && (
                          <span className="badge badge-error ml-2">⚠ Anomaly</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        {log.resource ? `Accessed: ${log.resource}` : log.description}
                      </p>
                      {log.patientId && (
                        <p className="text-xs text-gray-500 mt-1">Patient ID: {log.patientId}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.ipAddress && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
