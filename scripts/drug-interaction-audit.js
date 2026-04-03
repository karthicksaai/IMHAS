import "dotenv/config";
import mongoose from "mongoose";
import AuditLog from "../shared/models/AuditLog.js";
import fs from "fs";
import path from "path";

await mongoose.connect(process.env.MONGO_URI);

const logs = await AuditLog.find({ action: "drug_interaction_detected" }).lean();

const total         = logs.length;
const critical      = logs.filter(l => l.meta?.severity === "critical").length;
const high          = logs.filter(l => l.meta?.severity === "high").length;
const medium        = logs.filter(l => l.meta?.severity === "medium").length;
const clean         = logs.filter(l => (l.meta?.conflictCount || 0) === 0).length;
const blocked       = logs.filter(l => l.meta?.severity === "critical").length;
const withConflicts = logs.filter(l => (l.meta?.conflictCount || 0) > 0).length;

const interactionRate =
  total > 0 ? +((withConflicts / total) * 100).toFixed(1) : 0;

const pairCounts = {};
for (const log of logs) {
  for (const conflict of log.meta?.conflicts || []) {
    const key = conflict.drugs?.slice().sort().join(" + ") || "";
    if (key) pairCounts[key] = (pairCounts[key] || 0) + 1;
  }
}

const topPairs = Object.entries(pairCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([pair, count]) => ({ pair, count }));

const results = {
  generatedAt:     new Date().toISOString(),
  totalChecks:     total,
  clean,
  withConflicts,
  critical,
  high,
  medium,
  blockedBills:    blocked,
  interactionRate: `${interactionRate}%`,
  topConflictPairs: topPairs,
  insight:
    total > 0
      ? `${interactionRate}% of bills had at least one drug interaction. ${blocked} bill(s) were automatically blocked due to critical interactions that would have been missed without this layer.`
      : "No drug interaction checks logged yet. Run billing jobs after deploying the updated billing agent.",
};

console.log("\nDrug Interaction Audit");
console.log(`Total checks:      ${total}`);
console.log(`With conflicts:    ${withConflicts} (${interactionRate}%)`);
console.log(`Critical:          ${critical}`);
console.log(`High:              ${high}`);
console.log(`Blocked bills:     ${blocked}`);
if (topPairs.length > 0) {
  console.log("\nTop conflict pairs:");
  topPairs.forEach(p => console.log(`  ${p.pair}: ${p.count}x`));
}

fs.mkdirSync(path.join("scripts", "results"), { recursive: true });
fs.writeFileSync(
  path.join("scripts", "results", "drug-audit-results.json"),
  JSON.stringify(results, null, 2)
);
console.log("\nResults written to scripts/results/drug-audit-results.json");
await mongoose.disconnect();
