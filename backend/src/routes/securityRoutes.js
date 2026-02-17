import express from "express";
import {
  logAccess,
  listAudits,
  getSecurityAlerts,
} from "../controllers/securityController.js";

const router = express.Router();

router.post("/log", logAccess);
router.get("/logs", listAudits);
router.get("/alerts", getSecurityAlerts);

export default router;
