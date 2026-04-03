import Embedding from "../../../shared/models/Embedding.js";
import { embedQuery } from "../../../shared/services/geminiEmbedder.js";

// Feature 2: Recency-Weighted RAG
// final_score = cosine_similarity * (1 + LAMBDA * recency_factor)
// recency_factor = e^(-daysSince / 180)
// LAMBDA defaults to 0.3, overridable via RECENCY_LAMBDA env var

const RECENCY_LAMBDA = parseFloat(process.env.RECENCY_LAMBDA) || 0.3;
const RECENCY_HALF_LIFE_DAYS = 180;

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

function recencyFactor(createdAt) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const daysSince = (now - created) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSince / RECENCY_HALF_LIFE_DAYS);
}

export async function retrieveRelevantChunks(patientId, query, k = 6) {
  console.log(`Retrieving top-${k} chunks for patient ${patientId} (lambda=${RECENCY_LAMBDA})`);

  const queryVector = await embedQuery(query);
  console.log(`Query embedded (${queryVector.length}-dim)`);

  const embeddings = await Embedding.find({ patientId }).lean();

  if (embeddings.length === 0) {
    console.log("No embeddings found for patient");
    return [];
  }

  console.log(`Scoring ${embeddings.length} stored embeddings with recency weighting...`);

  const scored = embeddings
    .filter(e => Array.isArray(e.vector) && e.vector.length === queryVector.length)
    .map(e => {
      const similarity = cosineSimilarity(queryVector, e.vector);
      const rf = recencyFactor(e.createdAt);
      const finalScore = similarity * (1 + RECENCY_LAMBDA * rf);
      return {
        chunkId:    e.chunkId,
        text:       e.text,
        similarity,
        finalScore,
        docId:      e.docId,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, k);

  console.log(`Top finalScore: ${scored[0]?.finalScore?.toFixed(4)} (similarity: ${scored[0]?.similarity?.toFixed(4)})`);
  return scored;
}
