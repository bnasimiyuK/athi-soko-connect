/* ============================================================
   main.js - shared helpers loaded on every page
   NOTE: Auth UI (login chip / logout) is owned by auth.js.
         main.js no longer touches #side-rail-auth or the topbar.
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

/* ============================================================
   NAV: highlight the active link
   ============================================================ */
function markActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.remove("is-active");
    if (link.getAttribute("data-nav") === path) {
      link.classList.add("is-active");
    }
  });
}

/* ============================================================
   MOBILE SIDEBAR TOGGLE
   ============================================================ */
function setupSideRailToggle() {
  const rail     = document.getElementById("side-rail");
  const toggle   = document.getElementById("side-rail-toggle");
  const backdrop = document.getElementById("side-rail-backdrop");
  if (!rail || !toggle) return;

  const open = () => {
    rail.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    rail.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-visible");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", () => {
    rail.classList.contains("is-open") ? close() : open();
  });

  if (backdrop) backdrop.addEventListener("click", close);

  rail.querySelectorAll(".side-rail__nav a[href]:not([href='#'])").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) close();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

/* ============================================================
   TOAST
   ============================================================ */
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

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  setupSideRailToggle();
});