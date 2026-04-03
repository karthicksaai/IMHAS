import mongoose from "mongoose";

const diagnosticSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    question: { type: String, required: true },
    response: { type: String, default: null },
    confidence: { type: Number, default: 0 },
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
    // Confidence threshold rejection
    rejected: { type: Boolean, default: false },
    rejectionReason: { type: String, default: null },
    // Second opinion
    isSecondOpinion: { type: Boolean, default: false },
    originalDiagnosticId: { type: String, default: null },
    // RAG evidence chunks — finalScore added for recency-weighted ranking
    retrievedChunks: [
      {
        text: String,
        similarity: Number,
        finalScore: Number,
        chunkId: String,
      },
    ],
    processingTime: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    // Feature 1: Confidence-Calibrated HITL Thresholds
    hitlBand: {
      type: String,
      enum: ["auto_approve", "mandatory_review", "second_opinion"],
      default: null,
    },
    // Feature 3: Drug Interaction Safety Layer
    drugInteractionBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Diagnostic", diagnosticSchema);
