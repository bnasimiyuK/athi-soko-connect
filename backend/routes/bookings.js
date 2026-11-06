/* ============================================================
   routes/bookings.js - SQL Server version
   ============================================================ */

const express = require("express");
const router = express.Router();
const sql = require("mssql"); // <-- ADDED: Required for sql.Int casting
const { getPool } = require("../db");
const { requireAuth } = require("../middleware/auth");

/* ------------------------------------------------------------
   Helper: DB row → JSON frontend expects
   ------------------------------------------------------------ */
function bookingToJson(row) {
  return {
    id:                 row.id,
    providerId:         row.provider_id,
    providerName:       row.provider_name,
    service:            row.service,
    date:               row.job_date,
    time:               row.job_time,
    durationMinutes:    row.duration_minutes, 
    notes:              row.notes || "",
    residentName:       row.resident_name,
    residentPhone:      row.resident_phone,
    status:             row.status,
    reviewed:           !!row.reviewed,
    createdAt:          row.created_at,
    cancellationReason: row.cancellation_reason || null,
    rating:             row.review_rating || null,
  };
}

/* ------------------------------------------------------------
   Helper: apply scoping + optional filters to a request object
   ------------------------------------------------------------ */
function applyBookingFilters(request, { status, providerId, phone }) {
  const conditions = [];

  if (status) {
    conditions.push("b.status = @status");
    request.input("status", status);
  }
  if (providerId !== undefined && providerId !== null) {
    conditions.push("b.provider_id = @providerId");
    request.input("providerId", providerId);
  }
  if (phone) {
    conditions.push("b.resident_phone = @phone");
    request.input("phone", phone);
  }

  return conditions.length ? "WHERE " + conditions.join(" AND ") : "";
}

/* ------------------------------------------------------------
   GET /api/bookings
   ------------------------------------------------------------ */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { role, id } = req.user;
    const { status, page, limit } = req.query;

    let providerId;
    let phone;

    if (role === "vendor") {
      providerId = id;
    } else if (role === "resident") {
      const me = await pool.request()
        .input("id", id)
        .query("SELECT phone FROM Residents WHERE id = @id");
      phone = me.recordset[0]?.phone;

      if (!phone) {
        if (page !== undefined) {
          return res.json({
            data: [], total: 0, page: 1,
            limit: parseInt(limit, 10) || 20, totalPages: 1,
          });
        }
        return res.json([]);
      }
    }

    const scopeFilters = { status, providerId, phone };

    const baseSelect = `
      SELECT b.*, p.name AS provider_name, r.rating AS review_rating
      FROM Bookings b
      LEFT JOIN Providers p ON p.id = b.provider_id
      LEFT JOIN Reviews r ON r.booking_id = b.id
    `;

    if (page !== undefined) {
      const pageNum  = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset   = (pageNum - 1) * limitNum;

      const countReq = pool.request();
      const whereClause = applyBookingFilters(countReq, scopeFilters);

      const countRes = await countReq.query(`
        SELECT COUNT(*) AS total
        FROM Bookings b
        ${whereClause}
      `);
      const total = countRes.recordset[0].total || 0;

      const dataReq = pool.request();
      applyBookingFilters(dataReq, scopeFilters);
      dataReq.input("offset", offset);
      dataReq.input("limit",  limitNum);

      const dataRes = await dataReq.query(`
        ${baseSelect}
        ${whereClause}
        ORDER BY b.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

      return res.json({
        data:       dataRes.recordset.map(bookingToJson),
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    }

    const request = pool.request();
    const whereClause = applyBookingFilters(request, scopeFilters);

    const result = await request.query(`
      ${baseSelect}
      ${whereClause}
      ORDER BY b.created_at DESC
    `);

    res.json(result.recordset.map(bookingToJson));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   POST /api/bookings
   (Added Overlap Check based on duration)
   ------------------------------------------------------------ */
router.post("/", async (req, res, next) => {
  try {
    const {
      providerId, service, date, time, notes = "",
      residentName = null, residentPhone = null,
      durationMinutes = 60, // Default to 1 hour
    } = req.body;

    if (!providerId || !service || !date || !time) {
      return res.status(400).json({ error: "Missing required booking fields (provider, service, date, time)." });
    }

    const providerIdInt = parseInt(providerId, 10);
    const duration = parseInt(durationMinutes, 10) || 60;

    if (isNaN(providerIdInt)) {
      return res.status(400).json({ error: "Invalid provider id" });
    }

    const pool = await getPool();

    /* ----------------------------------------------------------
       OVERLAP CHECK: Does this new time block clash with an 
       existing confirmed booking?
       ---------------------------------------------------------- */
    const overlapCheck = await pool.request()
      .input("providerId", providerIdInt)
      .input("job_date", date)
      .input("new_start", time)
      .input("new_duration", duration)
      .query(`
        SELECT COUNT(*) AS clashes
        FROM Bookings
        WHERE provider_id = @providerId
          AND job_date = @job_date
          AND status IN ('confirmed', 'in_progress')
          AND (
            -- 1. New booking starts inside an existing booking's duration
            (@new_start >= job_time AND @new_start < DATEADD(minute, ISNULL(duration_minutes, 60), job_time))
            OR
            -- 2. New booking ends inside an existing booking's duration
            (DATEADD(minute, @new_duration, @new_start) > job_time AND DATEADD(minute, @new_duration, @new_start) <= DATEADD(minute, ISNULL(duration_minutes, 60), job_time))
            OR
            -- 3. New booking completely covers an existing booking
            (@new_start <= job_time AND DATEADD(minute, @new_duration, @new_start) >= DATEADD(minute, ISNULL(duration_minutes, 60), job_time))
          )
      `);

    if (overlapCheck.recordset[0].clashes > 0) {
      return res.status(409).json({
        error: "This time slot overlaps with an existing confirmed booking for this vendor. Please choose a different time."
      });
    }
    /* ---------------------------------------------------------- */

    const inserted = await pool.request()
      .input("providerId",    providerIdInt)
      .input("service",       service)
      .input("job_date",      date)
      .input("job_time",      time)
      .input("duration",      duration) 
      .input("notes",         notes)
      .input("residentName",  residentName)
      .input("residentPhone", residentPhone)
      .query(`
        INSERT INTO Bookings
          (provider_id, service, job_date, job_time, duration_minutes, notes,
           resident_name, resident_phone, status, reviewed)
        OUTPUT INSERTED.*
        VALUES
          (@providerId, @service, @job_date, @job_time, @duration, @notes,
           @residentName, @residentPhone, 'requested', 0)
      `);

    const enriched = await pool.request()
      .input("id", inserted.recordset[0].id)
      .query(`
        SELECT b.*, p.name AS provider_name, NULL AS review_rating
        FROM Bookings b
        LEFT JOIN Providers p ON p.id = b.provider_id
        WHERE b.id = @id
      `);

    res.status(201).json(bookingToJson(enriched.recordset[0]));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   PATCH /api/bookings/:id
   ------------------------------------------------------------ */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking id" });

    const VALID_STATUSES = ['requested', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const pool = await getPool();

    const row = await pool.request()
      .input("id", id)
      .query("SELECT provider_id, resident_phone FROM Bookings WHERE id = @id");
    if (!row.recordset.length) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = row.recordset[0];
    const { role, id: uid } = req.user;

    const isAdmin        = role === "admin";
    const isOwnerVendor  = role === "vendor" && booking.provider_id === uid;

    let isOwnerResident = false;
    if (role === "resident") {
      const me = await pool.request()
        .input("id", uid)
        .query("SELECT phone FROM Residents WHERE id = @id");
      const myPhone = me.recordset[0]?.phone;
      isOwnerResident = myPhone && booking.resident_phone === myPhone;
    }

    if (!isAdmin && !isOwnerVendor && !isOwnerResident) {
      return res.status(403).json({ error: "You cannot modify this booking." });
    }

    const fields = {
      status:              req.body.status,
      reviewed:            req.body.reviewed,
      cancellation_reason: req.body.cancellationReason,
      job_time:            req.body.time,
      duration_minutes:    req.body.durationMinutes, 
    };

    const request = pool.request().input("id", id);
    const sets = [];

    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) {
        // FIX: Explicitly cast duration_minutes to Int for SQL Server
        if (col === "duration_minutes") {
          request.input(col, sql.Int, parseInt(val, 10));
        } else {
          request.input(col, col === "reviewed" ? (val ? 1 : 0) : val);
        }
        sets.push(`${col} = @${col}`);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    await request.query(`
      UPDATE Bookings SET ${sets.join(", ")}
      WHERE id = @id
    `);

    const enriched = await pool.request()
      .input("id", id)
      .query(`
        SELECT b.*, p.name AS provider_name, r.rating AS review_rating
        FROM Bookings b
        LEFT JOIN Providers p ON p.id = b.provider_id
        LEFT JOIN Reviews r ON r.booking_id = b.id
        WHERE b.id = @id
      `);

    res.json(bookingToJson(enriched.recordset[0]));
  } catch (err) {
    next(err);
  }
});

module.exports = router;