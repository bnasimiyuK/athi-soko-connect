/* ============================================================
   routes/estate.js
   Backend endpoints for the Discover page.
   Mounted at /api/estate in server.js
   ============================================================ */

const express = require("express");
const router = express.Router();



// Adjust this require to match your actual DB module
let db;
try {
  db = require("../db");
} catch (err) {
  console.error("[estate] could not load ../db:", err.message);
  db = null;
}

/* Universal query helper (works with sqlite3, mysql2/promise, pg) */
async function query(sql, params = []) {
  if (!db) throw new Error("Database module not loaded");
  if (typeof db.query === "function") {
    const r = await db.query(sql, params);
    return Array.isArray(r) ? r[0] : (r.rows || r);
  }
  if (typeof db.all === "function") {
    return await new Promise((res, rej) =>
      db.all(sql, params, (e, rows) => (e ? rej(e) : res(rows)))
    );
  }
  throw new Error("Unsupported db module shape");
}

async function queryOne(sql, params = []) {
  if (!db) throw new Error("Database module not loaded");
  if (typeof db.get === "function" && typeof db.query !== "function") {
    return await new Promise((res, rej) =>
      db.get(sql, params, (e, row) => (e ? rej(e) : res(row)))
    );
  }
  const rows = await query(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

/* ------------------------------------------------------------
   GET /api/estate/stats
   ------------------------------------------------------------ */
router.get("/stats", async (req, res) => {
  const out = {
    totalProviders: 0,
    verifiedProviders: 0,
    readyNow: 0,
    distinctCourts: [],
  };

  try {
    const r = await queryOne("SELECT COUNT(*) AS c FROM providers");
    out.totalProviders = Number(r?.c ?? 0);
  } catch (e) { console.error("[stats] total:", e.message); }

  try {
    const r = await queryOne("SELECT COUNT(*) AS c FROM providers WHERE verified = 1");
    out.verifiedProviders = Number(r?.c ?? 0);
  } catch (e) { console.error("[stats] verified:", e.message); }

  try {
    const r = await queryOne(
      `SELECT COUNT(*) AS c FROM providers
       WHERE verified = 1 AND (is_available IS NULL OR is_available = 1)`
    );
    out.readyNow = Number(r?.c ?? 0);
  } catch (e) { console.error("[stats] ready:", e.message); }

  try {
    const rows = await query(
      `SELECT DISTINCT court_name FROM providers
       WHERE court_name IS NOT NULL AND court_name <> ''`
    );
    out.distinctCourts = rows.map((r) => r.court_name);
  } catch (e) { console.error("[stats] courts:", e.message); }

  res.json(out);
});

/* ------------------------------------------------------------
   GET /api/estate/phase-range
   ------------------------------------------------------------ */
router.get("/phase-range", async (req, res) => {
  try {
    const rows = await query(
      "SELECT DISTINCT phase FROM courts WHERE phase IS NOT NULL ORDER BY phase"
    );
    const phases = rows.map((r) => Number(r.phase)).filter((n) => !isNaN(n));
    res.json({
      min: phases[0] ?? null,
      max: phases[phases.length - 1] ?? null,
      phases,
    });
  } catch (e) {
    console.error("[phase-range]", e.message);
    res.json({ min: null, max: null, phases: [] });
  }
});

/* ------------------------------------------------------------
   GET /api/estate/last-sync
   ------------------------------------------------------------ */
router.get("/last-sync", async (req, res) => {
  let lastSync = null;

  try {
    const r = await queryOne("SELECT MAX(updated_at) AS last FROM providers");
    lastSync = r?.last || null;
  } catch { /* column may not exist */ }

  if (!lastSync) {
    try {
      const r = await queryOne("SELECT MAX(created_at) AS last FROM providers");
      lastSync = r?.last || null;
    } catch { /* fall through */ }
  }

  res.json({ lastSync: lastSync || new Date().toISOString() });
});

/* ------------------------------------------------------------
   GET /api/estate/notice
   ------------------------------------------------------------ */
router.get("/notice", async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT label, body, updated_at FROM estate_settings
       WHERE key = 'notice' LIMIT 1`
    );
    if (row) {
      return res.json({
        label: row.label || "ATHI HIGHWAY ESTATE NOTICE",
        text: row.body || "",
        updatedAt: row.updated_at,
      });
    }
  } catch { /* table may not exist */ }

  // Fallback policy text
  res.json({
    label: "ATHI HIGHWAY ESTATE NOTICE",
    text: "Payment is arranged directly between you and the provider. Verification confirms submitted details, not the quality of work.",
    updatedAt: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------
   GET /api/estate/gate-rules
   ------------------------------------------------------------ */
router.get("/gate-rules", async (req, res) => {
  try {
    const rows = await query(
      `SELECT label, body, sort_order FROM gate_rules
       WHERE active = 1 ORDER BY sort_order ASC`
    );
    if (rows.length) {
      return res.json({
        rules: rows.map((r) => ({ label: r.label, body: r.body })),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch { /* table may not exist */ }

  // Fallback policy
  res.json({
    rules: [
      { label: "Gate 1 (main)", body: "Open 24/7 · Security on duty" },
      { label: "Gate 2 (biometric)", body: "06:00 – 22:00 EAT · All riders must scan" },
      { label: "Delivery riders", body: "Must be pre-registered by resident" },
      { label: "Visiting technicians", body: "National ID + booking code required" },
      { label: "Emergency access", body: "Any gate opens · Notify control desk" },
    ],
    updatedAt: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------
   GET /api/estate/gate-status
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   GET /api/estate/gate-status
   Computes the current gate state in EAT, plus the schedule
   for the day, and how long until the next change.
   ------------------------------------------------------------ */
router.get("/gate-status", async (req, res) => {
  // Work entirely in EAT
  const nowEAT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" })
  );
  const hour = nowEAT.getHours();
  const minute = nowEAT.getMinutes();

  // Gate schedule (policy constants)
  const GATE2_OPEN  = 6;   // 06:00
  const GATE2_CLOSE = 22;  // 22:00

  let status;
  let label;
  let shortLabel;
  let nextChangeMinutes;

  if (hour >= GATE2_OPEN && hour < GATE2_CLOSE) {
    // Open right now — figure out when it closes
    status = "live";
    label = "Gate Clearance: Live";
    shortLabel = "Live";

    const minutesUntilClose =
      ((GATE2_CLOSE - hour) * 60) - minute;
    nextChangeMinutes = minutesUntilClose;
  } else if (hour === GATE2_CLOSE && minute < 30) {
    // Grace window: 22:00–22:30
    status = "busy";
    label = "Gate 2 closing soon";
    shortLabel = "Closing";
    nextChangeMinutes = 30 - minute;
  } else {
    // Closed overnight
    status = "closed";
    label = "Gate 2 Closed · Gate 1 Open";
    shortLabel = "Closed";

    // Minutes until Gate 2 reopens at 06:00
    if (hour >= GATE2_CLOSE) {
      nextChangeMinutes =
        ((24 - hour + GATE2_OPEN) * 60) - minute;
    } else {
      // 00:00–05:59
      nextChangeMinutes =
        ((GATE2_OPEN - hour) * 60) - minute;
    }
  }

  res.json({
    status,
    label,
    shortLabel,
    schedule: {
      gate1: "Open 24/7",
      gate2: `06:00 – 22:00 EAT`,
    },
    nextChangeMinutes,
    hour,
    minute,
    at: nowEAT.toISOString(),
  });
});

/* ------------------------------------------------------------
   GET /api/estate/categories/with-counts
   ------------------------------------------------------------ */
router.get("/categories/with-counts", async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.label,
              COUNT(p.id) AS count
       FROM categories c
       LEFT JOIN providers p
         ON p.category = c.id AND p.verified = 1
       GROUP BY c.id, c.label
       ORDER BY c.label`
    );
    res.json(rows.map((r) => ({
      id: r.id,
      label: r.label,
      count: Number(r.count || 0),
    })));
  } catch (e) {
    console.error("[categories/with-counts]", e.message);
    res.json([]);
  }
});

module.exports = router;