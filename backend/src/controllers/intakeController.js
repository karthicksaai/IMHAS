import Patient from "../../../../shared/models/Patient.js";
import Document from "../../../../shared/models/Document.js";
import { intakeQueue } from "../queues/intakeQueue.js";
import { fileToBase64, generatePseudonym } from "../utils/helpers.js";

export const patientIntake = async (req, res, next) => {
  try {
    const { name, age } = req.body;
    const file = req.files?.file;

    if (!name || !age) {
      return res.status(400).json({ error: "Name and age are required" });
    }

    console.log(`Intake request: ${name}, ${age} years`);

    // Extract text from uploaded file
    let rawText = "";
    let metadata = {};

    if (file) {
      rawText = file.data.toString("utf8");
      metadata = {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
      console.log(`File: ${file.name} (${file.size} bytes)`);
      console.log(`Text extracted: ${rawText.length} characters`);
    }

    // Create patient record
    const patient = await Patient.create({
      name,
      age: parseInt(age),
      pseudonym: generatePseudonym("PAT"),
    });

    console.log(`Patient created: ${patient._id}`);

    // Save document if text exists
    if (rawText.trim()) {
      await Document.create({
        patientId: patient._id.toString(),
        text: rawText,
        source: "upload",
        metadata,
      });
      console.log(`Document saved`);
    }

    // Convert file to base64 for agent processing
    const base64File = file ? fileToBase64(file) : null;

    // Queue intake job for agent processing
    const job = await intakeQueue.add("process-intake", {
      patientId: patient._id.toString(),
      name,
      age: parseInt(age),
      rawText,
      base64File,
      metadata,
    });

    console.log(`Intake job queued: ${job.id}`);

    res.json({
      success: true,
      patientId: patient._id,
      jobId: job.id,
      message: "Patient intake initiated",
    });
  } catch (err) {
    console.error("Intake error:", err);
    next(err);
  }
};
