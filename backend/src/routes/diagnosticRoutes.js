import express from "express";
import {
  runDiagnostics,
  getDiagnostics,
  getDiagnosticById,
} from "../controllers/diagnosticsController.js";

const router = express.Router();

router.post("/", runDiagnostics);
router.get("/patient/:patientId", getDiagnostics);
router.get("/:id", getDiagnosticById);

export default router;
