import { embedText } from "../../../shared/services/bertEmbedder.js";

export async function embedChunks(chunks) {
  const vectors = [];

  console.log(`Embedding ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    try {
      const vector = await embedText(chunks[i]);

      if (!Array.isArray(vector) || vector.length !== 384) {
        throw new Error(`Invalid embedding dimension: ${vector?.length}`);
      }

      vectors.push(vector);

      // Log progress every 10 chunks
      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`  ✓ Embedded ${i + 1}/${chunks.length} chunks`);
      }
    } catch (error) {
      console.error(`Embedding failed for chunk ${i}:`, error.message);

      // Fallback: zero vector
      vectors.push(new Array(384).fill(0));
    }
  }

  console.log(`All embeddings generated (384-dim vectors)`);
  return vectors;
}
