import Embedding from "../../../shared/models/Embedding.js";
import { embedQuery } from "../../../shared/services/geminiEmbedder.js";

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function retrieveRelevantChunks(patientId, query, k = 6) {
  console.log(`Retrieving top-${k} chunks for patient ${patientId}`);

  const queryVector = await embedQuery(query);
  console.log(`Query embedded (${queryVector.length}-dim)`);

  const embeddings = await Embedding.find({ patientId }).lean();

  if (embeddings.length === 0) {
    console.log("No embeddings found for patient");
    return [];
  }

  console.log(`Scoring ${embeddings.length} stored embeddings...`);

  const scored = embeddings
    .filter(e => Array.isArray(e.vector) && e.vector.length === queryVector.length)
    .map(e => ({
      chunkId:    e.chunkId,
      text:       e.text,
      similarity: cosineSimilarity(queryVector, e.vector),
      docId:      e.docId,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  console.log(`Top similarity: ${scored[0]?.similarity?.toFixed(4)}`);
  return scored;
}
