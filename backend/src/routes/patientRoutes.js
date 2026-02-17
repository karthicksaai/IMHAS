import express from "express";
import {
  listPatients,
  getPatientDetails,
  getPatientDocuments,
  getPatientDiagnostics,
  getPatientBilling,
  updatePatient,
} from "../controllers/patientController.js";

const router = express.Router();

router.get("/", listPatients);
router.get("/:id", getPatientDetails);
router.get("/:id/documents", getPatientDocuments);
router.get("/:id/diagnostics", getPatientDiagnostics);
router.get("/:id/billing", getPatientBilling);
router.put("/:id", updatePatient);

export default router;
