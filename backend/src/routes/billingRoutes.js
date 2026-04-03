import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedModels = path.resolve(__dirname, '../../..', 'shared', 'models');

// Import shared models safely (Windows-compatible ESM)
let Patient, BillingProposal;
try {
  const pm = await import(pathToFileURL(path.join(sharedModels, 'Patient.js')).href);
  Patient = pm.default;
} catch {
  // Fallback to mongoose lazy model if shared model not found
  Patient = null;
}
try {
  const bm = await import(pathToFileURL(path.join(sharedModels, 'BillingProposal.js')).href);
  BillingProposal = bm.default;
} catch {
  BillingProposal = null;
}

function getBillingModel() {
  if (BillingProposal) return BillingProposal;
  try { return mongoose.model('BillingProposal'); } catch {
    const s = new mongoose.Schema({
      patientId: { type: mongoose.Schema.Types.Mixed },
      lineItems: [{ description: String, category: String, amount: Number }],
      itemizedBill: [{ description: String, category: String, amount: Number }],
      totalAmount: Number,
      totalOriginal: Number,
      totalOptimized: Number,
      savingsPercentage: Number,
      insuranceStatus: { type: String, default: 'pending' },
      approvalStatus: { type: String, default: 'pending_review' },
      reviewNote: String,
      reviewedBy: String,
      reviewedAt: Date,
      generatedBy: String,
    }, { timestamps: true });
    return mongoose.model('BillingProposal', s);
  }
}

function getPatientModel() {
  if (Patient) return Patient;
  try { return mongoose.model('Patient'); } catch { return null; }
}

const router = express.Router();

// GET /api/billing/:patientId
router.get('/:patientId', authenticate, async (req, res) => {
  try {
    const bills = await getBillingModel().find({ patientId: req.params.patientId }).sort({ createdAt: -1 }).lean();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:patientId/generate
router.post('/:patientId/generate', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { patientName } = req.body;

    // Try to enqueue billing agent
    try {
      const { billingQueue } = await import('../queues/index.js');
      await billingQueue.add('generate-itemized-bill', {
        patientId,
        patientName,
        requestedBy: req.user?.name || 'doctor',
        generateItemized: true,
      });
      return res.json({ queued: true, message: 'Itemized bill generation queued. Refresh in a few seconds.' });
    } catch {}

    // Fallback: create bill directly
    const lineItems = [
      { description: 'Consultation Fee', category: 'Consultation', amount: 500 },
      { description: 'AI Diagnostic Analysis', category: 'AI Services', amount: 200 },
      { description: 'Document Processing', category: 'Administrative', amount: 100 },
    ];

    try {
      const Diagnostic = mongoose.model('Diagnostic');
      const diagCount = await Diagnostic.countDocuments({ patientId });
      if (diagCount > 0) lineItems.push({ description: `AI Diagnosis (x${diagCount})`, category: 'AI Services', amount: diagCount * 150 });
    } catch {}

    const totalAmount = lineItems.reduce((s, i) => s + i.amount, 0);

    const bill = await getBillingModel().create({
      patientId,
      lineItems,
      itemizedBill: lineItems,
      totalAmount,
      totalOriginal: totalAmount,
      totalOptimized: totalAmount,
      savingsPercentage: 0,
      insuranceStatus: 'pending',
      approvalStatus: 'pending_review',
      generatedBy: 'fallback',
    });

    res.json({ bill, message: 'Bill created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:id/review
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { approvalStatus, reviewNote, reviewedBy } = req.body;
    const bill = await getBillingModel().findByIdAndUpdate(
      req.params.id,
      { approvalStatus, reviewNote, reviewedBy, reviewedAt: new Date() },
      { new: true }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
