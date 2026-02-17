import express from "express";
import {
  optimizeBilling,
  getBillingProposals,
  getBillingById,
} from "../controllers/billingController.js";

const router = express.Router();

router.post("/", optimizeBilling);
router.get("/patient/:patientId", getBillingProposals);
router.get("/:id", getBillingById);

export default router;
