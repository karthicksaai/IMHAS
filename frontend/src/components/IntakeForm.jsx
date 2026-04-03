import { useState, useRef } from 'react';
import { registerPatient } from '../api/patientApi';

export default function IntakeForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', bloodType: '', contact: '', address: '' });
  const [files, setFiles]     = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();

  const handleFiles = (incoming) => {
    setFiles(prev => [
      ...prev,
      ...Array.from(incoming).filter(f => !prev.find(p => p.name === f.name)),
    ]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Patient name is required.'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      // Backend reads req.files?.file - must use field name 'file'
      if (files.length > 0) fd.append('file', files[0]);
      await registerPatient(fd);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key:'name',    label:'Full Name *', placeholder:'Jane Doe',        type:'text'   },
    { key:'age',     label:'Age',         placeholder:'34',              type:'number' },
    { key:'contact', label:'Contact',     placeholder:'+91 98765 43210', type:'text'   },
    { key:'address', label:'Address',     placeholder:'City, State',     type:'text'   },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      <div className="-mx-5 -mt-5 px-5 py-4 rounded-t-xl flex items-center gap-3"
           style={{ background:'rgba(14,165,233,0.08)', borderBottom:'1px solid rgba(14,165,233,0.15)' }}>
        <div>
          <div className="font-bold text-slate-800 text-sm">New Patient Registration</div>
          <div className="text-xs text-slate-500">Fill in details and attach a medical document</div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm"
             style={{ background:'rgba(239,68,68,0.08)', color:'#b91c1c', border:'1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
            <input
              type={type}
              className="input-field"
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
          <select className="input-field" value={form.gender}
            onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Blood Type</label>
          <select className="input-field" value={form.bloodType}
            onChange={e => setForm(p => ({ ...p, bloodType: e.target.value }))}>
            <option value="">Select type</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Medical Document (PDF or TXT)</label>
        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <p className="text-sm font-medium text-slate-600">Drop file here or <span style={{ color:'#0ea5e9' }}>browse</span></p>
          <p className="text-xs text-slate-400 mt-1">PDF, TXT, DOCX -- Max 10MB</p>
          <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.doc,.docx"
            className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                   style={{ background: i === 0 ? '#f0fdf4' : '#fafafa', border: i === 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                {i === 0 && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Primary</span>}
                <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  style={{ background:'none', border:'none', cursor:'pointer' }}>x</button>
              </div>
            ))}
            {files.length > 1 && (
              <p className="text-xs text-amber-600 mt-1">Only the first file will be indexed for AI Diagnostics.</p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary justify-center py-3"
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Registering...' : 'Register Patient'}
      </button>
    </form>
  );
}
