/* ============================================================
   auth.js — token, session, role guards, UI gating
   Load BEFORE api.js
   ============================================================ */

const TOKEN_KEY = "asc_token";
const USER_KEY  = "asc_user";

/* ------------------------------------------------------------
   SESSION STORAGE
   ------------------------------------------------------------ */
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!getToken();
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* ------------------------------------------------------------
   LOGOUT
   ------------------------------------------------------------ */
function logout() {
  clearSession();
  window.location.href = "login.html";
}

/* ------------------------------------------------------------
   ROLE HELPERS
   ------------------------------------------------------------ */
function isAdminUser(user) {
  return !!user && (user.role === "admin" || user.role === "super");
}

function isSuperUser(user) {
  return !!user && user.role === "super";
}

function isProviderUser(user) {
  return !!user && user.role === "vendor";
}

/* ------------------------------------------------------------
   REDIRECT BY ROLE
   ------------------------------------------------------------ */
function redirectByRole(role) {
  switch (role) {
    case "super":
    case "admin":    return (window.location.href = "admin.html");
    case "resident": return (window.location.href = "dashboard.html");
    case "vendor":   return (window.location.href = "provider-dashboard.html");
    default:         return (window.location.href = "login.html");
  }
}

/* ------------------------------------------------------------
   GUARDS
   ------------------------------------------------------------ */

/* Require any logged-in session */
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href =
      "login.html?next=" + encodeURIComponent(window.location.pathname);
    return false;
  }
  return true;
}

/* Require one of the given roles.
   "super" implicitly satisfies every requirement. */
function requireRole(...allowed) {
  if (!requireLogin()) return false;

  const user = getUser();
  const role = user?.role;

  if (role === "super") return true;

  if (!role || !allowed.includes(role)) {
    alert("You don't have permission to view this page.");
    redirectByRole(role || "resident");
    return false;
  }
  return true;
}

/* ------------------------------------------------------------
   UI ROLE GATING
   Hide admin-only, super-only, and provider-only UI
   for users who shouldn't see them. Pass null for guests.
   ------------------------------------------------------------ */
function applyRoleGating(user) {
  const isAdmin    = isAdminUser(user);
  const isSuper    = isSuperUser(user);
  const isProvider = isProviderUser(user);

  /* Admin-only elements (sidebar Admin link, export buttons, etc.) */
  document.querySelectorAll("[data-admin-only]").forEach(el => {
    if (isAdmin) el.hidden = false;
    else el.remove();
  });

  /* Super-admin-only elements (e.g. Manage admins inside admin tools) */
  document.querySelectorAll("[data-super-only]").forEach(el => {
    if (isSuper) el.hidden = false;
    else el.remove();
  });

  /* Provider-only elements (incoming bookings, provider profile) */
  document.querySelectorAll("[data-provider-only]").forEach(el => {
    if (isProvider || isAdmin) el.hidden = false;
    else el.remove();
  });
}

/* ------------------------------------------------------------
   TOPBAR — ensure it exists in the DOM
   If a page forgot to include the topbar markup, this inserts it
   at the top of .side-rail__content.
   ------------------------------------------------------------ */
function ensureTopbar() {
  const content = document.querySelector(".side-rail__content");
  if (!content) return;

  // Already present → nothing to do
  if (content.querySelector("#topbar-user")) return;

  const bar = document.createElement("div");
  bar.className = "side-rail__topbar";
  bar.innerHTML =
    '<div class="side-rail__topbar-inner">' +
      '<div class="side-rail__topbar-left" id="topbar-left"></div>' +
      '<div class="side-rail__topbar-user" id="topbar-user"></div>' +
    '</div>';

  content.insertBefore(bar, content.firstChild);
}

/* ------------------------------------------------------------
   AUTH CHIP — top-right topbar
   Renders user avatar + name + role + logout into #topbar-user
   ------------------------------------------------------------ */
function renderTopbarAuth() {
  const slot = document.getElementById("topbar-user");
  if (!slot) return;

  const user  = getUser();
  const token = getToken();

  /* Logged out → single Login button */
  if (!token || !user) {
    slot.innerHTML =
      '<a href="login.html" class="btn btn--ghost btn--small">Log in</a>';
    return;
  }

  /* Logged in → avatar + name + role + logout */
  const name = user.name || user.phone || "there";
  const role = user.role || "resident";

  const roleLabel =
    role === "super"    ? "Super Admin" :
    role === "admin"    ? "Admin" :
    role === "vendor"   ? "Vendor" :
    role === "resident" ? "Resident" :
                          "Member";

  /* Photo placeholder — shown until a real avatarUrl is available */
const placeholderSvg = `
  <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="15" r="7" fill="#c7cdd6"/>
    <path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14z" fill="#c7cdd6"/>
  </svg>`;

const avatarInner = user.avatarUrl
  ? '<img src="' + escapeHtml(user.avatarUrl) + '" alt="">'
  : placeholderSvg;

  slot.innerHTML =
    '<div class="user-menu">' +
      '<span class="user-menu__avatar">' + avatarInner + '</span>' +
      '<span class="user-menu__meta">' +
        '<span class="user-menu__name">' + escapeHtml(name) + '</span>' +
        '<span class="user-menu__role" data-role="' + role + '">' + roleLabel + '</span>' +
      '</span>' +
      '<button type="button" id="topbar-logout" class="user-menu__logout" ' +
              'aria-label="Log out" title="Log out">' +
        '<i class="fas fa-sign-out-alt" aria-hidden="true"></i>' +
      '</button>' +
    '</div>';

  const out = document.getElementById("topbar-logout");
  if (out) out.addEventListener("click", logout);
}

/* ------------------------------------------------------------
   SMALL UTILITIES
   ------------------------------------------------------------ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
   ACTIVE NAV HIGHLIGHTING (sidebar)
   Matches data-nav against the current filename.
   ------------------------------------------------------------ */
function highlightSidebarNav() {
  const current = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  document.querySelectorAll(".side-rail__nav a[data-nav]").forEach(a => {
    a.classList.toggle("is-active", a.dataset.nav === current);
  });
}

/* ------------------------------------------------------------
   BOOT
   Runs on every page that includes auth.js.
   ------------------------------------------------------------ */
function initAuthUi() {
  ensureTopbar();              // create the topbar container if missing
  renderTopbarAuth();          // fill it with chip / login link
  applyRoleGating(getUser());  // hide admin/provider-only elements
  highlightSidebarNav();       // highlight active sidebar link
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthUi);
} else {
  initAuthUi();
}