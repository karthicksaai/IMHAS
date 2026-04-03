// In-memory benchmark -- no MongoDB, no Gemini API needed
import fs from "fs";
import path from "path";

const LAMBDA = 0.3;
const HALF_LIFE = 180;

function recencyFactor(daysOld) {
  return Math.exp(-daysOld / HALF_LIFE);
}

function recencyWeightedScore(similarity, daysOld) {
  return similarity * (1 + LAMBDA * recencyFactor(daysOld));
}

const AGE_PROFILES = [0, 30, 90, 180, 365, 730];

const SCENARIOS = [
  { id: 1,  similarities: [0.85, 0.83, 0.80, 0.78, 0.76, 0.72] },
  { id: 2,  similarities: [0.72, 0.88, 0.65, 0.90, 0.55, 0.60] },
  { id: 3,  similarities: [0.60, 0.62, 0.85, 0.80, 0.88, 0.70] },
  { id: 4,  similarities: [0.91, 0.70, 0.68, 0.65, 0.60, 0.55] },
  { id: 5,  similarities: [0.55, 0.60, 0.65, 0.70, 0.80, 0.92] },
  { id: 6,  similarities: [0.75, 0.74, 0.73, 0.72, 0.71, 0.70] },
  { id: 7,  similarities: [0.68, 0.85, 0.62, 0.77, 0.58, 0.80] },
  { id: 8,  similarities: [0.80, 0.78, 0.76, 0.74, 0.72, 0.88] },
  { id: 9,  similarities: [0.90, 0.65, 0.88, 0.60, 0.86, 0.55] },
  { id: 10, similarities: [0.50, 0.55, 0.60, 0.65, 0.70, 0.95] },
  { id: 11, similarities: [0.83, 0.81, 0.79, 0.77, 0.75, 0.73] },
  { id: 12, similarities: [0.65, 0.90, 0.60, 0.85, 0.58, 0.82] },
  { id: 13, similarities: [0.70, 0.70, 0.70, 0.70, 0.70, 0.70] },
  { id: 14, similarities: [0.95, 0.50, 0.93, 0.48, 0.91, 0.46] },
  { id: 15, similarities: [0.46, 0.48, 0.50, 0.60, 0.80, 0.95] },
  { id: 16, similarities: [0.78, 0.76, 0.74, 0.72, 0.70, 0.68] },
  { id: 17, similarities: [0.62, 0.87, 0.60, 0.84, 0.58, 0.81] },
  { id: 18, similarities: [0.88, 0.70, 0.75, 0.65, 0.60, 0.55] },
  { id: 19, similarities: [0.55, 0.60, 0.68, 0.75, 0.82, 0.89] },
  { id: 20, similarities: [0.80, 0.80, 0.60, 0.60, 0.90, 0.90] },
];

const results = SCENARIOS.map(scenario => {
  const chunks = scenario.similarities.map((sim, i) => ({
    chunkIndex: i,
    daysOld: AGE_PROFILES[i],
    similarity: sim,
    finalScore: recencyWeightedScore(sim, AGE_PROFILES[i]),
  }));

  const plainRank   = [...chunks].sort((a, b) => b.similarity  - a.similarity);
  const recencyRank = [...chunks].sort((a, b) => b.finalScore  - a.finalScore);

  const recentChunks = chunks.filter(c => c.daysOld <= 30);
  let totalRankImprovement = 0;
  for (const rc of recentChunks) {
    const plainPos   = plainRank.findIndex(c => c.chunkIndex === rc.chunkIndex) + 1;
    const recencyPos = recencyRank.findIndex(c => c.chunkIndex === rc.chunkIndex) + 1;
    totalRankImprovement += plainPos - recencyPos;
  }

  return {
    scenarioId: scenario.id,
    chunks,
    plainTop3:   plainRank.slice(0, 3).map(c => ({ idx: c.chunkIndex, days: c.daysOld, score: +c.similarity.toFixed(4) })),
    recencyTop3: recencyRank.slice(0, 3).map(c => ({ idx: c.chunkIndex, days: c.daysOld, score: +c.finalScore.toFixed(4) })),
    recentChunkRankImprovement: totalRankImprovement,
  };
});

const avgImprovement =
  results.reduce((s, r) => s + r.recentChunkRankImprovement, 0) / results.length;
const improvedCount = results.filter(r => r.recentChunkRankImprovement > 0).length;

console.log(`\nRAG Benchmark Results (${results.length} scenarios)`);
console.log(`Avg rank improvement for recent chunks (<=30 days): ${avgImprovement.toFixed(2)}`);
console.log(`Scenarios where recency improved recent chunk rank: ${improvedCount}/${results.length}`);

const output = {
  generatedAt: new Date().toISOString(),
  lambda: LAMBDA,
  halfLifeDays: HALF_LIFE,
  scenarioCount: results.length,
  avgRecentChunkRankImprovement: +avgImprovement.toFixed(3),
  scenariosImproved: improvedCount,
  interpretation:
    avgImprovement > 0
      ? `Recency weighting surfaces more recent chunks on average by ${avgImprovement.toFixed(2)} rank positions`
      : "Recency weighting did not improve recent chunk ranking in this test set",
  scenarios: results,
};

fs.mkdirSync(path.join("scripts", "results"), { recursive: true });
fs.writeFileSync(
  path.join("scripts", "results", "rag-benchmark-results.json"),
  JSON.stringify(output, null, 2)
);
console.log("Results written to scripts/results/rag-benchmark-results.json");
