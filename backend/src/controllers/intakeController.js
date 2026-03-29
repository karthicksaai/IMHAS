import Patient from "../../../shared/models/Patient.js";
import Document from "../../../shared/models/Document.js";
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

    const patient = await Patient.create({
      name,
      age: parseInt(age),
      pseudonym: generatePseudonym("PAT"),
    });

    console.log(`Patient created: ${patient._id}`);

    let docId = null;
    if (rawText.trim()) {
      const doc = await Document.create({
        patientId: patient._id.toString(),
        text: rawText,
        source: "upload",
        metadata,
      });
      docId = doc._id.toString();
      console.log(`Document saved: ${docId}`);
    }

    const base64File = file ? fileToBase64(file) : null;

    const job = await intakeQueue.add("process-intake", {
      patientId: patient._id.toString(),
      docId,
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
