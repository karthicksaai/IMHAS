import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function chatCompletion(messages, options = {}) {
  try {
    let prompt = "";

    for (const msg of messages) {
      if (msg.role === "system") {
        prompt += `SYSTEM INSTRUCTIONS:\n${msg.content}\n\n`;
      } else if (msg.role === "user") {
        prompt += `USER:\n${msg.content}\n\n`;
      } else if (msg.role === "assistant") {
        prompt += `ASSISTANT:\n${msg.content}\n\n`;
      }
    }

    const modelName = options.model || process.env.LLM_MODEL || "gemini-2.0-flash-exp";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Gemini API error:", error.message);
    throw new Error(`Gemini API failed: ${error.message}`);
  }
}

export async function extractStructuredData(text, schema) {
  const messages = [
    {
      role: "system",
      content: `Extract structured data from the text and return ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`,
    },
    {
      role: "user",
      content: text,
    },
  ];

  const response = await chatCompletion(messages);
  const cleaned = response.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return null;
  }
}
