import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function BillingProposal() { return mongoose.model('BillingProposal'); }

// GET /api/billing/:patientId — bill history
router.get('/:patientId', authenticate, async (req, res) => {
  try {
    const bills = await BillingProposal().find({ patientId: req.params.patientId }).sort({ createdAt: -1 }).lean();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:patientId/generate — AI-generated itemized bill
router.post('/:patientId/generate', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { patientName } = req.body;

    // Try to enqueue billing agent job
    try {
      const { billingQueue } = await import('../queues/index.js');
      await billingQueue.add('generate-itemized-bill', {
        patientId,
        patientName,
        requestedBy: req.user?.name || 'doctor',
        generateItemized: true,
      });
      return res.json({ queued: true, message: 'Itemized bill generation queued. Refresh in a few seconds.' });
    } catch (qErr) {
      // Queue unavailable — create a placeholder bill directly
      console.warn('Billing queue unavailable, creating placeholder bill:', qErr.message);
    }

    // Fallback: create a basic itemized bill from patient history
    const Patient = mongoose.model('Patient');
    const patient = await Patient.findById(patientId).lean();

    const lineItems = [
      { description: 'Consultation Fee', category: 'Consultation', amount: 500 },
      { description: 'AI Diagnostic Analysis', category: 'AI Services', amount: 200 },
      { description: 'Document Processing', category: 'Administrative', amount: 100 },
    ];

    // Count diagnostics for this patient
    try {
      const Diagnostic = mongoose.model('Diagnostic');
      const diagCount = await Diagnostic.countDocuments({ patientId });
      if (diagCount > 0) {
        lineItems.push({ description: `AI Diagnosis (x${diagCount})`, category: 'AI Services', amount: diagCount * 150 });
      }
    } catch {}

    const totalAmount = lineItems.reduce((s, i) => s + i.amount, 0);

    const bill = await BillingProposal().create({
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

// POST /api/billing/:id/review — approve or reject a billing proposal
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { approvalStatus, reviewNote, reviewedBy } = req.body;
    const bill = await BillingProposal().findByIdAndUpdate(
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
