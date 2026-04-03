import mongoose from "mongoose";

// Vector dimension matches Gemini text-embedding-004 (768).
const embeddingSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    docId:     { type: String, required: true, index: true },
    chunkId:   { type: String, required: true, unique: true },
    chunkIndex:{ type: Number, required: true },
    text:      { type: String, required: true },
    vector:    { type: [Number], required: true },
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Embedding", embeddingSchema);
