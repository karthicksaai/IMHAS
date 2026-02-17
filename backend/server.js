import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { connectDB } from "../shared/config/db.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { requestLogger } from "./src/middleware/logger.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
  })
);
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    service: "IMHAS Backend",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { default: patientRoutes } = await import("./src/routes/patientRoutes.js");
    const { default: intakeRoutes } = await import("./src/routes/intakeRoutes.js");
    const { default: diagnosticsRoutes } = await import("./src/routes/diagnosticsRoutes.js");
    const { default: billingRoutes } = await import("./src/routes/billingRoutes.js");
    const { default: securityRoutes } = await import("./src/routes/securityRoutes.js");

    app.use("/api/patients", patientRoutes);
    app.use("/api/intake", intakeRoutes);
    app.use("/api/diagnostics", diagnosticsRoutes);
    app.use("/api/billing", billingRoutes);
    app.use("/api/security", securityRoutes);

    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`IMHAS Backend running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
};

startServer();
