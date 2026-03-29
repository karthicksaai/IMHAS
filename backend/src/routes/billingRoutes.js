import express from "express";
import {
  optimizeBilling,
  getBillingProposals,
  getBillingById,
  reviewBilling,
} from "../controllers/billingController.js";

const router = express.Router();

router.post("/optimize", optimizeBilling);
router.get("/:patientId", getBillingProposals);
router.get("/proposal/:id", getBillingById);
router.patch("/proposal/:id/review", reviewBilling); // Approve / Reject billing

export default router;
