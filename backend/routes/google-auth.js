/* ============================================================
   backend/routes/google-auth.js
   Google OAuth 2.0 - login AND signup.

   Two modes:
     GET /auth/google?mode=login   (default)  → create or find user, sign JWT
     GET /auth/google?mode=signup             → verify Google identity only,
                                                 return profile data, NO DB insert.

   Login-mode role resolution (in order):
     1. Admins table (by email)     → role from that row (admin / super)
     2. SocialAccounts              → existing Google-linked resident
     3. Residents (by email)        → link Google to existing resident
     4. Create new resident

   Mounted at /auth to match GOOGLE_REDIRECT_URI.
   ============================================================ */

const express = require("express");
const axios   = require("axios");
const crypto  = require("crypto");
const jwt     = require("jsonwebtoken");
const router  = express.Router();
const { getPool }    = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:3000";
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || "7d";

/* ---------- Sign a JWT for a resolved user object ---------- */
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ---------- Where to redirect after the callback ---------- */
function redirectToFrontend(res, { token, user, error, mode, googleProfile }) {
  const params = new URLSearchParams();
  if (token)         params.set("token", token);
  if (user)          params.set("user",  encodeURIComponent(JSON.stringify(user)));
  if (error)         params.set("error", error);
  if (mode)          params.set("mode",  mode);
  if (googleProfile) params.set("googleProfile", encodeURIComponent(JSON.stringify(googleProfile)));

  /* Signup → back to the residents form; Login → social-callback.html */
  const target = (mode === "signup")
    ? `${FRONTEND_BASE}/residents.html`
    : `${FRONTEND_BASE}/social-callback.html`;

  const finalUrl = `${target}#${params.toString()}`;
  console.log(`[google] redirecting → ${target} (mode=${mode || "login"})`);
  res.redirect(finalUrl);
}

/* ---------- In-memory state store ---------- */
const STATE_STORE  = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function putState(key, value) {
  STATE_STORE.set(key, { ...value, expiresAt: Date.now() + STATE_TTL_MS });
  for (const [k, v] of STATE_STORE) {
    if (v.expiresAt < Date.now()) STATE_STORE.delete(k);
  }
}
function takeState(key) {
  const v = STATE_STORE.get(key);
  STATE_STORE.delete(key);
  if (!v || v.expiresAt < Date.now()) return null;
  return v;
}

/* ============================================================
   GET /auth/google - kick off the flow
   ============================================================ */
router.get("/google", (req, res) => {
  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).send("Google OAuth not configured (.env).");
  }

  const mode  = req.query.mode === "signup" ? "signup" : "login";
  const state = crypto.randomBytes(16).toString("hex");
  putState(state, { provider: "google", mode });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",     clientId);
  url.searchParams.set("redirect_uri",  redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",         "openid email profile");
  url.searchParams.set("state",         state);
  url.searchParams.set("access_type",   "online");
  url.searchParams.set("prompt",        "select_account");

  res.redirect(url.toString());
});

/* ============================================================
   GET /auth/google/callback
   ============================================================ */
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return redirectToFrontend(res, { error: `Google: ${error}` });

    const stored = takeState(state);
    if (!stored || stored.provider !== "google") {
      return redirectToFrontend(res, { error: "Invalid or expired state." });
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    /* ---- 1. Exchange code for access token ---- */
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token } = tokenRes.data;

    /* ---- 2. Fetch profile ---- */
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const profile = profileRes.data;
    console.log(`[google] profile: ${profile.email}`);

    /* ============================================================
       SIGNUP MODE: don't touch the DB, just return the profile
       ============================================================ */
    if (stored.mode === "signup") {
      const googleProfile = {
        id:         profile.id,
        email:      (profile.email || "").toLowerCase(),
        name:       profile.name         || "",
        givenName:  profile.given_name   || "",
        familyName: profile.family_name  || "",
      };

      const pool = await getPool();

      /* If they're already an admin, block signup. */
      const adminCheck = await pool.request()
        .input("email", googleProfile.email)
        .query("SELECT id FROM Admins WHERE email = @email");

      if (adminCheck.recordset.length) {
        console.log(`[google] signup blocked - admin email`);
        return redirectToFrontend(res, {
          mode:          "signup",
          googleProfile,
          error:         "This email belongs to an admin account. Please use the Admin login tab instead.",
        });
      }

      /* If they already have a resident account, warn them. */
      const existing = await pool.request()
        .input("email", googleProfile.email)
        .query("SELECT id FROM Residents WHERE email = @email");

      if (existing.recordset.length) {
        console.log(`[google] signup blocked - resident already exists`);
        return redirectToFrontend(res, {
          mode:          "signup",
          googleProfile,
          error:         "You already have an account with this email. Please log in with Google instead.",
        });
      }

      return redirectToFrontend(res, { mode: "signup", googleProfile });
    }

    /* ============================================================
       LOGIN MODE: resolve user (admin first, then resident), issue JWT
       ============================================================ */
    const user  = await findOrCreateGoogleUser(profile);
    const token = signToken(user);

    console.log(`[google] issued JWT for ${user.email} as role=${user.role} (id=${user.id})`);
    redirectToFrontend(res, { token, user, mode: "login" });

  } catch (err) {
    console.error("[google callback]", err.response?.data || err.message);
    redirectToFrontend(res, { error: "Google sign-in failed." });
  }
});

/* ============================================================
   Login-mode user resolution.

   Order:
     0. Admins table (by email)   → role from that row (admin / super)
     1. SocialAccounts            → existing Google-linked resident
     2. Residents by email        → link Google to existing resident
     3. Create new resident
   ============================================================ */
async function findOrCreateGoogleUser(profile) {
  const email = (profile.email || "").toLowerCase();
  const pool  = await getPool();

  /* ---- 0. Admin check FIRST ---- */
  if (email) {
    const adminRow = await pool.request()
      .input("email", email)
      .query("SELECT id, email, full_name, role FROM Admins WHERE email = @email");

    if (adminRow.recordset.length) {
      const a = adminRow.recordset[0];
      console.log(`[google] admin login: ${a.email} (role=${a.role})`);
      return {
        id:    a.id,
        role:  a.role || "admin",
        name:  a.full_name,
        email: a.email,
      };
    }
  }

  /* ---- 1. Existing social link ---- */
  const existing = await pool.request()
    .input("provider",   "google")
    .input("providerId", profile.id)
    .query("SELECT resident_id FROM SocialAccounts WHERE provider = @provider AND provider_id = @providerId");

  if (existing.recordset.length) {
    return await loadResident(existing.recordset[0].resident_id);
  }

  /* ---- 2. Existing resident by email → link ---- */
  if (email) {
    const byEmail = await pool.request()
      .input("email", email)
      .query("SELECT id FROM Residents WHERE email = @email");

    if (byEmail.recordset.length) {
      const residentId = byEmail.recordset[0].id;
      await linkSocial(residentId, "google", profile.id);
      return await loadResident(residentId);
    }
  }

  /* ---- 3. Create new resident (login-with-Google as first touch) ---- */
  const cleanName        = (profile.name || "Google User").trim();
  const shortId          = String(profile.id).slice(-12);
  const phonePlaceholder = `G-${shortId}`;

  const inserted = await pool.request()
    .input("name",  cleanName)
    .input("phone", phonePlaceholder)
    .input("email", email || null)
    .query(`
      INSERT INTO Residents (full_name, phone, email, verified, must_change_password)
      OUTPUT INSERTED.id
      VALUES (@name, @phone, @email, 1, 0)
    `);
  const residentId = inserted.recordset[0].id;
  await linkSocial(residentId, "google", profile.id);
  return await loadResident(residentId);
}

async function linkSocial(residentId, provider, providerId) {
  const pool = await getPool();
  await pool.request()
    .input("rid",      residentId)
    .input("provider", provider)
    .input("pid",      providerId)
    .query(`
      IF NOT EXISTS (SELECT * FROM SocialAccounts WHERE provider = @provider AND provider_id = @pid)
      INSERT INTO SocialAccounts (resident_id, provider, provider_id)
      VALUES (@rid, @provider, @pid)
    `);
}

async function loadResident(id) {
  const pool = await getPool();
  const r = await pool.request()
    .input("id", id)
    .query("SELECT id, full_name, phone, email FROM Residents WHERE id = @id");
  if (!r.recordset.length) throw new Error("Resident not found.");
  const row = r.recordset[0];
  return { id: row.id, role: "resident", name: row.full_name, phone: row.phone };
}

module.exports = router;