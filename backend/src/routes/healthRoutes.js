import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// In-memory agent heartbeat store — agents call POST /api/health/heartbeat
const agentHeartbeats = {};

// POST /api/health/heartbeat — called by each agent worker
router.post('/heartbeat', (req, res) => {
  const { agent, jobsProcessedToday, queueDepth } = req.body;
  if (!agent) return res.status(400).json({ error: 'agent name required' });
  agentHeartbeats[agent] = {
    status: 'running',
    lastSeen: new Date().toISOString(),
    jobsProcessedToday: jobsProcessedToday || 0,
    queueDepth: queueDepth || 0,
  };
  res.json({ ok: true });
});

// GET /api/health — dashboard system status panel
router.get('/', authenticate, async (req, res) => {
  try {
    // Count diagnostics created today
    let diagnosticsToday = 0;
    let avgProcessingMs = 0;
    try {
      const Diagnostic = mongoose.model('Diagnostic');
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      diagnosticsToday = await Diagnostic.countDocuments({ createdAt: { $gte: startOfDay } });
      const recent = await Diagnostic.find({ processingMs: { $exists: true } }).sort({ createdAt: -1 }).limit(20).lean();
      if (recent.length > 0) {
        avgProcessingMs = Math.round(recent.reduce((s, d) => s + (d.processingMs || 0), 0) / recent.length);
      }
    } catch {}

    // Build agent status — mark stale (>30s) as not-responding
    const AGENT_KEYS = ['intake', 'rag-indexer', 'diagnostics', 'billing', 'security'];
    const agents = {};
    const now = Date.now();
    for (const key of AGENT_KEYS) {
      const hb = agentHeartbeats[key];
      if (!hb) {
        agents[key] = { status: 'stopped', lastSeen: null, jobsProcessedToday: 0, queueDepth: 0 };
      } else {
        const age = now - new Date(hb.lastSeen).getTime();
        agents[key] = {
          ...hb,
          status: age > 30000 ? 'stopped' : 'running',
        };
      }
    }

    res.json({ agents, diagnosticsToday, avgProcessingMs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health/system — settings page system info
router.get('/system', authenticate, async (req, res) => {
  try {
    const mongoOk = mongoose.connection.readyState === 1;

    // Ping Redis via a simple check
    let redisOk = false;
    try {
      const { redis } = await import('../../shared/config/redis.js').catch(() => ({}));
      if (redis) {
        await redis.ping();
        redisOk = true;
      }
    } catch {}

    // Check Gemini API key exists
    const geminiOk = !!process.env.GEMINI_API_KEY;

    res.json({
      mongodb: mongoOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      gemini: geminiOk ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
