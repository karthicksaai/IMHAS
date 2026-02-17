import { useState } from 'react';
import { billingApi } from '../api/billingApi';
import { useApp } from '../context/AppContext';

const BillingPanel = ({ patientId, patientName }) => {
  const { addNotification } = useApp();
  const [treatments, setTreatments] = useState([{ name: '', cost: '' }]);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);

  const addTreatment = () => {
    setTreatments([...treatments, { name: '', cost: '' }]);
  };

  const removeTreatment = (index) => {
    setTreatments(treatments.filter((_, i) => i !== index));
  };

  const updateTreatment = (index, field, value) => {
    const updated = [...treatments];
    updated[index][field] = value;
    setTreatments(updated);
  };

  const handleOptimize = async () => {
    const validTreatments = treatments.filter(t => t.name && t.cost);
    
    if (validTreatments.length === 0) {
      addNotification({ type: 'error', message: 'Please add at least one treatment' });
      return;
    }

    setLoading(true);
    try {
      const result = await billingApi.optimizeBilling({
        patientId,
        treatments: validTreatments.map(t => ({
          name: t.name,
          cost: parseFloat(t.cost)
        }))
      });

      setOptimization(result);
      addNotification({ 
        type: 'success', 
        message: `Saved ${result.savings}% on treatment costs!` 
      });
    } catch (error) {
      addNotification({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return treatments.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Billing Optimization</h3>
            <p className="text-sm text-gray-500">Optimize treatment costs for {patientName}</p>
          </div>
        </div>

        <div className="space-y-4">
          {treatments.map((treatment, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Treatment/Medication name"
                  value={treatment.name}
                  onChange={(e) => updateTreatment(index, 'name', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  placeholder="Cost"
                  value={treatment.cost}
                  onChange={(e) => updateTreatment(index, 'cost', e.target.value)}
                  className="input-field"
                  min="0"
                  step="0.01"
                />
              </div>
              {treatments.length > 1 && (
                <button
                  onClick={() => removeTreatment(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={addTreatment}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Treatment
          </button>

          <div className="text-right">
            <p className="text-sm text-gray-600">Current Total</p>
            <p className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</p>
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Optimizing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Optimize Costs
            </>
          )}
        </button>
      </div>

      {/* Optimization Results */}
      {optimization && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Optimization Complete!</h3>
              <p className="text-sm text-gray-600">AI-powered cost analysis results</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Original Cost</p>
              <p className="text-2xl font-bold text-gray-900">${optimization.originalCost?.toFixed(2) || calculateTotal().toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Optimized Cost</p>
              <p className="text-2xl font-bold text-green-600">${optimization.optimizedCost?.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Savings</p>
              <p className="text-2xl font-bold text-green-600">{optimization.savings}%</p>
            </div>
          </div>

          {optimization.recommendations && optimization.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Optimized Treatment Plan</h4>
              <div className="space-y-2">
                {optimization.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{rec.name}</p>
                        {rec.alternative && (
                          <p className="text-xs text-gray-500">Alternative: {rec.alternative}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {rec.originalCost && (
                        <p className="text-xs text-gray-500 line-through">${rec.originalCost.toFixed(2)}</p>
                      )}
                      <p className="font-semibold text-green-600">${rec.cost.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {optimization.notes && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">{optimization.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingPanel;
