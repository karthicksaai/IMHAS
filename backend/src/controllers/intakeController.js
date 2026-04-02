import Patient from "../../../shared/models/Patient.js";
import Document from "../../../shared/models/Document.js";
import { intakeQueue } from "../queues/intakeQueue.js";
import { fileToBase64, generatePseudonym } from "../utils/helpers.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Strips UTF-8 BOM and UTF-16 BOMs from a Buffer, then decodes to a clean string.
 */
function bufferToCleanText(buf) {
  if (!buf || buf.length === 0) return "";
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3).toString("utf8");
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i < buf.length - 1; i += 2) { swapped[i - 2] = buf[i + 1]; swapped[i - 1] = buf[i]; }
    return swapped.toString("utf16le");
  }
  return buf.toString("utf8");
}

/**
 * Detect if a buffer is a PDF by checking for the %PDF magic bytes.
 */
function isPDF(buf) {
  return buf.length > 4 && buf.slice(0, 4).toString("ascii") === "%PDF";
}

/**
 * Extract plain text from a PDF buffer using pdf-parse.
 * Falls back gracefully if pdf-parse isn't installed yet.
 */
async function extractPdfText(buf) {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buf);
    return data.text || "";
  } catch (err) {
    console.error("PDF extraction failed:", err.message);
    return "";
  }
}

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
      const buf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);

      metadata = {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.mimetype,
      };

      console.log(`File: ${file.name} (${file.size} bytes, mime: ${file.mimetype})`);

      if (isPDF(buf) || file.mimetype === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        console.log("Detected PDF — extracting text with pdf-parse...");
        rawText = (await extractPdfText(buf)).trim();
        console.log(`PDF text extracted: ${rawText.length} characters`);
      } else {
        rawText = bufferToCleanText(buf).trim();
        console.log(`Plain text extracted: ${rawText.length} characters`);
      }

      if (rawText.length === 0) {
        console.warn("⚠️  File uploaded but rawText is empty. Check the file is not empty or password-protected.");
      }
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
      console.log(`Document saved: ${docId} (${rawText.length} chars)`);
    } else {
      console.warn(`No text content — document NOT saved for patient ${patient._id}`);
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
