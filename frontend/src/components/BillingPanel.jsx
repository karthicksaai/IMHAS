import { useState, useEffect, useRef } from 'react';
import { billingApi } from '../api/billingApi';
import { useAuth } from '../context/AuthContext';
import {
  FileText, CheckCircle2, XCircle, Printer,
  ChevronRight, Loader2, AlertTriangle
} from 'lucide-react';

const API = 'http://localhost:5000';
const INSURANCE_STEPS = ['Generated', 'Submitted', 'Under Review', 'Approved'];

function InsuranceStepper({ status }) {
  const statusMap = { pending: 0, submitted: 1, under_review: 2, approved: 3, rejected: -1 };
  const current = statusMap[status] ?? 0;
  const rejected = status === 'rejected';
  return (
    <div className="flex items-center gap-0 mt-3">
      {INSURANCE_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
              rejected ? 'border-[#dc2626] bg-[#dc2626]/10 text-[#dc2626]' :
              i < current ? 'border-[#16a34a] bg-[#16a34a] text-white' :
              i === current ? 'border-[#2563eb] bg-[#2563eb] text-white' :
              'border-[#e5e7eb] bg-white text-[#6b7280]'
            }`}>
              {rejected ? 'X' : i < current ? '✓' : i + 1}
            </div>
            <p className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
              i === current && !rejected ? 'text-[#2563eb]' : i < current ? 'text-[#16a34a]' : 'text-[#6b7280]'
            }`}>{step}</p>
          </div>
          {i < INSURANCE_STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-1 mb-4 ${i < current ? 'bg-[#16a34a]' : 'bg-[#e5e7eb]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function BillCard({ bill, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const printRef = useRef(null);

  const statusColor = bill.approvalStatus === 'approved' ? '#16a34a' : bill.approvalStatus === 'rejected' ? '#dc2626' : '#d97706';
  const statusLabel = bill.approvalStatus === 'approved' ? 'Approved' : bill.approvalStatus === 'rejected' ? 'Rejected' : 'Pending Review';

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Invoice</title><style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:8px 12px;font-size:13px}th{background:#f9fafb;font-weight:600}.reasoning{font-size:12px;color:#6b7280;margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  }

  const items = bill.lineItems || bill.itemizedBill || [];
  const total = bill.totalAmount || bill.totalOptimized || 0;

  return (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <ChevronRight className={`w-4 h-4 text-[#6b7280] shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <FileText className="w-4 h-4 text-[#6b7280] shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900">
            Invoice · {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
        <span className="text-xs font-medium shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#e5e7eb]" ref={printRef}>

          {/* AI reasoning banner */}
          {bill.aiReasoning && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">AI Billing Summary</p>
              <p className="text-xs text-blue-800 leading-relaxed">{bill.aiReasoning}</p>
            </div>
          )}

          {/* Line items table */}
          {items.length > 0 ? (
            <div className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="text-left py-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Description</th>
                    <th className="text-left py-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Category</th>
                    <th className="text-right py-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5">
                        <p className="text-gray-900 font-medium">{item.description || item.name}</p>
                        {item.rationale && (
                          <p className="text-[11px] text-[#6b7280] mt-0.5">{item.rationale}</p>
                        )}
                      </td>
                      <td className="py-2.5 text-[#6b7280] text-xs">{item.category || '—'}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">
                        ₹{(item.amount || item.cost || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={2} className="py-2.5 font-bold text-gray-900">Total</td>
                    <td className="py-2.5 text-right font-bold text-gray-900 text-base">₹{total.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#6b7280]">No itemized breakdown available.</p>
          )}

          {/* Savings */}
          {bill.savingsPercentage > 0 && (
            <p className="mt-2 text-xs text-[#16a34a] font-medium">
              ✓ AI optimization applied — {bill.savingsPercentage.toFixed(1)}% discount
            </p>
          )}

          {/* Insurance stepper */}
          <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Insurance Claim Status</p>
            <InsuranceStepper status={bill.insuranceStatus || 'pending'} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e5e7eb]">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-gray-900 border border-[#e5e7eb] rounded-lg px-3 py-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Export PDF
            </button>

            {bill.approvalStatus === 'pending_review' && (
              <div className="flex items-center gap-2">
                {reviewing ? (
                  <>
                    <input
                      type="text"
                      placeholder="Review note (optional)"
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    />
                    <button onClick={() => setReviewing(false)} className="text-xs text-[#6b7280] border border-[#e5e7eb] rounded-lg px-2 py-1.5">Cancel</button>
                    <button
                      onClick={() => { onReject(bill._id, reviewNote); setReviewing(false); }}
                      className="flex items-center gap-1 text-xs text-white bg-[#dc2626] rounded-lg px-3 py-1.5 hover:bg-[#b91c1c]"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => { onApprove(bill._id, reviewNote); setReviewing(false); }}
                      className="flex items-center gap-1 text-xs text-white bg-[#16a34a] rounded-lg px-3 py-1.5 hover:bg-[#15803d]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setReviewing(true)}
                    className="text-xs text-[#2563eb] font-medium hover:underline"
                  >
                    Review Proposal
                  </button>
                )}
              </div>
            )}
          </div>

          {bill.approvalStatus !== 'pending_review' && bill.reviewedBy && (
            <p className="mt-2 text-[10px] text-[#6b7280]">
              Reviewed by <strong>{bill.reviewedBy}</strong>
              {bill.reviewNote && <> · "{bill.reviewNote}"</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function BillingPanel({ patientId, patientName }) {
  const { token, user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pollMsg, setPollMsg] = useState('');
  const pollRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  const loadBills = async () => {
    try {
      const res = await fetch(`${API}/api/billing/${patientId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProposals(Array.isArray(data) ? data : (data.proposals || []));
        return Array.isArray(data) ? data.length : (data.proposals?.length || 0);
      }
    } catch {}
    finally { setLoading(false); }
    return 0;
  };

  useEffect(() => { loadBills(); }, [patientId]);

  // Poll every 3s until a new bill appears (Gemini can take 10-20s)
  function startPolling(prevCount) {
    let attempts = 0;
    const maxAttempts = 15; // 45 seconds max
    setPollMsg('Generating bill with AI... this takes ~15 seconds');

    pollRef.current = setInterval(async () => {
      attempts++;
      const count = await loadBills();
      if (count > prevCount) {
        // New bill arrived
        clearInterval(pollRef.current);
        setPollMsg('');
        setGenerating(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        setPollMsg('Bill generation is taking longer than expected. Refresh manually.');
        setGenerating(false);
      }
    }, 3000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleGenerate() {
    setGenerating(true);
    setPollMsg('');
    try {
      const res = await fetch(`${API}/api/billing/${patientId}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName }),
      });
      if (res.ok) {
        const prevCount = proposals.length;
        startPolling(prevCount);
      } else {
        const err = await res.json().catch(() => ({}));
        setPollMsg(`Error: ${err.error || 'Failed to start bill generation'}`);
        setGenerating(false);
      }
    } catch (e) {
      setPollMsg(`Network error: ${e.message}`);
      setGenerating(false);
    }
  }

  async function handleApprove(id, reviewNote) {
    try {
      await billingApi.reviewBilling(id, { approvalStatus: 'approved', reviewNote, reviewedBy: user?.name || 'doctor' }, token);
      setProposals(prev => prev.map(p => p._id === id ? { ...p, approvalStatus: 'approved', reviewNote, reviewedBy: user?.name } : p));
    } catch {}
  }

  async function handleReject(id, reviewNote) {
    try {
      await billingApi.reviewBilling(id, { approvalStatus: 'rejected', reviewNote, reviewedBy: user?.name || 'doctor' }, token);
      setProposals(prev => prev.map(p => p._id === id ? { ...p, approvalStatus: 'rejected', reviewNote, reviewedBy: user?.name } : p));
    } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Billing Intelligence</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">AI-generated itemized invoice from patient medical history</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><FileText className="w-4 h-4" /> Generate Bill</>
          }
        </button>
      </div>

      {/* Status message while polling */}
      {pollMsg && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          pollMsg.startsWith('Error') || pollMsg.includes('longer')
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-blue-50 border-blue-100 text-blue-700'
        }`}>
          {generating && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
          {pollMsg}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-[#6b7280]">Loading billing history...</div>
      ) : proposals.length === 0 ? (
        <div className="border border-[#e5e7eb] rounded-lg py-10 text-center">
          <FileText className="w-6 h-6 text-[#6b7280] mx-auto mb-2" />
          <p className="text-sm text-[#6b7280]">No bills generated yet.</p>
          <p className="text-xs text-[#6b7280] mt-1">Click "Generate Bill" to create an AI-powered itemized invoice.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Bill History ({proposals.length})</p>
          {proposals.map(bill => (
            <BillCard key={bill._id} bill={bill} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </div>
  );
}
