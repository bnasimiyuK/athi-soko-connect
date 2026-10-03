/* ============================================================
   routes/auth.js - login, me, logout, change-password, register-resident
   Supports 3 roles: admin, resident, vendor
   Also supports Google signup (googleId in register-resident payload).
   ============================================================ */

const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const router  = express.Router();
const { getPool } = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || "7d";

/* ------------------------------------------------------------
   Helper: sign a JWT for a user object
   ------------------------------------------------------------ */
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ============================================================
   POST /api/auth/login
   Body: { role, identifier, password }
   role:       "admin" | "resident" | "vendor"
   identifier: email (admin) OR phone (resident/vendor)
   ============================================================ */
router.post("/login", async (req, res, next) => {
  try {
    const { role, identifier, password } = req.body;

    if (!role || !identifier || !password) {
      return res.status(400).json({
        error: "role, identifier, and password are required.",
      });
    }

    if (!["admin", "resident", "vendor"].includes(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const pool = await getPool();
    let user = null;
    let mustChange = false;

    /* ---------- ADMIN ---------- */
    if (role === "admin") {
      const result = await pool.request()
        .input("email", identifier.trim().toLowerCase())
        .query("SELECT * FROM Admins WHERE email = @email");

      if (result.recordset.length) {
        const row = result.recordset[0];
        const ok = await bcrypt.compare(password, row.password_hash);
        if (ok) {
          user = {
  id:    row.id,
  role:  row.role || "admin",   /* 'super' or 'admin' */
  name:  row.full_name,
  email: row.email,
};
          mustChange = !!row.must_change_password;
        }
      }
    }

    /* ---------- RESIDENT ---------- */
    if (role === "resident") {
      const result = await pool.request()
        .input("phone", identifier.trim())
        .query(`
          SELECT r.*, c.name AS court_name, c.phase
          FROM Residents r
          LEFT JOIN Courts c ON c.id = r.court_id
          WHERE r.phone = @phone
        `);

      if (result.recordset.length) {
        const row = result.recordset[0];

        if (!row.verified) {
          return res.status(403).json({
            error: "Your resident account is pending admin approval.",
          });
        }

        if (!row.password_hash) {
          return res.status(403).json({
            error: "No password set for this account. Please sign in with Google or contact the admin.",
          });
        }

        if (row.must_change_password && row.temp_password_expires) {
          const now     = new Date();
          const expires = new Date(row.temp_password_expires);
          if (now > expires) {
            return res.status(403).json({
              error: "Your temporary password has expired. Please contact the admin.",
            });
          }
        }

        const ok = await bcrypt.compare(password, row.password_hash);
        if (ok) {
          user = {
            id:    row.id,
            role:  "resident",
            name:  row.full_name,
            phone: row.phone,
            court: row.court_name || null,
            phase: row.phase || null,
          };
          mustChange = !!row.must_change_password;
        }
      }
    }

    /* ---------- VENDOR ---------- */
    if (role === "vendor") {
      const result = await pool.request()
        .input("phone", identifier.trim())
        .query(`
          SELECT
            p.*,
            r.full_name,
            r.phone                AS resident_phone,
            r.password_hash        AS resident_password_hash,
            r.must_change_password,
            r.temp_password_expires,
            r.verified             AS resident_verified,
            c.name                 AS court_name,
            c.phase                AS court_phase
          FROM Providers p
          JOIN Residents r ON r.id = p.resident_id
          LEFT JOIN Courts c ON c.id = r.court_id
          WHERE r.phone = @phone
        `);

      if (result.recordset.length) {
        const row = result.recordset[0];

        if (!row.resident_verified) {
          return res.status(403).json({
            error: "Your resident account is pending approval.",
          });
        }
        if (!row.verified) {
          return res.status(403).json({
            error: "Your vendor application is pending admin approval.",
          });
        }
        if (!row.resident_password_hash) {
          return res.status(403).json({
            error: "No password set for this account. Please contact the admin.",
          });
        }

        if (row.must_change_password && row.temp_password_expires) {
          const now     = new Date();
          const expires = new Date(row.temp_password_expires);
          if (now > expires) {
            return res.status(403).json({
              error: "Your temporary password has expired. Please contact the admin.",
            });
          }
        }

        const ok = await bcrypt.compare(password, row.resident_password_hash);
        if (ok) {
          user = {
            id:         row.id,
            role:       "vendor",
            name:       row.name,
            residentId: row.resident_id,
            phone:      row.resident_phone,
            court:      row.court_name || null,
            phase:      row.court_phase || null,
          };
          mustChange = !!row.must_change_password;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = signToken(user);
    res.json({ token, user, mustChangePassword: mustChange });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   POST /api/auth/register-resident
   Public self-registration.
   Works for BOTH manual signups and Google signups.

   Manual:
     Body: { fullName, phone, email, courtId, password }
   Google:
     Body: { fullName, phone, email, courtId, googleId }
             (password is not required)

   Creates resident with verified = 0 for BOTH paths -
   admin still approves.
   ============================================================ */
router.post("/register-resident", async (req, res, next) => {
  const pool = await getPool();
  const tx   = pool.transaction();

  try {
    const {
      fullName, phone, email, courtId, password,
      googleId = null,             /* set when signing up via Google */
    } = req.body;

    const isGoogleSignup = !!googleId;

    /* ---------- Basic presence checks ---------- */
    if (!fullName || !phone || !courtId) {
      return res.status(400).json({
        error: "fullName, phone, and courtId are required.",
      });
    }

    /* Password required only for non-Google signups */
    if (!isGoogleSignup && !password) {
      return res.status(400).json({
        error: "Password is required.",
      });
    }

    /* Password rules - only when a password is provided */
    if (!isGoogleSignup) {
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: "Password must contain an uppercase letter." });
      }
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: "Password must contain a lowercase letter." });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: "Password must contain a number." });
      }
    }

    const courtIdInt = parseInt(courtId, 10);
    if (isNaN(courtIdInt)) {
      return res.status(400).json({ error: "Invalid courtId." });
    }

    /* ---------- Pre-flight checks ---------- */

    /* Court exists? */
    const court = await pool.request()
      .input("courtId", courtIdInt)
      .query("SELECT id FROM Courts WHERE id = @courtId");
    if (!court.recordset.length) {
      return res.status(400).json({ error: "Court not found." });
    }

    /* Phone uniqueness */
    const existing = await pool.request()
      .input("phone", phone.trim())
      .query("SELECT id FROM Residents WHERE phone = @phone");
    if (existing.recordset.length) {
      return res.status(409).json({ error: "Phone number already registered." });
    }

    /* Email uniqueness (if provided) */
    if (email && email.trim()) {
      const emailExists = await pool.request()
        .input("email", email.trim().toLowerCase())
        .query("SELECT id FROM Residents WHERE email = @email");
      if (emailExists.recordset.length) {
        return res.status(409).json({
          error: "That email is already registered. Please log in instead.",
        });
      }
    }

    /* Hash password (or null for Google signups) */
    const passwordHash = isGoogleSignup
      ? null
      : await bcrypt.hash(password, BCRYPT_ROUNDS);

    /* ---------- BEGIN TRANSACTION ---------- */
    await tx.begin();

    try {
      /* ---- 1. Insert resident ---- */
      const inserted = await tx.request()
        .input("fullName", fullName.trim())
        .input("phone",    phone.trim())
        .input("email",    email && email.trim() ? email.trim().toLowerCase() : null)
        .input("courtId",  courtIdInt)
        .input("hash",     passwordHash)
        .query(`
          INSERT INTO Residents
            (full_name, phone, email, court_id, password_hash,
             verified, must_change_password)
          OUTPUT INSERTED.id
          VALUES
            (@fullName, @phone, @email, @courtId, @hash, 0, 0)
        `);

      const residentId = inserted.recordset[0].id;

      /* ---- 2. If Google signup, link the social account ---- */
      if (isGoogleSignup) {
        await tx.request()
          .input("rid",      residentId)
          .input("provider", "google")
          .input("pid",      String(googleId))
          .query(`
            INSERT INTO SocialAccounts (resident_id, provider, provider_id)
            VALUES (@rid, @provider, @pid)
          `);
      }

      await tx.commit();

      /* ---- 3. Return the created resident ---- */
      const full = await pool.request()
        .input("id", residentId)
        .query(`
          SELECT r.id, r.full_name, r.phone, r.email, r.verified, r.created_at,
                 c.name AS court_name, c.phase
          FROM Residents r
          JOIN Courts c ON c.id = r.court_id
          WHERE r.id = @id
        `);

      const created = full.recordset[0];

      res.status(201).json({
        id:           created.id,
        fullName:     created.full_name,
        phone:        created.phone,
        email:        created.email,
        courtName:    created.court_name,
        phase:        created.phase,
        verified:     !!created.verified,
        googleSignup: isGoogleSignup,
        createdAt:    created.created_at,
      });

    } catch (inner) {
      await tx.rollback();
      throw inner;
    }
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   GET /api/auth/me - return current user from token
   ============================================================ */
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ============================================================
   POST /api/auth/change-password
   Body: { currentPassword, newPassword }
   Works for admins, residents, and vendors.
   ============================================================ */
router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "currentPassword and newPassword are required.",
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters.",
      });
    }

    const pool = await getPool();
    const { id, role } = req.user;

    let table = "";
    let idForUpdate = id;

    if (role === "admin")    table = "Admins";
    if (role === "resident") table = "Residents";
    if (role === "vendor") {
      table = "Residents";
      idForUpdate = req.user.residentId || id;
    }

    if (!table) {
      return res.status(400).json({ error: "Unknown role." });
    }

    const row = await pool.request()
      .input("id", idForUpdate)
      .query(`SELECT password_hash AS hash FROM ${table} WHERE id = @id`);

    if (!row.recordset.length) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (!row.recordset[0].hash) {
      return res.status(400).json({
        error: "This account has no password set (Google-only). Please set a password from your profile page.",
      });
    }

    const ok = await bcrypt.compare(currentPassword, row.recordset[0].hash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.request()
      .input("id",   idForUpdate)
      .input("hash", newHash)
      .query(`
        UPDATE ${table}
        SET password_hash         = @hash,
            must_change_password  = 0,
            temp_password_expires = NULL
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   POST /api/auth/logout - client-side token delete
   ============================================================ */
router.post("/logout", (req, res) => {
  res.json({ ok: true });
});

module.exports = router;