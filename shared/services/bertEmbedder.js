import { pipeline } from "@xenova/transformers";

let embedder = null;

async function loadEmbedder() {
  if (!embedder) {
    console.log("Loading MiniLM embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("MiniLM model loaded (384 dimensions)");
  }
  return embedder;
}

export async function embedText(text) {
  try {
    const model = await loadEmbedder();

    const output = await model(text, {
      pooling: "mean",
      normalize: true,
    });

    const vector = Array.from(output.data);
    return vector; // 384 dimensions
  } catch (error) {
    console.error("Embedding error:", error.message);
    throw error;
  }
}
