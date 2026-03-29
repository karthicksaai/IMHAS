import Embedding from "../../../shared/models/Embedding.js";
import { embedText } from "../../../shared/services/bertEmbedder.js";
import { topKSimilar } from "../../../shared/services/vectorUtils.js";

export async function retrieveRelevantChunks(patientId, query, k = 6) {
  console.log(`Retrieving top-${k} chunks for patient ${patientId}`);

  // 1. Embed the query
  const queryVector = await embedText(query);
  console.log(`Query embedded (384-dim)`);

  // 2. Fetch all embeddings for this patient
  const embeddings = await Embedding.find({ patientId }).lean();

  if (embeddings.length === 0) {
    console.log("No embeddings found for patient");
    return [];
  }

  console.log(`Found ${embeddings.length} embeddings in database`);

  // 3. Compute cosine similarity and get top-K
  const topChunks = topKSimilar(queryVector, embeddings, k);

  // 4. Format results
  const results = topChunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    text: chunk.text,
    similarity: chunk.score,
    docId: chunk.docId,
  }));

  return results;
}
