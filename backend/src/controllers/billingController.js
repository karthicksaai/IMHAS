import BillingProposal from "../../../../shared/models/BillingProposal.js";
import Patient from "../../../../shared/models/Patient.js";
import { billingQueue } from "../queues/billingQueue.js";
import { checkDrugInteractions } from "../../../../shared/data/drugInteractions.js";

export const optimizeBilling = async (req, res, next) => {
  try {
    const { patientId, treatments, constraints } = req.body;

    if (!patientId || !treatments || !Array.isArray(treatments)) {
      return res.status(400).json({
        error: "patientId and treatments array required",
      });
    }

    console.log(`Billing optimization for patient: ${patientId}`);

    const patient = await Patient.findById(patientId);
    const patientConditions = patient?.medicalHistory?.conditions || [];
    const patientAge = patient?.age || null;
    const existingMedications = patient?.medicalHistory?.medications || [];

    // Run drug interaction check BEFORE billing optimization
    const proposedDrugNames = treatments.map((t) => t.name);
    const drugConflicts = checkDrugInteractions(proposedDrugNames, existingMedications);

    const job = await billingQueue.add("optimize-billing", {
      patientId,
      treatments,
      constraints: constraints || {},
      patientConditions,
      patientAge,
    });

    console.log(`Billing job queued: ${job.id}`);

    res.json({
      success: true,
      jobId: job.id,
      message: "Billing optimization queued",
      // Return drug interaction warnings immediately — before AI runs
      drugInteractionWarnings: drugConflicts,
      hasCriticalInteractions: drugConflicts.some((c) => c.severity === "critical"),
    });
  } catch (err) {
    next(err);
  }
};

export const getBillingProposals = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const proposals = await BillingProposal.find({ patientId }).sort({ createdAt: -1 });
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

// Doctor approves or rejects a billing proposal
export const reviewBilling = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus, reviewNote, reviewedBy } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ error: "approvalStatus must be 'approved' or 'rejected'" });
    }

    const proposal = await BillingProposal.findByIdAndUpdate(
      id,
      {
        approvalStatus,
        reviewNote: reviewNote || "",
        reviewedBy: reviewedBy || "doctor",
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!proposal) {
      return res.status(404).json({ error: "Billing proposal not found" });
    }

    console.log(`Billing proposal ${id} ${approvalStatus} by ${reviewedBy}`);
    res.json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
};
