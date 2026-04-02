import { useNavigate } from 'react-router-dom';

const AVATAR_COLORS = ['#0ea5e9','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4'];
function avatarColor(name) {
  return AVATAR_COLORS[(name || 'P').charCodeAt(0) % AVATAR_COLORS.length];
}

export default function PatientCard({ patient }) {
  const navigate = useNavigate();
  const initials = patient.name
    ? patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'P';
  const color = avatarColor(patient.name);

  return (
    <div
      onClick={() => navigate(`/patients/${patient._id}`)}
      className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all group"
      style={{ background:'white', border:'1px solid #e2e8f0' }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderLeft = `3px solid ${color}`;
        e.currentTarget.style.transform  = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderLeft = '1px solid #e2e8f0';
        e.currentTarget.style.transform  = 'translateY(0)';
      }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
           style={{ background: color }}>
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm truncate">{patient.name}</div>
        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
          {patient.age && <span>Age {patient.age}</span>}
          {patient.age && patient._id && <span>·</span>}
          {patient._id && <span className="font-mono">{patient._id.slice(-6).toUpperCase()}</span>}
          {patient.documents?.length > 0 && (
            <><span>·</span><span>📄 {patient.documents.length} doc{patient.documents.length>1?'s':''}</span></>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="badge badge-success text-xs">Active</span>
        {patient.createdAt && (
          <span className="text-xs text-slate-400">{new Date(patient.createdAt).toLocaleDateString()}</span>
        )}
      </div>

      <span className="text-slate-300 group-hover:text-slate-500 transition-colors ml-1">›</span>
    </div>
  );
}
