// Deterministic rule-based drug interaction checker — NO AI involved
// This is a safety layer that CANNOT be overridden by AI output

export const DANGEROUS_PAIRS = [
  { drugs: ["warfarin", "aspirin"], risk: "Increased bleeding risk — major interaction", severity: "critical" },
  { drugs: ["warfarin", "ibuprofen"], risk: "Increased bleeding risk — major interaction", severity: "critical" },
  { drugs: ["warfarin", "naproxen"], risk: "Increased anticoagulant effect", severity: "critical" },
  { drugs: ["maoi", "ssri"], risk: "Serotonin syndrome — life threatening", severity: "critical" },
  { drugs: ["maoi", "tramadol"], risk: "Serotonin syndrome risk", severity: "critical" },
  { drugs: ["maoi", "meperidine"], risk: "Serotonin syndrome — avoid", severity: "critical" },
  { drugs: ["metformin", "alcohol"], risk: "Lactic acidosis risk", severity: "high" },
  { drugs: ["digoxin", "amiodarone"], risk: "Digoxin toxicity — reduce dose", severity: "high" },
  { drugs: ["lithium", "ibuprofen"], risk: "Lithium toxicity", severity: "high" },
  { drugs: ["lithium", "naproxen"], risk: "Lithium toxicity", severity: "high" },
  { drugs: ["clopidogrel", "omeprazole"], risk: "Reduced antiplatelet effect", severity: "high" },
  { drugs: ["statins", "clarithromycin"], risk: "Increased myopathy risk", severity: "high" },
  { drugs: ["methotrexate", "nsaids"], risk: "Methotrexate toxicity", severity: "critical" },
  { drugs: ["penicillin", "methotrexate"], risk: "Increased methotrexate levels", severity: "high" },
  { drugs: ["ciprofloxacin", "antacids"], risk: "Reduced antibiotic absorption", severity: "medium" },
  { drugs: ["sildenafil", "nitrates"], risk: "Severe hypotension — contraindicated", severity: "critical" },
  { drugs: ["ace inhibitors", "potassium"], risk: "Hyperkalemia risk", severity: "high" },
  { drugs: ["fluoxetine", "tramadol"], risk: "Seizure and serotonin syndrome risk", severity: "critical" },
  { drugs: ["simvastatin", "amlodipine"], risk: "Increased statin levels — myopathy", severity: "medium" },
  { drugs: ["warfarin", "fluconazole"], risk: "Greatly increased bleeding risk", severity: "critical" },
];

/**
 * Check proposed treatments/medications against patient's existing medications
 * Returns array of conflicts found — DETERMINISTIC, no AI
 */
export function checkDrugInteractions(proposedDrugs, existingMedications) {
  const conflicts = [];

  const allDrugs = [
    ...proposedDrugs.map((d) => d.toLowerCase().trim()),
    ...existingMedications.map((m) => m.toLowerCase().trim()),
  ];

  for (const pair of DANGEROUS_PAIRS) {
    const [drugA, drugB] = pair.drugs;

    const hasA = allDrugs.some(
      (d) => d.includes(drugA) || drugA.includes(d)
    );
    const hasB = allDrugs.some(
      (d) => d.includes(drugB) || drugB.includes(d)
    );

    if (hasA && hasB) {
      conflicts.push({
        drugs: pair.drugs,
        risk: pair.risk,
        severity: pair.severity,
      });
    }
  }

  return conflicts;
}
