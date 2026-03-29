import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, default: null },
    resourceId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    isAnomaly: { type: Boolean, default: false },
    anomalyType: { type: String, default: null },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical", null],
      default: null,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
