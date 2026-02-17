export function dot(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function norm(vec) {
  return Math.sqrt(dot(vec, vec));
}

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = dot(vecA, vecB);
  const normA = norm(vecA);
  const normB = norm(vecB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

export function topKSimilar(queryVector, embeddings, k = 6) {
  const scored = embeddings.map((emb) => ({
    ...emb,
    score: cosineSimilarity(queryVector, emb.vector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

export function normalizeVector(vec) {
  const magnitude = norm(vec);
  if (magnitude === 0) return vec;
  return vec.map((val) => val / magnitude);
}
