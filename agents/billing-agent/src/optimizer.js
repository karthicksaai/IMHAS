import { chatCompletion } from "../../../shared/services/geminiClient.js";

export async function optimizeTreatmentCosts(treatments, patientConditions, constraints) {
  const doNotReplace = constraints.doNotReplace || [];
  const optimizedTreatments = [];

  for (const treatment of treatments) {
    const { itemId, name, cost, alternatives, category } = treatment;

    // Skip if in do-not-replace list
    if (doNotReplace.includes(itemId)) {
      optimizedTreatments.push({
        itemId,
        originalName: name,
        originalCost: cost,
        selectedName: name,
        selectedCost: cost,
        alternativesConsidered: 0,
        reasoning: "Protected by constraint - no replacement allowed",
        category: category || "general",
      });
      continue;
    }

    // If no alternatives, keep original
    if (!alternatives || alternatives.length === 0) {
      optimizedTreatments.push({
        itemId,
        originalName: name,
        originalCost: cost,
        selectedName: name,
        selectedCost: cost,
        alternativesConsidered: 0,
        reasoning: "No alternatives available",
        category: category || "general",
      });
      continue;
    }

    // Use AI to select best alternative
    const selected = await selectBestAlternative(
      { name, cost },
      alternatives,
      patientConditions
    );

    optimizedTreatments.push({
      itemId,
      originalName: name,
      originalCost: cost,
      selectedName: selected.name,
      selectedCost: selected.cost,
      alternativesConsidered: alternatives.length,
      reasoning: selected.reasoning,
      category: category || "general",
    });

    const savedAmount = cost - selected.cost;
    if (savedAmount > 0) {
      console.log(`${name} → ${selected.name} (saved $${savedAmount.toFixed(2)})`);
    }
  }

  return optimizedTreatments;
}

async function selectBestAlternative(original, alternatives, patientConditions) {
  const allOptions = [
    { name: original.name, cost: original.cost, type: "original" },
    ...alternatives.map((alt) => ({ ...alt, type: "alternative" })),
  ];

  const messages = [
    {
      role: "system",
      content: `You are a medical billing optimization AI. Select the most cost-effective treatment option while maintaining safety and efficacy.

Patient conditions: ${patientConditions.length > 0 ? patientConditions.join(", ") : "None specified"}

Consider:
1. Cost savings (prefer lower cost)
2. Patient safety (ensure compatibility with conditions)
3. Treatment efficacy (maintain quality of care)

Return ONLY valid JSON:
{
  "name": "selected treatment name",
  "cost": number,
  "reasoning": "brief explanation (max 100 chars)"
}`,
    },
    {
      role: "user",
      content: `Original: ${original.name} - $${original.cost}\n\nAlternatives:\n${alternatives.map((a) => `- ${a.name} - $${a.cost}`).join("\n")}\n\nSelect the best option:`,
    },
  ];

  try {
    const response = await chatCompletion(messages);
    const cleaned = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      name: parsed.name,
      cost: parseFloat(parsed.cost),
      reasoning: parsed.reasoning || "AI-selected best option",
    };
  } catch (error) {
    console.error("AI selection failed:", error.message);

    // Fallback: select cheapest option
    const cheapest = allOptions.reduce((min, opt) =>
      opt.cost < min.cost ? opt : min
    );

    return {
      name: cheapest.name,
      cost: cheapest.cost,
      reasoning: "Selected cheapest option (AI unavailable)",
    };
  }
}
