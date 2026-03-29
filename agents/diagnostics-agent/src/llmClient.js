import { chatCompletion } from "../../../shared/services/geminiClient.js";

const CONFIDENCE_THRESHOLD = parseInt(process.env.CONFIDENCE_THRESHOLD) || 60;

export async function generateDiagnosticResponse(question, relevantChunks, options = {}) {
  const { isSecondOpinion = false } = options;

  // Calculate confidence BEFORE calling LLM
  const avgSimilarity = relevantChunks.reduce((sum, c) => sum + c.similarity, 0) / relevantChunks.length;
  const confidence = Math.round(avgSimilarity * 100);

  // CONFIDENCE THRESHOLD GATE — if evidence is too weak, refuse to answer
  if (confidence < CONFIDENCE_THRESHOLD) {
    console.log(`⚠️  Confidence ${confidence}% is below threshold ${CONFIDENCE_THRESHOLD}% — refusing to generate answer`);
    return {
      response: null,
      confidence,
      rejected: true,
      rejectionReason: `Insufficient evidence in patient records (confidence: ${confidence}%, minimum required: ${CONFIDENCE_THRESHOLD}%). Please upload more detailed medical documentation before querying.`,
    };
  }

  const context = relevantChunks.map((chunk, idx) => {
    return `[Evidence ${idx + 1}] (Relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.text}`;
  }).join("\n\n---\n\n");

  // Second opinion uses a deliberately conservative, safety-first prompt
  const systemPrompt = isSecondOpinion
    ? `You are a CONSERVATIVE AI diagnostic assistant providing a second opinion.

Your task:
1. Focus ONLY on contraindications, risks, and potential harms
2. Apply maximum clinical caution — when in doubt, flag it
3. Explicitly note any information gaps or uncertainties
4. Do NOT repeat the same conclusions as a first opinion might make
5. Recommend specialist consultation if there is any ambiguity
6. Use ONLY the provided patient context — no general assumptions

This is a SECOND OPINION — be specifically looking for what the first analysis might have missed.`
    : `You are an AI diagnostic assistant helping doctors analyze patient medical records.

Your task:
1. Use ONLY the provided patient context to answer the question
2. Be precise, evidence-based, and clinical in your response
3. If information is insufficient, clearly state what's missing
4. Cite specific details from the context when making recommendations
5. Do not speculate beyond the provided information
6. End your response with: "CONFIDENCE BASIS: [list which evidence chunks you relied on most]"

Format your response in clear, professional medical language.`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `PATIENT MEDICAL CONTEXT:\n${context}\n\n---\n\nDOCTOR'S QUESTION: ${question}\n\nProvide a detailed, evidence-based diagnostic answer:`,
    },
  ];

  try {
    const response = await chatCompletion(messages);
    return {
      response: response.trim(),
      confidence,
      rejected: false,
    };
  } catch (error) {
    console.error("LLM generation failed:", error.message);
    throw new Error("Failed to generate diagnostic response");
  }
}
