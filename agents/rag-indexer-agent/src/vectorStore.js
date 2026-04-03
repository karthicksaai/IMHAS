import Embedding from "../../../shared/models/Embedding.js";

export async function storeVectors({ patientId, docId, chunks, vectors, metadata }) {
  if (chunks.length !== vectors.length) {
    throw new Error(`Chunk/vector mismatch: ${chunks.length} chunks vs ${vectors.length} vectors`);
  }

  // Remove existing embeddings for this document before re-indexing
  const deleted = await Embedding.deleteMany({ docId });
  if (deleted.deletedCount > 0) {
    console.log(`Cleared ${deleted.deletedCount} existing embeddings for doc ${docId}`);
  }

  const docs = chunks.map((chunk, index) => ({
    patientId,
    docId,
    chunkId:    `${docId}::${index}`,
    chunkIndex: index,
    text:       chunk,
    vector:     vectors[index],
    metadata:   { chunkIndex: index, ...(metadata || {}) },
  }));

  const result = await Embedding.insertMany(docs, { ordered: false });
  console.log(`Stored ${result.length} embeddings in MongoDB`);
  return result.length;
}

export async function deleteDocumentEmbeddings(docId) {
  const result = await Embedding.deleteMany({ docId });
  console.log(`Deleted ${result.deletedCount} embeddings for doc ${docId}`);
  return result.deletedCount;
}
