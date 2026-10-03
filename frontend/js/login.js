/* ============================================================
   login.js - role-tabbed login form
   Roles: admin, resident, vendor
   Uses shared validators.js for email/phone checks + normalization.
   ============================================================ */

let currentRole = "resident";

/* ------------------------------------------------------------
   Configure placeholder + label per role
   ------------------------------------------------------------ */
function applyRole(role) {
  currentRole = role;

  const label = document.getElementById("identifierLabel");
  const input = document.getElementById("identifier");

  if (role === "admin") {
    /* Admin logs in with email */
    label.innerHTML = `<i class="fas fa-envelope"></i> Email address`;
    input.placeholder = "you@example.com";
    input.type = "email";
    input.value = "";
  } else {
    /* Resident & vendor log in with phone */
    label.innerHTML = `<i class="fas fa-phone-alt"></i> Phone number`;
    input.placeholder = "07XX XXX XXX";
    input.type = "tel";
    input.value = "";
  }

  document.querySelectorAll("#roleTabs .tab-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.role === role);
  });
}

/* ------------------------------------------------------------
   Redirect after login.

   Priority:
     1. ?next= param - but ONLY if the role can access it.
        (Otherwise we'd cause a loop between protected page and login.)
     2. Role default - admin/super → admin.html, etc.

   Note: super admin passes every access check (Option B).
   ------------------------------------------------------------ */
function redirectAfterLogin(user) {
  const params = new URLSearchParams(window.location.search);
  const next   = params.get("next");
  const role   = user?.role;

  /* Only honor ?next= if the role can actually access it */
  const canAccess = (target, role) => {
    if (!target) return false;
    if (target.includes("admin") || target.includes("pending")) {
      return role === "admin" || role === "super";
    }
    if (target.includes("provider")) {
      return role === "vendor" || role === "super";
    }
    if (target.includes("dashboard") || target.includes("billing") ||
        target.includes("visitors")) {
      return role === "resident" || role === "super";
    }
    return true;
  };

  if (next && canAccess(next, role)) {
    window.location.href = next;
    return;
  }

  /* Role-based default */
  if (role === "admin" || role === "super") {
    window.location.href = "admin.html";
  } else if (role === "vendor") {
    window.location.href = "provider-dashboard.html";
  } else {
    window.location.href = "dashboard.html";
  }
}

/* ------------------------------------------------------------
   Submit
   ------------------------------------------------------------ */
async function handleLogin(e) {
  e.preventDefault();

  const btn      = document.getElementById("loginBtn");
  const rawId    = document.getElementById("identifier").value.trim();
  const password = document.getElementById("password").value;

  if (!rawId || !password) {
    showMessage("Please fill in both fields.", true);
    return;
  }

  /* ---------- Client-side format validation + normalization ---------- */
  let normalizedIdentifier = rawId;

  if (currentRole === "admin") {
    /* Admin logs in with email */
    const check = validateEmail(rawId, { optional: false });
    if (!check.valid) { showMessage(check.reason, true); return; }
    normalizedIdentifier = check.normalized;
  } else {
    /* Resident & vendor log in with phone (Kenyan or international) */
    const check = normalizePhone(rawId);
    if (!check.valid) { showMessage(check.reason, true); return; }
    normalizedIdentifier = check.normalized;
  }

  btn.disabled = true;
  showMessage("Signing in…", false);

  try {
    const result = await Api.login({
      role:       currentRole,
      identifier: normalizedIdentifier,
      password,
    });

    /* Save token + user */
    saveSession(result.token, result.user);

    /* Forced password change takes priority over role redirect */
    if (result.mustChangePassword) {
      window.location.href = "change-password.html?first=1";
      return;
    }

    redirectAfterLogin(result.user);

  } catch (err) {
    console.error("[login] failed:", err);
    showMessage(err.message || "Login failed. Please try again.", true);
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------
   Show message box
   ------------------------------------------------------------ */
function showMessage(text, isError) {
  const box = document.getElementById("loginMessage");
  const txt = document.getElementById("loginMessageText");
  if (!box || !txt) return;
  box.classList.remove("hidden");
  box.classList.toggle("error", !!isError);
  txt.textContent = text;
}

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  /* If already logged in, redirect */
  if (isLoggedIn()) {
    const user = getUser();
    if (user && user.role) redirectAfterLogin(user);
    return;
  }

  /* Tab handlers */
  document.querySelectorAll("#roleTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyRole(btn.dataset.role));
  });

  /* Default role */
  applyRole("resident");

  /* Form submit */
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
});