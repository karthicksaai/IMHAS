import "dotenv/config";
import mongoose from "mongoose";
import Diagnostic from "../shared/models/Diagnostic.js";
import fs from "fs";
import path from "path";

await mongoose.connect(process.env.MONGO_URI);

const all = await Diagnostic.find({
  hitlBand: { $in: ["auto_approve", "mandatory_review", "second_opinion"] },
}).lean();

const bands = ["auto_approve", "mandatory_review", "second_opinion"];
const grouped = {};
for (const band of bands) {
  const records = all.filter(d => d.hitlBand === band);
  const approved = records.filter(d => d.approvalStatus === "approved").length;
  const rejected = records.filter(d => d.approvalStatus === "rejected").length;
  const total = records.length;
  const avgConf =
    total > 0
      ? Math.round(records.reduce((s, d) => s + (d.confidence || 0), 0) / total)
      : null;
  grouped[band] = {
    band,
    count: total,
    approved,
    rejected,
    approvalRate: total > 0 ? +((approved / total) * 100).toFixed(1) : 0,
    avgConfidence: avgConf,
  };
}

const totalAll = all.length;
const autoApproveRate = totalAll > 0 ? +((grouped.auto_approve.count / totalAll) * 100).toFixed(1) : 0;
const mandatoryRate   = totalAll > 0 ? +((grouped.mandatory_review.count / totalAll) * 100).toFixed(1) : 0;
const secondOpRate    = totalAll > 0 ? +((grouped.second_opinion.count / totalAll) * 100).toFixed(1) : 0;

const results = {
  generatedAt: new Date().toISOString(),
  totalDiagnostics: totalAll,
  distribution: { autoApproveRate, mandatoryRate, secondOpRate },
  bands: grouped,
  overRelianceWarning:  autoApproveRate > 60 ? "WARN: auto_approve rate >60% - thresholds may be too lenient" : "OK",
  underRelianceWarning: secondOpRate > 40    ? "WARN: second_opinion rate >40% - consider improving document coverage" : "OK",
};

console.table(
  Object.fromEntries(
    bands.map(b => [
      b,
      {
        count:        grouped[b].count,
        approvalRate: `${grouped[b].approvalRate}%`,
        avgConf:      grouped[b].avgConfidence != null ? `${grouped[b].avgConfidence}%` : "n/a",
      },
    ])
  )
);
console.log("\nDistribution:", `auto_approve ${autoApproveRate}% | mandatory_review ${mandatoryRate}% | second_opinion ${secondOpRate}%`);
console.log("Over-reliance:",  results.overRelianceWarning);
console.log("Under-reliance:", results.underRelianceWarning);

fs.mkdirSync(path.join("scripts", "results"), { recursive: true });
fs.writeFileSync(
  path.join("scripts", "results", "hitl-benchmark-results.json"),
  JSON.stringify(results, null, 2)
);
console.log("\nResults written to scripts/results/hitl-benchmark-results.json");
await mongoose.disconnect();
