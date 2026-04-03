import express from "express";
import mongoose from "mongoose";
import {
  runDiagnostics,
  getDiagnostics,
  getDiagnosticById,
  getSecondOpinion,
  checkInteractions,
} from "../controllers/diagnosticController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", runDiagnostics);
router.get("/patient/:patientId", getDiagnostics);
router.get("/:id", getDiagnosticById);
// PATCH /api/diagnostics/:id/review — approve or reject (HITL)
router.patch("/:id/review", authenticate, async (req, res) => {
  try {
    const { status, reviewedBy } = req.body; // status: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }
    const Diagnostic = mongoose.model('Diagnostic');
    const updated = await Diagnostic.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: status,
        reviewedBy: reviewedBy || req.user?.name || 'doctor',
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });

    // Log the HITL event to auditlogs
    try {
      const AuditLog = mongoose.model('AuditLog');
      await AuditLog.create({
        type: 'hitl',
        action: `diagnosis_${status}`,
        userId: req.user?._id,
        userName: reviewedBy || req.user?.name,
        patientId: updated.patientId,
        description: `Diagnosis ${status} — confidence: ${updated.confidence ?? 'N/A'}%`,
        timestamp: new Date(),
      });
    } catch {}

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/:id/second-opinion", getSecondOpinion);  // Second Opinion
router.post("/check-interactions", checkInteractions); // Drug Interaction Check

export default router;
