import Embedding from "../../../shared/models/Embedding.js";

export async function storeVectors({ patientId, docId, chunks, vectors, metadata }) {
  if (chunks.length !== vectors.length) {
    throw new Error(`Chunk/vector mismatch: ${chunks.length} vs ${vectors.length}`);
  }

  // Delete existing embeddings for this document (if re-indexing)
  await Embedding.deleteMany({ docId });

  // Prepare embedding documents
  const embeddings = chunks.map((chunk, index) => ({
    patientId,
    docId,
    chunkId: `${docId}::${index}`,
    text: chunk,
    vector: vectors[index],
    metadata: {
      chunkIndex: index,
      overlap: metadata?.overlap || 0,
    },
  }));

  // Bulk insert
  const result = await Embedding.insertMany(embeddings);

  console.log(`Stored ${result.length} embeddings in MongoDB`);

  return result.length;
}

export async function deleteDocumentEmbeddings(docId) {
  const result = await Embedding.deleteMany({ docId });
  console.log(`Deleted ${result.deletedCount} embeddings for doc ${docId}`);
  return result.deletedCount;
}
