import express from "express";
import {
  runDiagnostics,
  getDiagnostics,
  getDiagnosticById,
  reviewDiagnostic,
  getSecondOpinion,
  checkInteractions,
  getHITLStats,
} from "../controllers/diagnosticController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Feature 1: HITL stats — must be registered BEFORE /:id to avoid route conflict
router.get("/hitl-stats", authenticate, getHITLStats);

router.post("/", runDiagnostics);
router.get("/patient/:patientId", getDiagnostics);
router.get("/:id", getDiagnosticById);

// PATCH /api/diagnostics/:id/review — HITL approve or reject
router.patch("/:id/review", authenticate, reviewDiagnostic);

router.post("/:id/second-opinion", getSecondOpinion);
router.post("/check-interactions", checkInteractions);

export default router;
