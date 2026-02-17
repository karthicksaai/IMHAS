import { chatCompletion } from "../../../shared/services/geminiClient.js";

export async function generateDiagnosticResponse(question, relevantChunks) {
  // Build context from retrieved chunks
  const context = relevantChunks.map((chunk, idx) => {
    return `[Chunk ${idx + 1}] (Relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.text}`;
  }).join("\n\n---\n\n");

  const messages = [
    {
      role: "system",
      content: `You are an AI diagnostic assistant helping doctors analyze patient medical records.

Your task:
1. Use ONLY the provided patient context to answer the question
2. Be precise, evidence-based, and clinical in your response
3. If information is insufficient, clearly state what's missing
4. Cite specific details from the context when making recommendations
5. Do not speculate beyond the provided information

Format your response in clear, professional medical language.`,
    },
    {
      role: "user",
      content: `PATIENT MEDICAL CONTEXT:\n${context}\n\n---\n\nDOCTOR'S QUESTION: ${question}\n\nProvide a detailed, evidence-based diagnostic answer:`,
    },
  ];

  try {
    const response = await chatCompletion(messages);

    // Calculate confidence based on average similarity
    const avgSimilarity = relevantChunks.reduce((sum, c) => sum + c.similarity, 0) / relevantChunks.length;
    const confidence = Math.round(avgSimilarity * 100);

    return {
      response: response.trim(),
      confidence,
    };
  } catch (error) {
    console.error("LLM generation failed:", error.message);
    throw new Error("Failed to generate diagnostic response");
  }
}
