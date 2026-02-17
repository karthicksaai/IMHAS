import BillingProposal from "../../../../shared/models/BillingProposal.js";
import Patient from "../../../../shared/models/Patient.js";
import { billingQueue } from "../queues/billingQueue.js";

export const optimizeBilling = async (req, res, next) => {
  try {
    const { patientId, treatments, constraints } = req.body;

    if (!patientId || !treatments || !Array.isArray(treatments)) {
      return res.status(400).json({
        error: "patientId and treatments array required",
      });
    }

    console.log(`Billing optimization for patient: ${patientId}`);

    // Get patient conditions for intelligent optimization
    const patient = await Patient.findById(patientId);
    const patientConditions = patient?.medicalHistory?.conditions || [];

    // Queue billing job
    const job = await billingQueue.add("optimize-billing", {
      patientId,
      treatments,
      constraints: constraints || {},
      patientConditions,
    });

    console.log(`Billing job queued: ${job.id}`);

    res.json({
      success: true,
      jobId: job.id,
      message: "Billing optimization queued",
    });
  } catch (err) {
    next(err);
  }
};

export const getBillingProposals = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const proposals = await BillingProposal.find({ patientId }).sort({
      createdAt: -1,
    });

    res.json(proposals);
  } catch (err) {
    next(err);
  }
};

export const getBillingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposal = await BillingProposal.findById(id);

    if (!proposal) {
      return res.status(404).json({ error: "Billing proposal not found" });
    }

    res.json(proposal);
  } catch (err) {
    next(err);
  }
};
