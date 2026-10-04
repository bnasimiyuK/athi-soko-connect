/* ============================================================
   routes/estate.js - Aggregate stats + last-sync timestamp
   Mounted at /api/estate in server.js

   Tries to work with sqlite3, better-sqlite3, mysql2/promise,
   and pg — by detecting the shape of the imported `db` module.
   ============================================================ */

const express = require("express");
const router = express.Router();

let db;
try {
  db = require("../db");
} catch (err) {
  console.error("[estate] could not load ../db:", err.message);
  db = null;
}

/* ------------------------------------------------------------
   Universal query helper
   - If db.query is a function → mysql2 / pg style
   - If db.all / db.get is a function → sqlite3 style
   Returns an array of rows for anything that isn't a COUNT.
   ------------------------------------------------------------ */
async function query(sql, params = []) {
  if (!db) throw new Error("Database module not loaded");

  // mysql2/promise or pg
  if (typeof db.query === "function") {
    const result = await db.query(sql, params);
    // mysql2 returns [rows, fields]; pg returns { rows }
    if (Array.isArray(result)) return result[0];
    return result.rows || result;
  }

  // sqlite3: prefer .all for lists, .get for single rows
  if (typeof db.all === "function") {
    return await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  }

  throw new Error("Unsupported db module shape");
}

async function queryOne(sql, params = []) {
  if (!db) throw new Error("Database module not loaded");

  // sqlite3: .get for single row
  if (typeof db.get === "function" && typeof db.query !== "function") {
    return await new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  }

  const rows = await query(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

/* ------------------------------------------------------------
   GET /api/estate/stats
   Returns aggregate figures used by the Discover page hero.
   Each sub-query is wrapped so a missing column won't 500 the
   whole endpoint.
   ------------------------------------------------------------ */
router.get("/stats", async (req, res) => {
  const out = {
    totalProviders: 0,
    verifiedProviders: 0,
    readyNow: 0,
    distinctCourts: [],
  };

  try {
    const r1 = await queryOne("SELECT COUNT(*) AS c FROM providers");
    out.totalProviders = Number(r1?.c ?? r1?.count ?? 0);
  } catch (err) {
    console.error("[estate/stats] totalProviders failed:", err.message);
  }

  try {
    const r2 = await queryOne(
      "SELECT COUNT(*) AS c FROM providers WHERE verified = 1"
    );
    out.verifiedProviders = Number(r2?.c ?? r2?.count ?? 0);
  } catch (err) {
    console.error("[estate/stats] verifiedProviders failed:", err.message);
  }

  try {
    const r3 = await queryOne(
      `SELECT COUNT(*) AS c FROM providers
       WHERE verified = 1
         AND (is_available IS NULL OR is_available = 1)`
    );
    out.readyNow = Number(r3?.c ?? r3?.count ?? 0);
  } catch (err) {
    console.error("[estate/stats] readyNow failed:", err.message);
  }

  try {
    const rows = await query(
      `SELECT DISTINCT court_name
       FROM providers
       WHERE court_name IS NOT NULL AND court_name <> ''`
    );
    out.distinctCourts = (rows || []).map((r) => r.court_name).filter(Boolean);
  } catch (err) {
    console.error("[estate/stats] distinctCourts failed:", err.message);
  }

  res.json(out);
});

/* ------------------------------------------------------------
   GET /api/estate/last-sync
   Returns the timestamp of the most recent provider update.
   Falls back to "now" if no rows exist yet or the query fails.
   ------------------------------------------------------------ */
router.get("/last-sync", async (req, res) => {
  let lastSync = null;

  try {
    const row = await queryOne(
      "SELECT MAX(updated_at) AS last FROM providers"
    );
    lastSync = row?.last || row?.max || null;
  } catch (err) {
    // Column may not exist — that's OK, we fall back below
    console.warn("[estate/last-sync] query failed:", err.message);
  }

  // Fallbacks: try created_at, then "now"
  if (!lastSync) {
    try {
      const row = await queryOne(
        "SELECT MAX(created_at) AS last FROM providers"
      );
      lastSync = row?.last || row?.max || null;
    } catch (err) {
      // Ignore — we'll use "now"
    }
  }

  res.json({
    lastSync: lastSync || new Date().toISOString(),
  });
});
router.get("/phase-range", async (req, res) => {
  try {
    const rows = await query(
      "SELECT DISTINCT phase FROM courts WHERE phase IS NOT NULL ORDER BY phase"
    );
    const phases = (rows || []).map((r) => Number(r.phase)).filter((n) => !isNaN(n));
    res.json({
      min: phases.length ? phases[0] : null,
      max: phases.length ? phases[phases.length - 1] : null,
      phases,
    });
  } catch (err) {
    console.error("[estate/phase-range] failed:", err.message);
    res.json({ min: null, max: null, phases: [] });
  }
});
module.exports = router;