import express from "express";
import { patientIntake } from "../controllers/intakeController.js";

const router = express.Router();

router.post("/", patientIntake);

export default router;
