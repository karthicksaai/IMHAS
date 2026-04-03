import "dotenv/config";
import mongoose from "mongoose";
import { generateItemizedBill } from "../agents/billing-agent/src/billGenerator.js";
import fs from "fs";
import path from "path";

await mongoose.connect(process.env.MONGO_URI);

const PROFILES = [
  { name: "Arjun Kumar",    age: 25, gender: "M", conditions: [],                            medications: [],                      allergies: [],           diagnosticCount: 1, docCount: 0, groundTruth: 700   },
  { name: "Meena Iyer",     age: 65, gender: "F", conditions: ["Diabetes","Hypertension"],   medications: ["Metformin"],            allergies: [],           diagnosticCount: 3, docCount: 2, groundTruth: 4200  },
  { name: "Ravi Shankar",   age: 45, gender: "M", conditions: ["Asthma","Eczema"],          medications: ["Salbutamol"],           allergies: ["Penicillin"],diagnosticCount: 2, docCount: 1, groundTruth: 3300  },
  { name: "Priya Das",      age: 30, gender: "F", conditions: [],                            medications: [],                      allergies: [],           diagnosticCount: 0, docCount: 1, groundTruth: 550   },
  { name: "Sundar Raj",     age: 55, gender: "M", conditions: ["Hypertension"],              medications: ["Amlodipine"],           allergies: [],           diagnosticCount: 2, docCount: 1, groundTruth: 2800  },
  { name: "Lakshmi Nair",   age: 70, gender: "F", conditions: ["Arthritis","Osteoporosis"],  medications: ["Ibuprofen","Calcium"],  allergies: [],           diagnosticCount: 4, docCount: 3, groundTruth: 5100  },
  { name: "Kiran Mehta",    age: 22, gender: "M", conditions: [],                            medications: [],                      allergies: [],           diagnosticCount: 1, docCount: 0, groundTruth: 600   },
  { name: "Ananya Pillai",  age: 38, gender: "F", conditions: ["PCOS"],                      medications: ["Metformin"],            allergies: [],           diagnosticCount: 2, docCount: 2, groundTruth: 2500  },
  { name: "Venkat Rao",     age: 60, gender: "M", conditions: ["Diabetes","CKD"],            medications: ["Insulin"],             allergies: ["Sulfa"],    diagnosticCount: 3, docCount: 2, groundTruth: 4800  },
  { name: "Deepa Krishnan", age: 42, gender: "F", conditions: ["Hypothyroidism"],             medications: ["Levothyroxine"],        allergies: [],           diagnosticCount: 1, docCount: 1, groundTruth: 1800  },
  { name: "Suresh Babu",    age: 50, gender: "M", conditions: ["CAD"],                        medications: ["Aspirin","Statins"],   allergies: [],           diagnosticCount: 3, docCount: 2, groundTruth: 3900  },
  { name: "Geetha Menon",   age: 67, gender: "F", conditions: ["Parkinson's"],                medications: ["Levodopa"],            allergies: [],           diagnosticCount: 5, docCount: 4, groundTruth: 6200  },
  { name: "Arun Srinivas",  age: 28, gender: "M", conditions: [],                            medications: [],                      allergies: ["Latex"],    diagnosticCount: 1, docCount: 1, groundTruth: 900   },
  { name: "Divya Nambiar",  age: 35, gender: "F", conditions: ["Migraine"],                   medications: ["Sumatriptan"],          allergies: [],           diagnosticCount: 2, docCount: 1, groundTruth: 2100  },
  { name: "Mohan Pillai",   age: 73, gender: "M", conditions: ["COPD","Hypertension"],        medications: ["Tiotropium"],          allergies: [],           diagnosticCount: 4, docCount: 3, groundTruth: 5600  },
  { name: "Radha Iyer",     age: 48, gender: "F", conditions: ["Lupus"],                      medications: ["Hydroxychloroquine"],   allergies: ["NSAIDs"],   diagnosticCount: 3, docCount: 2, groundTruth: 4100  },
  { name: "Kartik Varma",   age: 19, gender: "M", conditions: [],                            medications: [],                      allergies: [],           diagnosticCount: 0, docCount: 0, groundTruth: 400   },
  { name: "Shalini Raman",  age: 33, gender: "F", conditions: ["Anemia"],                     medications: ["Iron supplements"],     allergies: [],           diagnosticCount: 1, docCount: 1, groundTruth: 1400  },
  { name: "Prakash Nair",   age: 58, gender: "M", conditions: ["T2DM","Neuropathy"],          medications: ["Metformin","Gabapentin"],allergies: [],          diagnosticCount: 3, docCount: 2, groundTruth: 4400  },
  { name: "Usha Chandran",  age: 62, gender: "F", conditions: ["Osteoarthritis"],              medications: ["Paracetamol"],          allergies: ["Aspirin"],  diagnosticCount: 2, docCount: 1, groundTruth: 3000  },
];

const perPatient = [];
let totalAbsError    = 0;
let totalAbsPctError = 0;

for (const p of PROFILES) {
  const mockPatient = {
    _id: new mongoose.Types.ObjectId(),
    name: p.name,
    age: p.age,
    gender: p.gender === "M" ? "Male" : "Female",
    bloodType: "Unknown",
    medicalHistory: {
      conditions:  p.conditions,
      medications: p.medications,
      allergies:   p.allergies,
    },
  };

  const mockDiagnostics = Array.from({ length: p.diagnosticCount }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    question: `Clinical question ${i + 1}`,
    approvalStatus: i % 2 === 0 ? "approved" : "pending_review",
    createdAt: new Date(),
  }));

  let aiTotal = 0;
  try {
    const result = await generateItemizedBill({
      patient:     mockPatient,
      diagnostics: mockDiagnostics,
      docCount:    p.docCount,
    });
    aiTotal = result.totalAmount;
  } catch (e) {
    console.warn(`  Failed for ${p.name}:`, e.message);
    aiTotal = 0;
  }

  const absError    = Math.abs(aiTotal - p.groundTruth);
  const absPctError = p.groundTruth > 0 ? (absError / p.groundTruth) * 100 : 0;
  totalAbsError    += absError;
  totalAbsPctError += absPctError;

  perPatient.push({
    name:        p.name,
    age:         p.age,
    groundTruth: p.groundTruth,
    aiTotal,
    absError:    +absError.toFixed(0),
    pctError:    +absPctError.toFixed(1),
  });

  console.log(`  ${p.name.padEnd(20)} GT: Rs.${p.groundTruth.toString().padStart(5)}  AI: Rs.${aiTotal.toString().padStart(5)}  Err: ${absPctError.toFixed(1)}%`);
}

const MAE  = +(totalAbsError    / PROFILES.length).toFixed(2);
const MAPE = +(totalAbsPctError / PROFILES.length).toFixed(2);

console.log(`\nMAE:  Rs.${MAE}`);
console.log(`MAPE: ${MAPE}%`);
console.log(MAPE < 15 ? "Target achieved: MAPE < 15%" : `Target missed: MAPE ${MAPE}% >= 15%`);

const output = {
  generatedAt:  new Date().toISOString(),
  profileCount: PROFILES.length,
  MAE,
  MAPE,
  targetMet:    MAPE < 15,
  perPatient,
};

fs.mkdirSync(path.join("scripts", "results"), { recursive: true });
fs.writeFileSync(
  path.join("scripts", "results", "billing-benchmark-results.json"),
  JSON.stringify(output, null, 2)
);
console.log("Results written to scripts/results/billing-benchmark-results.json");
await mongoose.disconnect();
