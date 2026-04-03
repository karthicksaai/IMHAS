import { embedText } from "../../../shared/services/geminiEmbedder.js";

export async function embedChunks(chunks) {
  const vectors = [];
  console.log(`Embedding ${chunks.length} chunks via Gemini gemini-embedding-001...`);

  for (let i = 0; i < chunks.length; i++) {
    try {
      const vector = await embedText(chunks[i], "RETRIEVAL_DOCUMENT");
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error(`Empty embedding returned for chunk ${i}`);
      }
      vectors.push(vector);
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        console.log(`  Embedded ${i + 1}/${chunks.length}`);
      }
      // Brief pause to stay within Gemini free-tier rate limit (1500 rpm)
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 50));
    } catch (error) {
      console.error(`Embedding failed for chunk ${i}:`, error.message);
      throw error; // Surface the error instead of silently storing zero vectors
    }
  }

  console.log(`All ${vectors.length} embeddings generated (${vectors[0]?.length}-dim)`);
  return vectors;
}
