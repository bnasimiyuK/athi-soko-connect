/* ============================================================
   main.js - shared helpers loaded on every page
   + dynamic nav (login state + role-based visibility)
   + sidebar group toggle + mobile rail toggle
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
   NAV: highlight active link (sidebar aware)
   ============================================================ */
function markActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.remove("is-active");
    if (link.getAttribute("data-nav") === path) {
      link.classList.add("is-active");
    }
  });

  const adminPaths = [
    "admin.html", "pending.html", "admin-admins.html",
    "admin-providers.html", "admin-reviews.html",
    "admin-residents.html", "admin-house-numbers.html",
    "admin-categories.html", "admin-invoices.html", "admin-payments.html",
  ];

  if (adminPaths.includes(path)) {
    const group = document.querySelector(".side-rail__group");
    if (group) group.classList.add("is-open");

    const trigger = group?.querySelector(".side-rail__group-toggle");
    if (trigger) trigger.classList.add("is-active");
  }
}

/* ============================================================
   NAV: login/logout slot
   Prefers the sidebar footer slot (#side-rail-auth),
   falls back to the legacy header nav (nav.main-nav).
   ============================================================ */
function renderAuthNav() {
  const slot = document.getElementById("side-rail-auth")
  if (!slot) return;

  const existing = slot.querySelector(".auth-slot");
  if (existing) existing.remove();

  const wrap = document.createElement("span");
  wrap.className = "auth-slot";

  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    const user = getUser();
    const role = user?.role;

    const roleLabel =
      role === "super"    ? "Super Admin" :
      role === "admin"    ? "Admin" :
      role === "resident" ? "Resident" :
      role === "vendor"   ? "Vendor" :
      "User";

    const roleColor =
      role === "super"    ? "#7c3aed" :
      role === "admin"    ? "#b0472e" :
      role === "resident" ? "#2f6f5e" :
      role === "vendor"   ? "#c8862a" :
      "#4a5670";

    wrap.innerHTML = `
      <span style="font-size:0.85rem; color:var(--ink-70); display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
        Hi, ${user?.name || "there"}
        <span style="background:${roleColor}; color:#fff; font-size:0.62rem;
                     padding:2px 8px; border-radius:999px; font-weight:600;
                     letter-spacing:0.4px; text-transform:uppercase;">
          ${roleLabel}
        </span>
      </span>
      <a href="#" id="logoutLink" style="font-size:0.82rem;">Logout</a>
    `;
    slot.appendChild(wrap);

    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (typeof logout === "function") logout();
      });
    }
  } else {
    wrap.innerHTML = `<a href="login.html" data-nav="login.html">Log in</a>`;
    slot.appendChild(wrap);
  }
}

/* ============================================================
   NAV: role-based visibility
   - Hide [data-super-only] elements unless user is a super admin
   - Hide the Admin group/dropdown for non-admins
   ============================================================ */
function applyRoleVisibility() {
  const user = (typeof getUser === "function") ? getUser() : null;
  const role = user?.role || null;

  if (role !== "super") {
    document.querySelectorAll("[data-super-only]").forEach((el) => {
      el.style.display = "none";
    });
  }

  const isAdmin = role === "admin" || role === "super";
  if (!isAdmin) {
    document.querySelectorAll(".side-rail__group").forEach((g) => {
      g.style.display = "none";
    });

    document.querySelectorAll(".nav-dropdown").forEach((dd) => {
      const trigger = dd.querySelector("a");
      const label   = trigger?.textContent?.trim() || "";
      if (label.startsWith("Admin")) dd.style.display = "none";
    });
  }
}

/* ============================================================
   DROPDOWN: sidebar group + legacy header dropdown
   ============================================================ */
function setupDropdown() {
  document.addEventListener("click", (e) => {
    // Sidebar group toggle
    const groupToggle = e.target.closest(".side-rail__group-toggle");
    if (groupToggle) {
      e.preventDefault();
      e.stopPropagation();
      const group = groupToggle.closest(".side-rail__group");
      if (group) {
        group.classList.toggle("is-open");
        groupToggle.setAttribute(
          "aria-expanded",
          group.classList.contains("is-open") ? "true" : "false"
        );
      }
      return;
    }

    // Legacy header dropdown
    const trigger = e.target.closest(".nav-dropdown > a:not(.side-rail__group-toggle)");
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const menu = trigger.nextElementSibling;
      if (menu && menu.classList.contains("dropdown-menu")) {
        menu.classList.toggle("show");
      }
      return;
    }

    // Click outside → close everything
    document.querySelectorAll(".dropdown-menu.show")
      .forEach((m) => m.classList.remove("show"));
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

  // Close when a nav link is tapped on mobile
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
   INIT — wire everything up once the DOM is ready
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  renderAuthNav();
  applyRoleVisibility();
  setupDropdown();
  setupSideRailToggle();
});