import express from "express";
import {
  runDiagnostics,
  getDiagnostics,
  getDiagnosticById,
  reviewDiagnostic,
  getSecondOpinion,
  checkInteractions,
} from "../controllers/diagnosticController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", runDiagnostics);
router.get("/patient/:patientId", getDiagnostics);
router.get("/:id", getDiagnosticById);

// PATCH /api/diagnostics/:id/review — HITL approve or reject
// Uses the reviewDiagnostic controller which already imports the Diagnostic model correctly
router.patch("/:id/review", authenticate, reviewDiagnostic);

router.post("/:id/second-opinion", getSecondOpinion);
router.post("/check-interactions", checkInteractions);

export default router;
