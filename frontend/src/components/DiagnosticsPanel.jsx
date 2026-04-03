import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { diagnosticsApi } from '../api/diagnosticsApi';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Zap, AlertTriangle } from 'lucide-react';

const API = 'http://localhost:5000';

function ConfidenceBar({ score }) {
  const color = score >= 75 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-[#6b7280] mb-1">
        <span>Confidence</span>
        <span style={{ color }} className="font-semibold">{score}%</span>
      </div>
      <div className="h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function XAIPanel({ diagnostic }) {
  const chunks = diagnostic.retrievedChunks || [];
  const topScore = chunks.length > 0 ? Math.max(...chunks.map(c => c.similarity || 0)) : null;
  return (
    <div className="mt-3 border border-[#e5e7eb] rounded-lg p-3 bg-gray-50 text-xs space-y-1.5">
      <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Explainability Breakdown</p>
      <p className="text-[#6b7280]">Evidence chunks retrieved: <span className="text-gray-900 font-medium">{chunks.length}</span></p>
      {topScore !== null && (
        <p className="text-[#6b7280]">Top chunk similarity score: <span className="text-gray-900 font-medium">{(topScore * 100).toFixed(1)}%</span></p>
      )}
      {chunks[0]?.text && (
        <p className="text-[#6b7280]">Answer grounded in: <em className="text-gray-800 not-italic">"{chunks[0].text.slice(0, 120)}{chunks[0].text.length > 120 ? '...' : ''}"</em></p>
      )}
    </div>
  );
}

function DiagnosticCard({ d, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showXAI, setShowXAI] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const statusColor = d.approvalStatus === 'approved' ? '#16a34a' : d.approvalStatus === 'rejected' ? '#dc2626' : '#d97706';
  const statusLabel = d.approvalStatus === 'approved' ? 'Approved' : d.approvalStatus === 'rejected' ? 'Rejected' : 'Pending Review';

  return (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      {/* Collapsed header - always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-[#6b7280] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#6b7280] shrink-0" />}
        <p className="flex-1 text-sm font-medium text-gray-900 truncate">{d.question}</p>
        <span className="text-xs font-medium shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
        <span className="text-xs text-[#6b7280] shrink-0">{new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#e5e7eb]">
          {/* Doctor question bubble */}
          <div className="flex justify-end mt-3">
            <div className="max-w-sm bg-[#2563eb] text-white text-sm px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
              {d.question}
            </div>
          </div>

          {/* AI answer bubble */}
          {d.rejected ? (
            <div className="flex mt-3">
              <div className="max-w-lg bg-[#dc2626]/5 border border-[#dc2626]/20 text-sm px-3.5 py-2.5 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
                  <span className="text-xs font-semibold text-[#dc2626]">Rejected — Insufficient Evidence</span>
                </div>
                <p className="text-[#6b7280] text-xs">{d.rejectionReason}</p>
              </div>
            </div>
          ) : (
            <div className="flex mt-3">
              <div className="max-w-2xl bg-gray-50 border border-[#e5e7eb] text-sm px-3.5 py-2.5 rounded-2xl rounded-tl-sm">
                <div className="prose prose-sm max-w-none text-gray-900 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{d.response || ''}</ReactMarkdown>
                </div>
                {d.confidence !== undefined && <ConfidenceBar score={d.confidence} />}

                {/* Explainability toggle */}
                <button
                  onClick={() => setShowXAI(v => !v)}
                  className="mt-2 text-xs text-[#2563eb] hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  {showXAI ? 'Hide' : 'Show'} explainability breakdown
                </button>
                {showXAI && <XAIPanel diagnostic={d} />}

                {/* Source evidence toggle */}
                {d.retrievedChunks?.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowEvidence(v => !v)}
                      className="mt-1.5 text-xs text-[#6b7280] hover:text-gray-900 underline underline-offset-2"
                    >
                      View Source Evidence ({d.retrievedChunks.length} passages)
                    </button>
                    {showEvidence && (
                      <div className="mt-2 space-y-2">
                        {d.retrievedChunks.map((chunk, idx) => (
                          <div key={idx} className="border border-[#e5e7eb] rounded-lg p-2.5 bg-white">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="font-semibold text-[#6b7280]">Evidence {idx + 1}</span>
                              <span className={`font-semibold ${
                                (chunk.similarity || 0) >= 0.8 ? 'text-[#16a34a]' :
                                (chunk.similarity || 0) >= 0.6 ? 'text-[#d97706]' : 'text-[#dc2626]'
                              }`}>{((chunk.similarity || 0) * 100).toFixed(1)}% match</span>
                            </div>
                            <p className="text-xs text-[#6b7280] italic">"{chunk.text}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Approve / Reject — HITL */}
          {d.approvalStatus === 'pending_review' && !d.rejected && (
            <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
              {reviewing ? (
                <div className="space-y-2">
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Optional review note..."
                    className="w-full px-3 py-2 text-xs border border-[#e5e7eb] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                    rows={2}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setReviewing(false)} className="px-3 py-1.5 text-xs text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={() => { onReject(d._id, reviewNote); setReviewing(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => { onApprove(d._id, reviewNote); setReviewing(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#16a34a] rounded-lg hover:bg-[#15803d] transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => setReviewing(true)}
                    className="text-xs text-[#2563eb] font-medium hover:underline"
                  >
                    Review this diagnosis
                  </button>
                </div>
              )}
            </div>
          )}

          {d.approvalStatus !== 'pending_review' && d.reviewedBy && (
            <p className="mt-3 text-[10px] text-[#6b7280] pt-2 border-t border-[#e5e7eb]">
              Reviewed by <strong>{d.reviewedBy}</strong> on {new Date(d.reviewedAt).toLocaleString('en-IN')}
              {d.reviewNote && <> · {d.reviewNote}</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPanel({ patientId }) {
  const { token, user } = useAuth();
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadDiagnostics = async () => {
    try {
      const data = await diagnosticsApi.getPatientDiagnostics(patientId);
      setDiagnostics(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadDiagnostics(); }, [patientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const result = await diagnosticsApi.createDiagnostic({ patientId, question: question.trim() });
      setQuestion('');
      setTimeout(async () => {
        try {
          const updated = await diagnosticsApi.getDiagnostic(result.diagnosticId);
          setDiagnostics(prev => [updated, ...prev]);
        } catch { loadDiagnostics(); }
      }, 4000);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  async function handleApprove(id, reviewNote) {
    try {
      const updated = await diagnosticsApi.reviewDiagnostic(id, {
        approvalStatus: 'approved', reviewNote, reviewedBy: user?.name || 'doctor',
      });
      setDiagnostics(prev => prev.map(d => d._id === id ? (updated.diagnostic || updated) : d));
    } catch {}
  }

  async function handleReject(id, reviewNote) {
    try {
      const updated = await diagnosticsApi.reviewDiagnostic(id, {
        approvalStatus: 'rejected', reviewNote, reviewedBy: user?.name || 'doctor',
      });
      setDiagnostics(prev => prev.map(d => d._id === id ? (updated.diagnostic || updated) : d));
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* HITL disclaimer */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-[#d97706]/5 border border-[#d97706]/20">
        <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
        <p className="text-xs text-[#6b7280]">
          <span className="font-semibold text-gray-900">Human-in-the-Loop:</span> All AI responses require doctor approval before becoming part of the official patient record. Responses below 60% confidence are automatically flagged.
        </p>
      </div>

      {/* Question form */}
      <form onSubmit={handleSubmit} className="border border-[#e5e7eb] rounded-lg p-4">
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Ask a clinical question</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="E.g., Does this patient have any drug allergies? What medications are they on?"
          className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
          rows={3}
          disabled={submitting}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[#6b7280]">Powered by RAG + Gemini gemini-2.5-flash</span>
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Analyzing...' : 'Get Diagnosis'}
          </button>
        </div>
      </form>

      {/* History */}
      {loadingHistory ? (
        <div className="py-8 text-center text-sm text-[#6b7280]">Loading diagnostics...</div>
      ) : diagnostics.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-[#6b7280]">No diagnostics yet. Submit a question above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">History ({diagnostics.length})</p>
          {diagnostics.map(d => (
            <DiagnosticCard key={d._id} d={d} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </div>
  );
}
