import { chatCompletion } from "../../../shared/services/geminiClient.js";

// Feature 1: Confidence-Calibrated HITL Thresholds
// Replaces the old single CONFIDENCE_THRESHOLD env var.
// Three bands determine downstream handling:
//   auto_approve    >= 90  — high confidence, approve immediately
//   mandatory_review 70-89 — doctor must review before acting
//   second_opinion  < 70   — weak evidence, trigger second opinion automatically

export function getHITLBand(confidence) {
  if (confidence >= 90) return "auto_approve";
  if (confidence >= 70) return "mandatory_review";
  return "second_opinion";
}

export async function generateDiagnosticResponse(question, relevantChunks, options = {}) {
  const { isSecondOpinion = false } = options;

  // Calculate confidence BEFORE calling LLM
  const avgSimilarity =
    relevantChunks.reduce((sum, c) => sum + (c.finalScore ?? c.similarity), 0) /
    relevantChunks.length;
  const confidence = Math.round(avgSimilarity * 100);

  const hitlBand = getHITLBand(confidence);

  // second_opinion band — evidence too weak, do not generate response
  if (hitlBand === "second_opinion" && !isSecondOpinion) {
    console.log(
      `Confidence ${confidence}% -> band: second_opinion — refusing primary generation`
    );
    return {
      response: null,
      confidence,
      hitlBand,
      rejected: true,
      rejectionReason: `Insufficient evidence in patient records (confidence: ${confidence}%). A second opinion has been automatically queued. Please upload more detailed medical documentation.`,
    };
  }

  const context = relevantChunks
    .map((chunk, idx) => {
      const score = (chunk.finalScore ?? chunk.similarity);
      return `[Evidence ${idx + 1}] (Score: ${(score * 100).toFixed(1)}%)\n${chunk.text}`;
    })
    .join("\n\n---\n\n");

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
3. If information is insufficient, clearly state what is missing
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
    // auto_approve band — set approvalStatus directly
    const approvalStatus = hitlBand === "auto_approve" ? "approved" : "pending_review";
    return {
      response: response.trim(),
      confidence,
      hitlBand,
      approvalStatus,
      rejected: false,
    };
  } catch (error) {
    console.error("LLM generation failed:", error.message);
    throw new Error("Failed to generate diagnostic response");
  }
}
