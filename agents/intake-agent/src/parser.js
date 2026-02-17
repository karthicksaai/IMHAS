import { chatCompletion } from "../../../shared/services/geminiClient.js";

export async function parseIntakeDocument(text) {
  const messages = [
    {
      role: "system",
      content: `You are a medical data extraction specialist. Extract structured information from patient documents.

Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief 2-3 sentence clinical summary",
  "allergies": ["allergy1", "allergy2"],
  "medications": ["medication1", "medication2"],
  "conditions": ["condition1", "condition2"],
  "vitals": {
    "bloodPressure": "120/80",
    "temperature": "98.6F",
    "heartRate": 72,
    "respiratoryRate": 16
  },
  "chiefComplaint": "Primary reason for visit",
  "diagnosisNotes": "Clinical observations"
}

If information is not present, use empty arrays or empty strings. Do not include null values.`,
    },
    {
      role: "user",
      content: `Extract medical data from this document:\n\n${text}`,
    },
  ];

  try {
    const response = await chatCompletion(messages);
    const cleaned = response.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned);

    // Ensure all expected fields exist
    return {
      summary: parsed.summary || "No summary available",
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      vitals: parsed.vitals || {},
      chiefComplaint: parsed.chiefComplaint || "",
      diagnosisNotes: parsed.diagnosisNotes || "",
    };
  } catch (error) {
    console.error("Medical data extraction failed:", error.message);

    // Fallback: return minimal data
    return {
      summary: text.substring(0, 200) + "...",
      allergies: [],
      medications: [],
      conditions: [],
      vitals: {},
      chiefComplaint: "",
      diagnosisNotes: "",
    };
  }
}
