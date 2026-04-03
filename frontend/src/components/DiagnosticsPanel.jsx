import { useState, useEffect } from 'react';
import { diagnosticsApi } from '../api/diagnosticsApi';
import { useApp } from '../context/AppContext';

const CONFIDENCE_THRESHOLD = 60;

const ConfidenceBadge = ({ score }) => {
  const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  const label = score >= 80 ? 'High' : score >= 60 ? 'Moderate' : 'Low';
  const colorMap = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${colorMap[color]}`}>
      <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
      {label} Confidence — {score}%
    </span>
  );
};

const ApprovalBadge = ({ status }) => {
  const map = {
    pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels = { pending_review: '⏳ Awaiting Doctor Review', approved: ' Approved', rejected: ' Rejected' };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${map[status] || map.pending_review}`}>
      {labels[status] || 'Pending'}
    </span>
  );
};

const DiagnosticsPanel = ({ patientId }) => {
  const { addNotification, user } = useApp();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [drugCheckResult, setDrugCheckResult] = useState(null);
  const [drugCheckLoading, setDrugCheckLoading] = useState(false);
  const [proposedDrugInput, setProposedDrugInput] = useState('');

  useEffect(() => { loadDiagnostics(); }, [patientId]);

  const loadDiagnostics = async () => {
    try {
      const data = await diagnosticsApi.getPatientDiagnostics(patientId);
      setDiagnostics(data);
    } catch { addNotification({ type: 'error', message: 'Failed to load diagnostics' }); }
    finally { setLoadingHistory(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const result = await diagnosticsApi.createDiagnostic({ patientId, question: question.trim() });
      addNotification({ type: 'success', message: 'Diagnostic queued — refresh in a moment' });
      // Poll for result
      setTimeout(async () => {
        const updated = await diagnosticsApi.getDiagnostic(result.diagnosticId);
        setDiagnostics((prev) => [updated, ...prev]);
      }, 4000);
      setQuestion('');
    } catch (error) {
      addNotification({ type: 'error', message: error.message });
    } finally { setLoading(false); }
  };

  const handleReview = async (id, approvalStatus) => {
    try {
      const updated = await diagnosticsApi.reviewDiagnostic(id, {
        approvalStatus,
        reviewNote,
        reviewedBy: user?.name || 'doctor',
      });
      setDiagnostics((prev) => prev.map((d) => d._id === id ? updated.diagnostic : d));
      setReviewingId(null);
      setReviewNote('');
      addNotification({ type: 'success', message: `Diagnostic ${approvalStatus}` });
    } catch { addNotification({ type: 'error', message: 'Failed to submit review' }); }
  };

  const handleSecondOpinion = async (id) => {
    try {
      await diagnosticsApi.getSecondOpinion(id);
      addNotification({ type: 'success', message: 'Second opinion queued — refresh in a moment' });
      setTimeout(loadDiagnostics, 5000);
    } catch { addNotification({ type: 'error', message: 'Failed to request second opinion' }); }
  };

  const handleDrugCheck = async () => {
    if (!proposedDrugInput.trim()) return;
    setDrugCheckLoading(true);
    try {
      const drugs = proposedDrugInput.split(',').map((d) => d.trim()).filter(Boolean);
      const result = await diagnosticsApi.checkInteractions({ patientId, proposedDrugs: drugs });
      setDrugCheckResult(result);
    } catch { addNotification({ type: 'error', message: 'Drug check failed' }); }
    finally { setDrugCheckLoading(false); }
  };

  return (
    <div className="space-y-6">

      {/* Drug Interaction Checker */}
      <div className="card border-2 border-orange-200 bg-orange-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Drug Interaction Checker</h3>
            <p className="text-xs text-gray-500">Rule-based safety check — deterministic, no AI involved</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter proposed drugs (comma-separated): aspirin, warfarin"
            value={proposedDrugInput}
            onChange={(e) => setProposedDrugInput(e.target.value)}
            className="input-field flex-1"
          />
          <button
            onClick={handleDrugCheck}
            disabled={drugCheckLoading}
            className="btn-primary whitespace-nowrap"
          >
            {drugCheckLoading ? 'Checking...' : 'Check Safety'}
          </button>
        </div>

        {drugCheckResult && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${drugCheckResult.safe ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-400'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{drugCheckResult.safe ? '' : ''}</span>
              <p className={`font-bold ${drugCheckResult.safe ? 'text-green-800' : 'text-red-800'}`}>
                {drugCheckResult.message}
              </p>
            </div>
            {drugCheckResult.conflicts.length > 0 && (
              <div className="space-y-2 mt-3">
                {drugCheckResult.conflicts.map((c, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    c.severity === 'critical' ? 'bg-red-100 border-red-300' :
                    c.severity === 'high' ? 'bg-orange-100 border-orange-300' :
                    'bg-yellow-100 border-yellow-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        c.severity === 'critical' ? 'bg-red-600 text-white' :
                        c.severity === 'high' ? 'bg-orange-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>{c.severity}</span>
                      <span className="text-sm font-medium">{c.drugs.join(' + ')}</span>
                    </div>
                    <p className="text-sm mt-1">{c.risk}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Checked against patient’s {drugCheckResult.checkedAgainst.length} existing medication(s)
            </p>
          </div>
        )}
      </div>

      {/* Diagnostic Query */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Diagnostics</h3>
            <p className="text-sm text-gray-500">Answers grounded in patient’s own medical records</p>
          </div>
        </div>
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
           <strong>Human-in-the-Loop:</strong> All AI responses require doctor approval before becoming part of the official patient record. Responses below {CONFIDENCE_THRESHOLD}% confidence are automatically rejected.
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., Does this patient have any drug allergies? What medications are they on?"
            className="input-field min-h-[100px] resize-none"
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">Powered by RAG + Gemini gemini-embedding-001</p>
            <button type="submit" disabled={loading || !question.trim()} className="btn-primary flex items-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Analyzing...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Get Diagnosis</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loadingHistory ? (
        <div className="card text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : diagnostics.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No diagnostics yet. Submit a question above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {diagnostics.map((d) => (
            <div key={d._id} className={`card hover:shadow-md transition-shadow border-l-4 ${
              d.approvalStatus === 'approved' ? 'border-l-green-500' :
              d.approvalStatus === 'rejected' ? 'border-l-red-500' :
              'border-l-yellow-400'
            }`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.isSecondOpinion && (
                    <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold px-2 py-1 rounded-full">2nd Opinion</span>
                  )}
                  <ApprovalBadge status={d.approvalStatus} />
                  {d.confidence !== undefined && !d.rejected && <ConfidenceBadge score={d.confidence} />}
                </div>
                <span className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</span>
              </div>

              {/* Question */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">DOCTOR’S QUESTION</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">{d.question}</p>
              </div>

              {/* Rejected by confidence threshold */}
              {d.rejected ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-lg"></span>
                    <div>
                      <p className="font-semibold text-red-800 text-sm">AI Response Rejected — Insufficient Evidence</p>
                      <p className="text-red-700 text-sm mt-1">{d.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* AI Response */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">AI RESPONSE</p>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                      <p className="whitespace-pre-wrap leading-relaxed text-sm text-gray-900">{d.response}</p>
                    </div>
                  </div>

                  {/* Source Citations */}
                  {d.retrievedChunks && d.retrievedChunks.length > 0 && (
                    <details className="group mb-3">
                      <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                         View Source Evidence ({d.retrievedChunks.length} passages from patient’s documents)
                      </summary>
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200">
                        {d.retrievedChunks.map((chunk, idx) => (
                          <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-600">Evidence {idx + 1}</span>
                              <span className={`text-xs font-semibold ${
                                chunk.similarity >= 0.8 ? 'text-green-600' :
                                chunk.similarity >= 0.6 ? 'text-yellow-600' : 'text-red-500'
                              }`}>{(chunk.similarity * 100).toFixed(1)}% match</span>
                            </div>
                            <p className="text-sm text-gray-700 italic">“{chunk.text}”</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Approve / Reject — only show if pending */}
                  {d.approvalStatus === 'pending_review' && (
                    <div className="border-t border-gray-200 pt-4 mt-3">
                      {reviewingId === d._id ? (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Optional review note (e.g., confirmed with patient history)"
                            className="input-field text-sm min-h-[60px] resize-none"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReview(d._id, 'approved')}
                              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                               Approve — Add to Official Record
                            </button>
                            <button
                              onClick={() => handleReview(d._id, 'rejected')}
                              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                               Reject — Do Not Use
                            </button>
                            <button onClick={() => setReviewingId(null)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => setReviewingId(d._id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                          >
                            Review This Diagnosis
                          </button>
                          <button
                            onClick={() => handleSecondOpinion(d._id)}
                            className="px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 text-sm flex items-center gap-2"
                          >
                             Request Second Opinion
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show approval details if already reviewed */}
                  {d.approvalStatus !== 'pending_review' && d.reviewedBy && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <p className="text-xs text-gray-500">
                        Reviewed by <strong>{d.reviewedBy}</strong> on {new Date(d.reviewedAt).toLocaleString()}
                        {d.reviewNote && <> — Note: {d.reviewNote}</>}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
