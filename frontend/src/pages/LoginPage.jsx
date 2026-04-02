import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '🧠', title: 'RAG Diagnostics', desc: 'AI-powered diagnostic indexing with BERT MiniLM embeddings' },
  { icon: '💳', title: 'AI Billing Agent', desc: 'Automated billing analysis and insurance claim processing' },
  { icon: '🛡️', title: 'Security Agent', desc: 'Real-time anomaly detection with full audit trail logging' },
  { icon: '💬', title: 'NLP Chatbot',   desc: 'Intelligent clinical assistant for fast patient data retrieval' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '', role: 'doctor' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password, form.role);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[54%] p-12 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #0f172a 0%, #0c1a2e 60%, #0a2540 100%)' }}>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5"
             style={{
               backgroundImage: 'linear-gradient(rgba(14,165,233,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.6) 1px, transparent 1px)',
               backgroundSize: '48px 48px',
             }} />

        {/* Glow orbs */}
        <div className="absolute top-24 left-16 w-72 h-72 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
        <div className="absolute bottom-32 right-8 w-56 h-56 rounded-full opacity-8"
             style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 animate-slide-in-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                 style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)' }}>
              🏥
            </div>
            <div>
              <div className="text-white text-2xl font-bold tracking-tight">IMHAS</div>
              <div className="text-xs" style={{ color: '#0ea5e9' }}>Intelligent Multi-Agent Hospital System</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 animate-fade-in-up delay-100">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            The future of<br />
            <span style={{ color: '#0ea5e9' }}>clinical intelligence</span><br />
            is here.
          </h1>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            A multi-agent AI platform built for modern hospitals — from intake to discharge, fully automated.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                   className="flex items-start gap-4 p-4 rounded-xl animate-fade-in-up"
                   style={{
                     background: 'rgba(255,255,255,0.04)',
                     border: '1px solid rgba(255,255,255,0.07)',
                     animationDelay: `${0.15 + i * 0.08}s`,
                   }}>
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <div className="text-white font-semibold text-sm">{f.title}</div>
                  <div className="text-slate-400 text-xs mt-0.5 leading-snug">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div className="relative z-10 flex items-center gap-2 animate-fade-in-up delay-400">
          <span className="text-sm" style={{ color: '#22c55e' }}>🔒</span>
          <span className="text-xs text-slate-400">Secured with audit logging &amp; real-time anomaly detection</span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            HIPAA-Ready
          </span>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-3xl">🏥</span>
            <span className="text-xl font-bold text-slate-900">IMHAS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your clinical dashboard</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
                 style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="doctor">👨‍⚕️  Doctor</option>
                <option value="nurse">👩‍⚕️  Nurse</option>
                <option value="admin">🖥️  Administrator</option>
                <option value="receptionist">📋  Receptionist</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@hospital.org"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary justify-center py-3 text-base mt-1"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <><span className="animate-spin text-lg">⟳</span> Signing in…</>
              ) : (
                <><span>→</span> Sign in to Dashboard</>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-8 flex items-center gap-2 p-3 rounded-xl"
               style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span className="text-sm">🛡️</span>
            <span className="text-xs text-emerald-700 font-medium">
              Secured with audit logging &amp; anomaly detection
            </span>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            IMHAS v2.0 · All access is logged and monitored
          </p>
        </div>
      </div>
    </div>
  );
}
