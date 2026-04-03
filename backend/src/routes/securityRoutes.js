import express from "express";
import {
  logAccess,
  listAudits,
  getSecurityAlerts,
  getAnomalies,
} from "../controllers/securityController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/log", logAccess);
router.get("/logs", authenticate, listAudits);
router.get("/alerts", authenticate, getSecurityAlerts);
router.get("/anomalies", authenticate, getAnomalies);

export default router;