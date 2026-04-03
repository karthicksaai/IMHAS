import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { billingQueue } from '../queues/billingQueue.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedModels = path.resolve(__dirname, '../../..', 'shared', 'models');

let Patient, BillingProposal;
try {
  const pm = await import(pathToFileURL(path.join(sharedModels, 'Patient.js')).href);
  Patient = pm.default;
} catch {}
try {
  const bm = await import(pathToFileURL(path.join(sharedModels, 'BillingProposal.js')).href);
  BillingProposal = bm.default;
} catch {}

function getBillingModel() {
  if (BillingProposal) return BillingProposal;
  try { return mongoose.model('BillingProposal'); } catch {
    const s = new mongoose.Schema({
      patientId:        { type: mongoose.Schema.Types.Mixed },
      lineItems:        [{ description: String, category: String, amount: Number, rationale: String }],
      itemizedBill:     [{ description: String, category: String, amount: Number, rationale: String }],
      totalAmount:      Number,
      totalOriginal:    Number,
      totalOptimized:   Number,
      savingsPercentage:Number,
      insuranceStatus:  { type: String, default: 'pending' },
      approvalStatus:   { type: String, default: 'pending_review' },
      aiReasoning:      String,
      reviewNote:       String,
      reviewedBy:       String,
      reviewedAt:       Date,
      generatedBy:      String,
    }, { timestamps: true });
    return mongoose.model('BillingProposal', s);
  }
}

const router = express.Router();

// GET /api/billing/:patientId — list all bills for a patient
router.get('/:patientId', authenticate, async (req, res) => {
  try {
    const bills = await getBillingModel()
      .find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:patientId/generate — enqueue billing agent job
router.post('/:patientId/generate', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { patientName } = req.body;

    // Send job to billing-agent via BullMQ
    const job = await billingQueue.add('generate-itemized-bill', {
      patientId,
      patientName: patientName || 'Patient',
      requestedBy: req.user?.name || 'doctor',
    });

    console.log(`[Billing] Queued job ${job.id} for patient ${patientId}`);

    // Respond immediately — agent runs async in background
    res.json({
      queued: true,
      jobId: job.id,
      message: 'Bill generation started. It will appear in a few seconds — the page will refresh automatically.',
    });
  } catch (err) {
    console.error('[Billing] Failed to enqueue job:', err.message);
    res.status(500).json({ error: 'Failed to start bill generation. Is the billing agent running?', detail: err.message });
  }
});

// POST /api/billing/:id/review — approve or reject a bill
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { approvalStatus, reviewNote, reviewedBy } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: "approvalStatus must be 'approved' or 'rejected'" });
    }
    const bill = await getBillingModel().findByIdAndUpdate(
      req.params.id,
      { approvalStatus, reviewNote: reviewNote || '', reviewedBy: reviewedBy || 'doctor', reviewedAt: new Date() },
      { new: true }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
