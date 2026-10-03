/* ============================================================
   main.js - shared helpers loaded on every page
   + dynamic nav (login state + role-based visibility)
   ============================================================ */

let CATEGORY_CACHE = [];

/* ---------------- API CACHE ---------------- */
async function loadCategoryCache() {
  if (!CATEGORY_CACHE.length) {
    CATEGORY_CACHE = await Api.getCategories();
  }
  return CATEGORY_CACHE;
}

/* ---------------- HELPERS ---------------- */
function categoryLabel(id) {
  const cat = CATEGORY_CACHE.find((c) => c.id === id);
  return cat ? cat.label : id;
}

function starString(rating) {
  if (!rating) return "No ratings yet";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full) + `  ${rating.toFixed(1)}`;
}

function verifiedBadge(isVerified) {
  return isVerified
    ? `<span class="badge badge--verified">Verified</span>`
    : `<span class="badge badge--pending">Pending review</span>`;
}

function statusBadge(status) {
  const map = {
    requested: "badge--requested",
    confirmed: "badge--confirmed",
    completed: "badge--completed",
    declined:  "badge--declined",
  };
  return `<span class="badge ${map[status] || ""}">${status}</span>`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

/* ---------------- NAV: highlight active link ---------------- */
function markActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.remove("is-active");
    if (link.getAttribute("data-nav") === path) {
      link.classList.add("is-active");
    }
  });

  /* Highlight Admin dropdown when inside its subpages */
  const adminPaths = ["admin.html", "pending.html", "admin-admins.html",
                      "admin-providers.html", "admin-reviews.html",
                      "admin-residents.html", "admin-house-numbers.html",
                      "admin-invoices.html", "admin-payments.html"];
  if (adminPaths.includes(path)) {
    const adminTrigger = document.querySelector(".nav-dropdown > a");
    if (adminTrigger) adminTrigger.classList.add("is-active");
  }
}

/* ---------------- NAV: login/logout slot ---------------- */
function renderAuthNav() {
  const nav = document.querySelector("nav.main-nav");
  if (!nav) return;

  const existing = nav.querySelector(".auth-slot");
  if (existing) existing.remove();

  const slot = document.createElement("span");
  slot.className = "auth-slot";
  slot.style.display = "inline-flex";
  slot.style.alignItems = "center";
  slot.style.gap = "14px";

  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    const user = getUser();
    const role = user?.role;

    /* Badge label - SUPER ADMIN has its own label */
    const roleLabel =
      role === "super"    ? "Super Admin" :
      role === "admin"    ? "Admin" :
      role === "resident" ? "Resident" :
      role === "vendor"   ? "Vendor" :
      "User";

    /* Badge color - super is violet, distinct from admin clay */
    const roleColor =
      role === "super"    ? "#7c3aed" :
      role === "admin"    ? "#b0472e" :
      role === "resident" ? "#2f6f5e" :
      role === "vendor"   ? "#c8862a" :
      "#4a5670";

    slot.innerHTML = `
      <span style="font-size:0.9rem; color:var(--ink-70); display:inline-flex; align-items:center; gap:6px;">
        Hi, ${user?.name || "there"}
        <span style="background:${roleColor}; color:#fff; font-size:0.65rem;
                     padding:2px 8px; border-radius:999px; font-weight:600;
                     letter-spacing:0.4px; text-transform:uppercase;">
          ${roleLabel}
        </span>
      </span>
      <a href="#" id="logoutLink" style="font-size:0.9rem;">Logout</a>
    `;
    nav.appendChild(slot);

    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    slot.innerHTML = `<a href="login.html" data-nav="login.html">Log in</a>`;
    nav.appendChild(slot);
  }
}

/* ------------------------------------------------------------
   NAV: role-based visibility

   - Hide [data-super-only] elements unless user is a super admin
   - Hide the "Admin" dropdown for non-admins
   ------------------------------------------------------------ */
function applyRoleVisibility() {
  const user = (typeof getUser === "function") ? getUser() : null;
  const role = user?.role || null;

  /* 1. Super-only elements */
  if (role !== "super") {
    document.querySelectorAll("[data-super-only]").forEach((el) => {
      el.style.display = "none";
    });
  }

  /* 2. Hide the Admin dropdown for non-admins */
  const isAdmin = role === "admin" || role === "super";
  if (!isAdmin) {
    document.querySelectorAll(".nav-dropdown").forEach((dd) => {
      const trigger = dd.querySelector("a");
      const label   = trigger?.textContent?.trim() || "";
      if (label.startsWith("Admin")) {
        dd.style.display = "none";
      }
    });
  }
}

/* ---------------- DROPDOWN ---------------- */
function setupDropdown() {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".nav-dropdown > a");
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const menu = trigger.nextElementSibling;
      if (menu && menu.classList.contains("dropdown-menu")) {
        menu.classList.toggle("show");
      }
      return;
    }
    document.querySelectorAll(".dropdown-menu.show").forEach((m) => m.classList.remove("show"));
  });
}

/* ---------------- TOAST ----------------
   toast(message)               → default 3.2s
   toast(message, 6000)         → 6s
-------------------------------------------- */
function toast(message, duration = 3200) {
  let el = document.getElementById("asc-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "asc-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("toast--visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("toast--visible"), duration);
}

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  renderAuthNav();
  applyRoleVisibility();
  setupDropdown();
});