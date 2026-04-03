/**
 * Split text into overlapping chunks that respect sentence boundaries.
 * maxSize  - soft upper limit in characters per chunk
 * overlap  - characters of context carried over to the next chunk
 */
export function chunkText(text, { size = 500, overlap = 100 } = {}) {
  if (!text || !text.trim()) return [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start += size - overlap;
    if (size <= overlap) break;
  }
  return chunks;
}

export function smartChunkText(text, { maxSize = 600, minSize = 100, overlap = 80 } = {}) {
  if (!text || !text.trim()) return [];

  // Split on sentence-ending punctuation followed by whitespace
  const sentences = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) || [text];
  const chunks = [];
  let current = "";
  let overlapBuffer = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).length > maxSize && current.length >= minSize) {
      chunks.push(current.trim());
      // carry overlap from end of previous chunk
      const words = current.split(" ");
      overlapBuffer = words.slice(-Math.ceil(overlap / 6)).join(" ");
      current = overlapBuffer + " " + trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  console.log(`Smart-chunked into ${chunks.length} chunks`);
  return chunks;
}
