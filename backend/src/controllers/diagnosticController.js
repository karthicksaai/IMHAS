import Diagnostic from "../../../../shared/models/Diagnostic.js";
import { diagnosticsQueue } from "../queues/diagnosticsQueue.js";

export const runDiagnostics = async (req, res, next) => {
  try {
    const { patientId, question } = req.body;

    if (!patientId || !question) {
      return res.status(400).json({
        error: "patientId and question are required",
      });
    }

    console.log(`Diagnostic request for patient: ${patientId}`);

    // Create diagnostic record
    const diagnostic = await Diagnostic.create({
      patientId,
      question,
      status: "pending",
    });

    // Queue diagnostic job
    const job = await diagnosticsQueue.add("diagnose", {
      diagnosticId: diagnostic._id.toString(),
      patientId,
      question,
    });

    console.log(`Diagnostic job queued: ${job.id}`);

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

    const diagnostics = await Diagnostic.find({ patientId }).sort({
      createdAt: -1,
    });

    res.json(diagnostics);
  } catch (err) {
    next(err);
  }
};

export const getDiagnosticById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const diagnostic = await Diagnostic.findById(id);

    if (!diagnostic) {
      return res.status(404).json({ error: "Diagnostic not found" });
    }

    res.json(diagnostic);
  } catch (err) {
    next(err);
  }
};
