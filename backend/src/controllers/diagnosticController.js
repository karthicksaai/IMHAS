import Diagnostic from "../../../shared/models/Diagnostic.js";
import Patient from "../../../shared/models/Patient.js";
import { diagnosticsQueue } from "../queues/diagnosticsQueue.js";
import { checkDrugInteractions } from "../../../shared/data/drugInteractions.js";

export const runDiagnostics = async (req, res, next) => {
  try {
    const { patientId, question } = req.body;

    if (!patientId || !question) {
      return res.status(400).json({ error: "patientId and question are required" });
    }

    const diagnostic = await Diagnostic.create({
      patientId,
      question,
      status: "pending",
      approvalStatus: "pending_review",
    });

    const job = await diagnosticsQueue.add("diagnose", {
      diagnosticId: diagnostic._id.toString(),
      patientId,
      question,
    });

    res.json({
      success: true,
      diagnosticId: diagnostic._id,
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    next(err);
  }
};

export const getDiagnostics = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const diagnostics = await Diagnostic.find({ patientId }).sort({ createdAt: -1 });
    res.json(diagnostics);
  } catch (err) {
    next(err);
  }
};

export const getDiagnosticById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const diagnostic = await Diagnostic.findById(id);
    if (!diagnostic) return res.status(404).json({ error: "Diagnostic not found" });
    res.json(diagnostic);
  } catch (err) {
    next(err);
  }
};

export const reviewDiagnostic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus, reviewNote, reviewedBy } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ error: "approvalStatus must be 'approved' or 'rejected'" });
    }

    const diagnostic = await Diagnostic.findByIdAndUpdate(
      id,
      { approvalStatus, reviewNote: reviewNote || "", reviewedBy: reviewedBy || "doctor", reviewedAt: new Date() },
      { new: true }
    );

    if (!diagnostic) return res.status(404).json({ error: "Diagnostic not found" });
    res.json({ success: true, diagnostic });
  } catch (err) {
    next(err);
  }
};

export const getSecondOpinion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await Diagnostic.findById(id);
    if (!original) return res.status(404).json({ error: "Diagnostic not found" });

    const secondOpinion = await Diagnostic.create({
      patientId: original.patientId,
      question: original.question,
      status: "pending",
      approvalStatus: "pending_review",
      isSecondOpinion: true,
      originalDiagnosticId: original._id,
    });

    await diagnosticsQueue.add("diagnose", {
      diagnosticId: secondOpinion._id.toString(),
      patientId: original.patientId,
      question: original.question,
      isSecondOpinion: true,
    });

    res.json({ success: true, diagnosticId: secondOpinion._id, message: "Second opinion queued" });
  } catch (err) {
    next(err);
  }
};

export const checkInteractions = async (req, res, next) => {
  try {
    const { patientId, proposedDrugs } = req.body;
    if (!patientId || !Array.isArray(proposedDrugs)) {
      return res.status(400).json({ error: "patientId and proposedDrugs array required" });
    }

    const patient = await Patient.findById(patientId);
    const existingMedications = patient?.medicalHistory?.medications || [];
    const conflicts = checkDrugInteractions(proposedDrugs, existingMedications);

    res.json({
      safe: conflicts.length === 0,
      conflicts,
      checkedAgainst: existingMedications,
      proposedDrugs,
      message: conflicts.length === 0
        ? "No known drug interactions detected"
        : `${conflicts.length} interaction(s) detected — review required`,
    });
  } catch (err) {
    next(err);
  }
};
