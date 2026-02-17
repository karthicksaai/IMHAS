export function applyDiscountRules(subtotal, context = {}) {
  const discounts = [];
  let finalTotal = subtotal;

  // Rule 1: Bulk treatment discount (5+ items)
  if (context.treatmentCount >= 5) {
    const discount = subtotal * 0.05; // 5% off
    finalTotal -= discount;
    discounts.push({
      type: "bulk_discount",
      amount: discount,
      description: "5% bulk treatment discount",
    });
  }

  // Rule 2: Senior citizen discount (age >= 65)
  if (context.patientAge >= 65) {
    const discount = subtotal * 0.10; // 10% off
    finalTotal -= discount;
    discounts.push({
      type: "senior_discount",
      amount: discount,
      description: "10% senior citizen discount",
    });
  }

  // Rule 3: Chronic condition discount
  const chronicConditions = ["diabetes", "hypertension", "asthma", "heart disease"];
  const hasChronicCondition = context.patientConditions?.some((condition) =>
    chronicConditions.some((chronic) =>
      condition.toLowerCase().includes(chronic.toLowerCase())
    )
  );

  if (hasChronicCondition) {
    const discount = subtotal * 0.07; // 7% off
    finalTotal -= discount;
    discounts.push({
      type: "chronic_condition_discount",
      amount: discount,
      description: "7% chronic condition management discount",
    });
  }

  // Rule 4: General discount (always apply 3%)
  const generalDiscount = subtotal * 0.03;
  finalTotal -= generalDiscount;
  discounts.push({
    type: "general_discount",
    amount: generalDiscount,
    description: "3% hospital discount",
  });

  console.log(`Applied ${discounts.length} discount rules`);
  discounts.forEach((d) => {
    console.log(`  - ${d.description}: -$${d.amount.toFixed(2)}`);
  });

  return {
    finalTotal: Math.max(0, finalTotal), // Never negative
    discounts,
  };
}
