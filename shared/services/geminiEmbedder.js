import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function embedText(text) {
  try {
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
    });
    return result.embeddings[0].values;
  } catch (err) {
    console.error('Gemini embed error:', err.message);
    throw err;
  }
}

// Alias — diagnostics-agent uses embedQuery, rag-indexer uses embedText
export const embedQuery = embedText;