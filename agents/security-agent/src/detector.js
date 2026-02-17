import AuditLog from "../../../shared/models/AuditLog.js";

export async function detectAnomalies(event) {
  const { actor, action, resourceType, resourceId, timestamp } = event;
  const anomalies = [];

  // Anomaly 1: Odd-hour access (0-5 AM)
  const hour = new Date(timestamp).getHours();
  if (hour >= 0 && hour <= 5) {
    anomalies.push({
      reason: `Unusual access time: ${hour}:00 (0-5 AM)`,
      severity: "medium",
      type: "odd_hour_access",
    });
  }

  // Anomaly 2: Rapid patient record access (5+ in 60 seconds)
  if (resourceType === "patient") {
    const since = new Date(Date.now() - 60_000); // Last 60 seconds

    const recentAccess = await AuditLog.find({
      actor,
      resourceType: "patient",
      timestamp: { $gte: since },
    });

    const uniquePatients = new Set(recentAccess.map((log) => log.resourceId));
    uniquePatients.add(resourceId);

    if (uniquePatients.size >= 5) {
      anomalies.push({
        reason: `Rapid patient access: ${uniquePatients.size} patients in 60 seconds`,
        severity: "high",
        type: "rapid_access",
        metadata: { patientCount: uniquePatients.size },
      });
    }
  }

  // Anomaly 3: Multiple failed login attempts
  if (action === "login_failed") {
    const since = new Date(Date.now() - 300_000); // Last 5 minutes

    const failedLogins = await AuditLog.countDocuments({
      actor,
      action: "login_failed",
      timestamp: { $gte: since },
    });

    if (failedLogins >= 3) {
      anomalies.push({
        reason: `Multiple failed logins: ${failedLogins} attempts in 5 minutes`,
        severity: "critical",
        type: "brute_force_attempt",
        metadata: { attemptCount: failedLogins },
      });
    }
  }

  // Anomaly 4: Suspicious delete operations
  if (action === "delete" && resourceType === "patient") {
    anomalies.push({
      reason: "Patient record deletion detected",
      severity: "high",
      type: "dangerous_operation",
    });
  }

  // Anomaly 5: Access from same actor to multiple resource types rapidly
  const since = new Date(Date.now() - 120_000); // Last 2 minutes
  const recentActions = await AuditLog.find({
    actor,
    timestamp: { $gte: since },
  });

  const uniqueResourceTypes = new Set(recentActions.map((log) => log.resourceType));

  if (uniqueResourceTypes.size >= 4) {
    anomalies.push({
      reason: `Unusual activity pattern: accessed ${uniqueResourceTypes.size} resource types rapidly`,
      severity: "medium",
      type: "suspicious_pattern",
    });
  }

  return anomalies;
}
