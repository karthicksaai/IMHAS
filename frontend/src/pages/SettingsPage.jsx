import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Server, Info } from 'lucide-react';

const API = 'http://localhost:5000';

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-[#e5e7eb]">{title}</h2>
      {children}
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="flex items-center py-3 border-b border-[#e5e7eb] last:border-0">
      <span className="w-48 text-sm text-[#6b7280] shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [sysHealth, setSysHealth] = useState(null);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/api/health/system`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setSysHealth)
      .catch(() => {});
  }, [token]);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      setPwMsg({ ok: res.ok, text: data.message || (res.ok ? 'Password updated.' : 'Failed.') });
      if (res.ok) setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      setPwMsg({ ok: false, text: 'Network error.' });
    }
  }

  function ServiceStatus({ label, up }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#e5e7eb] last:border-0">
        <span className="text-sm text-gray-900">{label}</span>
        <div className="flex items-center gap-1.5">
          {up ? (
            <><CheckCircle className="w-4 h-4 text-[#16a34a]" /><span className="text-xs text-[#16a34a] font-medium">Connected</span></>
          ) : (
            <><XCircle className="w-4 h-4 text-[#dc2626]" /><span className="text-xs text-[#dc2626] font-medium">Disconnected</span></>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="px-8 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Manage your account and system preferences</p>
        </div>

        <Section title="Profile">
          <div className="border border-[#e5e7eb] rounded-lg px-4">
            <FieldRow label="Full Name" value={user?.name} />
            <FieldRow label="Email" value={user?.email} />
            <FieldRow label="Role" value={user?.role} />
          </div>
        </Section>

        <Section title="Change Password">
          <form onSubmit={handleChangePassword} className="border border-[#e5e7eb] rounded-lg p-4 space-y-3">
            {['current', 'next', 'confirm'].map(f => (
              <div key={f}>
                <label className="block text-xs text-[#6b7280] mb-1 capitalize">
                  {f === 'next' ? 'New Password' : f === 'confirm' ? 'Confirm New Password' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={pwForm[f]}
                  onChange={e => setPwForm(prev => ({ ...prev, [f]: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-xs font-medium ${ pwMsg.ok ? 'text-[#16a34a]' : 'text-[#dc2626]' }`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors"
            >
              Update Password
            </button>
          </form>
        </Section>

        <Section title="System Info">
          <div className="border border-[#e5e7eb] rounded-lg px-4">
            <ServiceStatus label="MongoDB" up={sysHealth?.mongodb === 'ok'} />
            <ServiceStatus label="Redis (Upstash)" up={sysHealth?.redis === 'ok'} />
            <ServiceStatus label="Gemini API" up={sysHealth?.gemini === 'ok'} />
          </div>
        </Section>

        <Section title="About">
          <div className="border border-[#e5e7eb] rounded-lg px-4">
            <FieldRow label="Version" value="IMHAS v2.0" />
            <FieldRow label="Frontend" value="React 18 + Vite + Tailwind CSS" />
            <FieldRow label="Backend" value="Node.js + Express" />
            <FieldRow label="AI Model" value="Google Gemini 2.5 Flash" />
            <FieldRow label="Embeddings" value="gemini-embedding-001 (768 dims)" />
            <FieldRow label="Queue" value="BullMQ + Upstash Redis" />
            <FieldRow label="Database" value="MongoDB (hospital-ai)" />
          </div>
        </Section>
      </div>
    </Layout>
  );
}
