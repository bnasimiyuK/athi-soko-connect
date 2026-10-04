/* ============================================================
   middleware/auth.js - JWT verification + role checking
   Loaded by any route that needs authentication.
   ============================================================ */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/* ------------------------------------------------------------
   requireAuth - verifies the JWT and attaches req.user

   Usage:
     router.get("/protected", requireAuth, (req, res) => {
       res.json({ user: req.user });
     });

   On success, req.user is set to the decoded JWT payload:
     { id, role, name|fullName, email, ... }
   ------------------------------------------------------------ */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/* ------------------------------------------------------------
   requireRole - allows one or more roles (variadic).
   Must be used AFTER requireAuth (so req.user exists).

   Usage:
     router.delete("/:id", requireAuth, requireRole("super"), handler);
     router.patch ("/:id", requireAuth, requireRole("admin", "super"), handler);
     router.get   ("/x",   requireAuth, requireRole("resident", "vendor"), handler);
   ------------------------------------------------------------ */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission for this action.",
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET,
};