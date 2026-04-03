import { useState, useEffect } from 'react';
import { billingApi } from '../api/billingApi';
import { useApp } from '../context/AppContext';

const BillingPanel = ({ patientId, patientName }) => {
  const { addNotification, user } = useApp();
  const [treatments, setTreatments] = useState([{ name: '', cost: '' }]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drugWarnings, setDrugWarnings] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => { loadProposals(); }, [patientId]);

  const loadProposals = async () => {
    const data = await billingApi.getBillingProposals(patientId);
    setProposals(data);
  };

  const addTreatment = () => setTreatments([...treatments, { name: '', cost: '' }]);
  const removeTreatment = (i) => setTreatments(treatments.filter((_, idx) => idx !== i));
  const updateTreatment = (i, field, value) => {
    const updated = [...treatments];
    updated[i][field] = value;
    setTreatments(updated);
  };

  const handleOptimize = async () => {
    const valid = treatments.filter((t) => t.name && t.cost);
    if (valid.length === 0) { addNotification({ type: 'error', message: 'Add at least one treatment' }); return; }
    setLoading(true);
    setDrugWarnings([]);
    try {
      const result = await billingApi.optimizeBilling({ patientId, treatments: valid.map((t) => ({ name: t.name, cost: parseFloat(t.cost) })) });

      // Show drug interaction warnings returned immediately from backend
      if (result.drugInteractionWarnings?.length > 0) {
        setDrugWarnings(result.drugInteractionWarnings);
        if (result.hasCriticalInteractions) {
          addNotification({ type: 'error', message: ' Critical drug interactions detected — review required before proceeding' });
        } else {
          addNotification({ type: 'error', message: ' Drug interaction warnings found — see details below' });
        }
      }

      addNotification({ type: 'success', message: 'Billing optimization queued — refresh in a moment' });
      setTimeout(loadProposals, 4000);
    } catch (error) {
      addNotification({ type: 'error', message: error.message });
    } finally { setLoading(false); }
  };

  const handleReview = async (id, approvalStatus) => {
    try {
      await billingApi.reviewBilling(id, { approvalStatus, reviewNote, reviewedBy: user?.name || 'doctor' });
      setProposals((prev) => prev.map((p) => p._id === id ? { ...p, approvalStatus, reviewNote, reviewedBy: user?.name } : p));
      setReviewingId(null);
      setReviewNote('');
      addNotification({ type: 'success', message: `Billing proposal ${approvalStatus}` });
    } catch { addNotification({ type: 'error', message: 'Failed to submit review' }); }
  };

  const calculateTotal = () => treatments.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);

  return (
    <div className="space-y-6">

      {/* Treatment input form */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Billing Optimization</h3>
            <p className="text-sm text-gray-500">
              AI optimizes costs — includes drug interaction check before processing
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {treatments.map((t, i) => (
            <div key={i} className="flex gap-3 items-start">
              <input type="text" placeholder="Treatment / Medication name" value={t.name} onChange={(e) => updateTreatment(i, 'name', e.target.value)} className="input-field flex-1" />
              <input type="number" placeholder="Cost ($)" value={t.cost} onChange={(e) => updateTreatment(i, 'cost', e.target.value)} className="input-field w-32" min="0" step="0.01" />
              {treatments.length > 1 && (
                <button onClick={() => removeTreatment(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <button onClick={addTreatment} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Treatment
          </button>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Total</p>
            <p className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</p>
          </div>
        </div>

        <button onClick={handleOptimize} disabled={loading} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
          {loading ? (
            <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Optimizing...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>Optimize Costs + Check Drug Safety</>
          )}
        </button>
      </div>

      {/* Drug Interaction Warnings */}
      {drugWarnings.length > 0 && (
        <div className="card bg-red-50 border-2 border-red-400">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl"></span>
            <h4 className="font-bold text-red-800">Drug Interaction Warning</h4>
          </div>
          <p className="text-sm text-red-700 mb-3">The following conflicts were detected between proposed treatments and this patient’s existing medications. Review before approving any billing proposal.</p>
          <div className="space-y-2">
            {drugWarnings.map((w, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                w.severity === 'critical' ? 'bg-red-100 border-red-300' :
                w.severity === 'high' ? 'bg-orange-100 border-orange-300' :
                'bg-yellow-100 border-yellow-300'
              }`}>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded mr-2 ${
                  w.severity === 'critical' ? 'bg-red-600 text-white' :
                  w.severity === 'high' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'
                }`}>{w.severity}</span>
                <strong>{w.drugs.join(' + ')}</strong> — {w.risk}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Proposals */}
      {proposals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Billing Proposals</h3>
          {proposals.map((p) => (
            <div key={p._id} className={`card border-l-4 ${
              p.approvalStatus === 'approved' ? 'border-l-green-500' :
              p.approvalStatus === 'rejected' ? 'border-l-red-500' :
              'border-l-yellow-400'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                    p.approvalStatus === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    p.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {p.approvalStatus === 'approved' ? ' Approved' : p.approvalStatus === 'rejected' ? ' Rejected' : '⏳ Pending Review'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Original</p>
                  <p className="text-xl font-bold text-gray-900">${p.totalOriginal?.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Optimized</p>
                  <p className="text-xl font-bold text-green-700">${p.totalOptimized?.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Savings</p>
                  <p className="text-xl font-bold text-blue-700">{p.savingsPercentage?.toFixed(1)}%</p>
                </div>
              </div>

              {p.optimizationStrategy && (
                <p className="text-xs text-gray-500 mb-3">Discounts applied: {p.optimizationStrategy}</p>
              )}

              {/* Approve / Reject */}
              {(!p.approvalStatus || p.approvalStatus === 'pending_review') && (
                <div className="border-t border-gray-200 pt-4">
                  {reviewingId === p._id ? (
                    <div className="space-y-3">
                      <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional review note" className="input-field text-sm min-h-[60px] resize-none" />
                      <div className="flex gap-3">
                        <button onClick={() => handleReview(p._id, 'approved')} className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"> Approve Billing Plan</button>
                        <button onClick={() => handleReview(p._id, 'rejected')} className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-sm"> Reject</button>
                        <button onClick={() => setReviewingId(null)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewingId(p._id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm">
                      Review Billing Proposal
                    </button>
                  )}
                </div>
              )}

              {p.approvalStatus !== 'pending_review' && p.reviewedBy && (
                <p className="text-xs text-gray-500 mt-3 border-t pt-2">
                  Reviewed by <strong>{p.reviewedBy}</strong>{p.reviewNote && <> — {p.reviewNote}</>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillingPanel;
