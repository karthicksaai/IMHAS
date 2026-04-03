import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

// Resolve shared models folder: IMHAS/IMHAS/backend/src/routes/ -> up 3 = IMHAS/IMHAS/ -> + shared/models
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedModels = path.resolve(__dirname, '../../..', 'shared', 'models');

// pathToFileURL converts C:\...\Patient.js -> file:///C:/.../ (required for Windows ESM)
const { default: Patient } = await import(pathToFileURL(path.join(sharedModels, 'Patient.js')).href);
const { default: Document } = await import(pathToFileURL(path.join(sharedModels, 'Document.js')).href);

const router = express.Router();

// GET /api/patients
router.get('/', authenticate, async (req, res) => {
  try {
    const patients = await Patient.find({}).sort({ createdAt: -1 }).lean();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return res.status(404).json({ error: 'Not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const docs = await Document.find({ patientId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(docs);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/patients/:id/documents
router.post('/:id/documents', authenticate, async (req, res) => {
  try {
    const files = req.files?.documents;
    if (!files) return res.status(400).json({ error: 'No files uploaded' });
    const fileArray = Array.isArray(files) ? files : [files];
    const saved = [];
    for (const file of fileArray) {
      const doc = await Document.create({
        patientId: req.params.id,
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        uploadedAt: new Date(),
      });
      saved.push(doc);
    }
    try {
      const { ragIndexerQueue } = await import('../queues/index.js');
      for (const doc of saved) {
        await ragIndexerQueue.add('index', { patientId: req.params.id, documentId: doc._id.toString() });
      }
    } catch {}
    res.json({ documents: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/rag-status
router.get('/:id/rag-status', authenticate, async (req, res) => {
  try {
    const Embedding = mongoose.model('Embedding');
    const count = await Embedding.countDocuments({ patientId: req.params.id });
    res.json({ model: 'gemini-embedding-001', dimensions: 768, totalChunks: count, status: count > 0 ? 'Indexed' : 'Not indexed' });
  } catch {
    res.json({ model: 'gemini-embedding-001', dimensions: 768, totalChunks: 0, status: 'Not indexed' });
  }
});

// GET /api/patients/:id/timeline
router.get('/:id/timeline', authenticate, async (req, res) => {
  try {
    const pid = req.params.id;
    const events = [];

    try {
      const p = await Patient.findById(pid).lean();
      if (p) events.push({ type: 'registration', label: 'Patient Registered', timestamp: p.createdAt, description: 'Registered via intake agent' });
    } catch {}

    try {
      const docs = await Document.find({ patientId: pid }).sort({ createdAt: 1 }).lean();
      for (const doc of docs) {
        events.push({ type: 'document_upload', label: `Document Uploaded: ${doc.fileName || 'Unknown file'}`, timestamp: doc.createdAt || doc.uploadedAt, description: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '' });
        if (doc.status === 'indexed') events.push({ type: 'rag_indexed', label: 'RAG Index Updated', timestamp: doc.updatedAt || doc.createdAt, description: 'Document chunks embedded and stored' });
      }
    } catch {}

    try {
      const Diagnostic = mongoose.model('Diagnostic');
      const diags = await Diagnostic.find({ patientId: pid }).sort({ createdAt: 1 }).lean();
      for (const d of diags) {
        events.push({ type: 'diagnosis_made', label: 'AI Diagnosis Generated', timestamp: d.createdAt, description: d.question?.slice(0, 60) });
        if (d.approvalStatus === 'approved') events.push({ type: 'diagnosis_approved', label: 'Diagnosis Approved', timestamp: d.reviewedAt || d.updatedAt, description: `Approved by ${d.reviewedBy || 'doctor'}` });
        else if (d.approvalStatus === 'rejected') events.push({ type: 'diagnosis_rejected', label: 'Diagnosis Rejected', timestamp: d.reviewedAt || d.updatedAt, description: `Rejected by ${d.reviewedBy || 'doctor'}` });
      }
    } catch {}

    try {
      const Billing = mongoose.model('BillingProposal');
      const bills = await Billing.find({ patientId: pid }).sort({ createdAt: 1 }).lean();
      for (const b of bills) events.push({ type: 'billing_generated', label: 'Bill Generated', timestamp: b.createdAt, description: b.totalAmount ? `Total: ${b.totalAmount.toFixed(2)}` : '' });
    } catch {}

    try {
      const AuditLog = mongoose.model('AuditLog');
      const anomalies = await AuditLog.find({ patientId: pid, type: 'anomaly' }).sort({ timestamp: 1 }).lean();
      for (const a of anomalies) events.push({ type: 'anomaly_detected', label: 'Security Anomaly Detected', timestamp: a.timestamp || a.createdAt, description: a.description || a.action });
    } catch {}

    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
