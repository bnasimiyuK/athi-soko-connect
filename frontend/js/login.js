/* ============================================================
   login.js — role-tabbed login form
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
   Redirect after login, based on role (or `?next=` param)

   Priority:
   1. ?next= param   → that URL                (deep links)
   2. Role default   → admin/resident/vendor pages
   ------------------------------------------------------------ */
function redirectAfterLogin(user) {
  /* 1. Honor ?next= if present */
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (next) {
    window.location.href = next;
    return;
  }

  /* 2. Role-based default */
  switch (user?.role) {
    case "admin":  window.location.href = "admin.html"; break;
    case "vendor": window.location.href = "provider-dashboard.html"; break;
    case "resident":
    default:       window.location.href = "dashboard.html"; break;
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