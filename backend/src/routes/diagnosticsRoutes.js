import express from "express";
import {
  runDiagnostics,
  getDiagnostics,
  getDiagnosticById,
  reviewDiagnostic,
  getSecondOpinion,
  checkInteractions,
} from "../controllers/diagnosticController.js";

const router = express.Router();

router.post("/", runDiagnostics);
router.get("/patient/:patientId", getDiagnostics);
router.get("/:id", getDiagnosticById);
router.patch("/:id/review", reviewDiagnostic);         // Approve / Reject
router.post("/:id/second-opinion", getSecondOpinion);  // Second Opinion
router.post("/check-interactions", checkInteractions); // Drug Interaction Check

export default router;
