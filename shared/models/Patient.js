import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 150 },
    pseudonym: { type: String, unique: true },
    medicalHistory: {
      conditions: [String],
      medications: [String],
      allergies: [String],
      vitals: {
        bloodPressure: String,
        heartRate: String,
        temperature: String,
        weight: String,
        height: String,
      },
      summary: String,
    },
    status: { type: String, enum: ["active", "inactive", "discharged"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);
