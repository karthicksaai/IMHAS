import AuditLog from "../../../../shared/models/AuditLog.js";
import { securityQueue } from "../queues/securityQueue.js";

export const logAccess = async (req, res, next) => {
  try {
    const { actor, action, resourceType, resourceId, meta } = req.body;

    if (!actor || !action) {
      return res.status(400).json({ error: "actor and action required" });
    }

    // Create audit log
    const auditEntry = await AuditLog.create({
      actor,
      action,
      resourceType,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      meta: meta || {},
    });

    // Queue for anomaly detection
    await securityQueue.add("analyze-access", {
      auditId: auditEntry._id.toString(),
      actor,
      action,
      resourceType,
      resourceId,
      timestamp: auditEntry.timestamp,
    });

    res.json({
      success: true,
      auditId: auditEntry._id,
    });
  } catch (err) {
    next(err);
  }
};

export const listAudits = async (req, res, next) => {
  try {
    const { limit = 100, actor, action, isAnomaly } = req.query;

    const filter = {};
    if (actor) filter.actor = actor;
    if (action) filter.action = action;
    if (isAnomaly !== undefined) filter.isAnomaly = isAnomaly === "true";

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (err) {
    next(err);
  }
};

export const getSecurityAlerts = async (req, res, next) => {
  try {
    const { limit = 50, severity } = req.query;

    const filter = { isAnomaly: true };
    if (severity) filter.severity = severity;

    const alerts = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};
