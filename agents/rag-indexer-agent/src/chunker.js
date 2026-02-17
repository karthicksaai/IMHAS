export function chunkText(text, { size = 500, overlap = 100 } = {}) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end);

    // Only add non-empty chunks
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    // Move forward by (size - overlap) to create overlap
    start += size - overlap;

    // Prevent infinite loop
    if (size <= overlap) break;
  }

  console.log(`Chunked text into ${chunks.length} chunks (size: ${size}, overlap: ${overlap})`);

  return chunks;
}

export function smartChunkText(text, { maxSize = 500, minSize = 200 } = {}) {
  // Advanced chunking that respects sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.length >= minSize) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  console.log(`Smart chunked into ${chunks.length} chunks`);
  return chunks;
}
