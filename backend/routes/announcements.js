/* ============================================================
   backend/routes/announcements.js
   Read-only listing of estate announcements.
   Creation is admin-only.
   ============================================================ */

const express = require("express");
const router  = express.Router();
const { getPool }    = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

/* ------------------------------------------------------------
   GET /api/announcements
   Returns the latest N announcements.
   Query: ?limit=20 (default 10, max 50)
   ------------------------------------------------------------ */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const pool = await getPool();
    const r = await pool.request()
      .input("limit", limit)
      .query(`
        SELECT TOP (@limit)
          a.id,
          a.title,
          a.body,
          a.created_at,
          adm.full_name AS created_by_name
        FROM Announcements a
        LEFT JOIN Admins adm ON adm.id = a.created_by
        ORDER BY a.created_at DESC
      `);

    res.json(r.recordset);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   POST /api/announcements  (admin only)
   Body: { title, body }
   ------------------------------------------------------------ */
router.post("/",
  requireAuth,
  requireRole(["admin", "super"]),
  async (req, res, next) => {
    try {
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: "title and body are required." });
      }
      if (title.length > 200) {
        return res.status(400).json({ error: "title is too long (max 200 chars)." });
      }
      if (body.length > 2000) {
        return res.status(400).json({ error: "body is too long (max 2000 chars)." });
      }

      const pool = await getPool();
      const r = await pool.request()
        .input("title", title.trim())
        .input("body",  body.trim())
        .input("by",    req.user.id)
        .query(`
          INSERT INTO Announcements (title, body, created_by)
          OUTPUT INSERTED.id, INSERTED.title, INSERTED.body, INSERTED.created_at
          VALUES (@title, @body, @by)
        `);

      res.status(201).json(r.recordset[0]);
    } catch (err) {
      next(err);
    }
  }
);

/* ------------------------------------------------------------
   DELETE /api/announcements/:id  (admin only)
   ------------------------------------------------------------ */
router.delete("/:id",
  requireAuth,
  requireRole(["admin", "super"]),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id." });

      const pool = await getPool();
      const r = await pool.request()
        .input("id", id)
        .query("DELETE FROM Announcements WHERE id = @id");

      if (!r.rowsAffected[0]) return res.status(404).json({ error: "Not found." });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;