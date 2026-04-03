import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category:    { type: String, default: "General" },
  amount:      { type: Number, required: true },
  rationale:   { type: String, default: "" },
}, { _id: false });

const drugConflictSchema = new mongoose.Schema({
  drugs:    { type: [String], default: [] },
  risk:     { type: String, default: "" },
  severity: { type: String, default: "medium" },
}, { _id: false });

const billingProposalSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },

    // AI-generated itemized bill
    lineItems:        { type: [lineItemSchema], default: [] },
    itemizedBill:     { type: [lineItemSchema], default: [] },
    totalAmount:      { type: Number, default: 0 },
    aiReasoning:      { type: String, default: "" },
    generatedBy:      { type: String, default: "billing-agent-ai" },
    requestedBy:      { type: String, default: "doctor" },
    insuranceStatus:  {
      type: String,
      enum: ["pending", "submitted", "under_review", "approved", "rejected"],
      default: "pending",
    },

    // Legacy optimizer fields
    treatments: [
      {
        name:          String,
        originalCost:  Number,
        optimizedCost: Number,
        alternative:   String,
        reason:        String,
      },
    ],
    totalOriginal:        { type: Number, default: 0 },
    totalOptimized:       { type: Number, default: 0 },
    savingsPercentage:    { type: Number, default: 0 },
    optimizationStrategy: { type: String, default: "" },
    discountsApplied:     [String],

    // Status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "error"],
      default: "pending",
    },

    // Human-in-the-loop — "blocked" added for critical drug interactions
    approvalStatus: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "blocked"],
      default: "pending_review",
    },
    reviewedBy:  { type: String, default: null },
    reviewedAt:  { type: Date,   default: null },
    reviewNote:  { type: String, default: "" },
    notes:       { type: String, default: "" },
    processingTime: { type: Number, default: 0 },

    // Feature 3: Drug Interaction Safety Layer audit trail
    drugInteractionCheck: {
      checked:       { type: Boolean, default: false },
      conflicts:     { type: [drugConflictSchema], default: [] },
      blockedReason: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("BillingProposal", billingProposalSchema);
