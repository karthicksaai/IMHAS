import mongoose from "mongoose";

const billingProposalSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    treatments: [
      {
        name: String,
        originalCost: Number,
        optimizedCost: Number,
        alternative: String,
        reason: String,
      },
    ],
    totalOriginal: { type: Number, default: 0 },
    totalOptimized: { type: Number, default: 0 },
    savingsPercentage: { type: Number, default: 0 },
    optimizationStrategy: { type: String, default: "" },
    discountsApplied: [String],
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "error"],
      default: "pending",
    },
    // Human-in-the-loop approval
    approvalStatus: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
    notes: { type: String, default: "" },
    processingTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("BillingProposal", billingProposalSchema);
