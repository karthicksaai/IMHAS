import { useState, useEffect } from 'react';
import { diagnosticsApi } from '../api/diagnosticsApi';
import { useApp } from '../context/AppContext';

const DiagnosticsPanel = ({ patientId }) => {
  const { addNotification } = useApp();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadDiagnostics();
  }, [patientId]);

  const loadDiagnostics = async () => {
    try {
      const data = await diagnosticsApi.getPatientDiagnostics(patientId);
      setDiagnostics(data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to load diagnostics' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const result = await diagnosticsApi.createDiagnostic({
        patientId,
        question: question.trim(),
      });

      addNotification({ 
        type: 'success', 
        message: 'Diagnostic analysis completed!' 
      });

      setDiagnostics((prev) => [result, ...prev]);
      setSelectedDiagnostic(result);
      setQuestion('');
    } catch (error) {
      addNotification({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Diagnostics</h3>
            <p className="text-sm text-gray-500">Ask questions about patient's medical history</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., What are the patient's main symptoms? What diagnosis do you suggest?"
            className="input-field min-h-[100px] resize-none"
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Powered by:</span> RAG + BERT + Gemini LLM
            </p>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Diagnosis
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Diagnostic Results */}
      {loadingHistory ? (
        <div className="card text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-3">Loading diagnostics...</p>
        </div>
      ) : diagnostics.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No diagnostics yet</h3>
          <p className="mt-2 text-sm text-gray-500">Submit your first diagnostic query above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {diagnostics.map((diagnostic) => (
            <div key={diagnostic._id || diagnostic.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge badge-info">Diagnostic</span>
                  <span className="text-xs text-gray-500">
                    {new Date(diagnostic.createdAt).toLocaleString()}
                  </span>
                </div>
                {diagnostic.processingTime && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {diagnostic.processingTime}ms
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Question:</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{diagnostic.question}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">AI Response:</p>
                  <div className="text-gray-900 bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                    <p className="whitespace-pre-wrap leading-relaxed">{diagnostic.response}</p>
                  </div>
                </div>

                {diagnostic.retrievedChunks && diagnostic.retrievedChunks.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2">
                      <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      View Retrieved Context ({diagnostic.retrievedChunks.length} chunks)
                    </summary>
                    <div className="mt-3 space-y-2 pl-6">
                      {diagnostic.retrievedChunks.map((chunk, idx) => (
                        <div key={`${diagnostic._id}-chunk-${idx}`} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Chunk {idx + 1}</span>
                            {chunk.similarity && (
                              <span className="text-xs text-green-600 font-medium">
                                {(chunk.similarity * 100).toFixed(1)}% match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{chunk.text}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
