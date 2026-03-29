import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    source: { type: String, enum: ["upload", "manual", "ehr"], default: "upload" },
    metadata: {
      filename: String,
      fileSize: Number,
      mimeType: String,
    },
    chunkCount: { type: Number, default: 0 },
    indexed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
