import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini text-embedding-004 produces 768-dim vectors.
// TaskType RETRIEVAL_DOCUMENT for indexing, RETRIEVAL_QUERY for queries.
export async function embedText(text, taskType = "RETRIEVAL_DOCUMENT") {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: "user" },
      taskType,
    });
    return result.embedding.values; // Float32 array, 768 dimensions
  } catch (error) {
    console.error("Gemini embed error:", error.message);
    throw error;
  }
}

export async function embedQuery(text) {
  return embedText(text, "RETRIEVAL_QUERY");
}
