import { useNavigate } from 'react-router-dom';

const PatientCard = ({ patient }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    const statusConfig = {
      indexed: { class: 'badge-success', text: 'Indexed' },
      processing: { class: 'badge-warning', text: 'Processing' },
      pending: { class: 'badge-info', text: 'Pending' },
      error: { class: 'badge-error', text: 'Error' },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const status = getStatusBadge(patient.status || 'indexed');

  return (
    <div
      onClick={() => navigate(`/patient/${patient._id}`)}
      className="card hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {patient.name}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Age: {patient.age}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {patient.documentCount || 0} docs
              </span>
            </div>
            
            {patient.lastDiagnostic && (
              <p className="text-xs text-gray-500 mt-2 truncate">
                Last diagnostic: {new Date(patient.lastDiagnostic).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`badge ${status.class}`}>{status.text}</span>
          <span className="text-xs text-gray-400">
            ID: {patient._id.slice(-6)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {new Date(patient.createdAt).toLocaleString()}
        </div>
        
        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default PatientCard;
