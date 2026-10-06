/* ============================================================
   admin.js — Consolidated admin panel
   Single page with hash-routed tabs:
     #overview  #approvals  #reviews  #residents
     #providers #house-numbers #categories #admins
   ============================================================ */

/* ============================================================
   CONSTANTS + STATE
   ============================================================ */
const VERIFY_QUEUE_PER_PAGE   = 20;
const REPORTS_PER_PAGE        = 20;
const VENDORS_PER_PAGE        = 20;
const RESIDENTS_PER_PAGE_MAIN = 20;   // dashboard tab
const RESIDENTS_PER_PAGE_APP  = 20;   // approved residents page
const PROVIDERS_PER_PAGE      = 20;
const REVIEWS_PER_PAGE        = 20;
const PENDING_PER_PAGE        = 10;
const HN_PER_PAGE             = 20;

const verifyQueueState    = { page: 1, limit: VERIFY_QUEUE_PER_PAGE,   total: 0, totalPages: 1 };
const reportsState        = { page: 1, limit: REPORTS_PER_PAGE,        total: 0, totalPages: 1 };
const vendorsTabState     = { page: 1, limit: VENDORS_PER_PAGE,        total: 0, totalPages: 1 };
const residentsTabState   = { page: 1, limit: RESIDENTS_PER_PAGE_MAIN, total: 0, totalPages: 1 };

const pendingState = {
  residents: { page: 1, limit: PENDING_PER_PAGE, total: 0, totalPages: 1 },
  vendors:   { page: 1, limit: PENDING_PER_PAGE, total: 0, totalPages: 1 },
};

const reviewsState = { page: 1, limit: REVIEWS_PER_PAGE, total: 0, totalPages: 1 };

const residentsState = {
  page: 1, limit: RESIDENTS_PER_PAGE_APP, total: 0, totalPages: 1,
  search: "", phase: "", courtId: "",
};
let   RES_ALL_COURTS     = [];
let   RES_FILTERED_COURTS = [];

const providersState = {
  page: 1, limit: PROVIDERS_PER_PAGE, total: 0, totalPages: 1,
  search: "", phase: "", courtId: "", verified: "",
};
let   PROV_ALL_COURTS     = [];
let   PROV_FILTERED_COURTS = [];

const hnState = {
  page: 1, limit: HN_PER_PAGE, total: 0, totalPages: 1,
  status: "unassigned", phase: "", courtId: "", q: "",
};
let   HN_ALL_COURTS      = [];
let   HN_FILTERED_COURTS = [];
let   HN_COURT_NAMES     = new Map();

const CHART_COLORS = {
  ink: "#16233f", ochre: "#c8862a", teal: "#2f6f5e", clay: "#b0472e", blue: "#4a7ba7",
};
const chartInstances = {};

/* Category page state */
let editingCategoryId = null;
let currentCategories = [];

/* Router state */
let currentPage = null;
const loadedPages = new Set();

/* ============================================================
   ROLE HELPERS
   ============================================================ */
function getRoleFromToken() {
  try {
    const token = typeof getToken === "function" ? getToken() : null;
    if (!token) return null;
    return (JSON.parse(atob(token.split(".")[1])) || {}).role || null;
  } catch { return null; }
}
function getCurrentRole() {
  try {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (u && u.role) return u.role;
  } catch { /* ignore */ }
  return getRoleFromToken();
}
function isSuperAdmin() { return getCurrentRole() === "super"; }
function isAdmin()      { const r = getCurrentRole(); return r === "admin" || r === "super"; }

/* ============================================================
   SMALL HELPERS
   ============================================================ */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "-"; }
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.floor((new Date() - new Date(iso)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) { const m = Math.floor(diff / 60);   return `${m} minute${m === 1 ? "" : "s"} ago`; }
  if (diff < 86400){ const h = Math.floor(diff / 3600); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const d = Math.floor(diff / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function paginationFooter(kind, state, startRow, endRow, total, totalPages, page, prevAttr, nextAttr) {
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= totalPages ? "disabled" : "";
  return `
    <div class="pagination"
         style="display:flex;justify-content:space-between;align-items:center;
                gap:12px;flex-wrap:wrap;margin-top:18px;padding:12px 4px;
                border-top:1px solid var(--line);">
      <div style="font-size:0.9rem;color:var(--ink-70);">
        Showing <b>${startRow}-${endRow}</b> of <b>${total}</b> ${kind}${total === 1 ? "" : "s"}
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn--ghost btn--small" ${prevAttr} ${prevDisabled}>« Prev</button>
        <span style="font-size:0.9rem;color:var(--ink-70);padding:0 4px;">
          Page <b>${page}</b> of <b>${totalPages}</b>
        </span>
        <button class="btn btn--ghost btn--small" ${nextAttr} ${nextDisabled}>Next »</button>
      </div>
    </div>
  `;
}

/* ============================================================
   ROUTER — tab switching + lazy loading
   ============================================================ */
const PAGE_LOADERS = {
  overview:       () => renderOverviewPage(),
  approvals:      () => renderApprovalsPage(),
  reviews:        () => renderReviewsPage(),
  residents:      () => renderResidentsPage(),
  providers:      () => renderProvidersPage(),
  "house-numbers":() => renderHouseNumbersPage(),
  categories:     () => renderCategoriesPage(),
  admins:         () => renderAdminsPage(),
};

function initRouter() {
  // Handle initial hash
  const initial = (location.hash || "#overview").replace("#", "") || "overview";
  showPage(initial, { replace: true });

  // Handle back/forward + manual hash changes
  window.addEventListener("hashchange", () => {
    const target = (location.hash || "#overview").replace("#", "") || "overview";
    showPage(target);
  });

  // Tab strip clicks
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  // Sidebar submenu links (they set location.hash, which triggers hashchange)
  document.querySelectorAll("[data-goto-page]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const target = el.dataset.gotoPage;
      if (target) showPage(target);
    });
  });
}

async function showPage(name, { replace = false } = {}) {
  // Fall back to overview on unknown
  if (!PAGE_LOADERS[name]) name = "overview";

  // Guard: super-only pages
  const pageEl = document.querySelector(`.admin-page[data-page="${name}"]`);
  if (pageEl && pageEl.hasAttribute("data-super-only") && !isSuperAdmin()) {
    if (typeof toast === "function") toast("Only super admins can view this page.");
    name = "overview";
  }

  // Hide all, show target
  document.querySelectorAll(".admin-page").forEach((p) => p.classList.remove("is-active"));
  document.querySelectorAll(".admin-tab").forEach((t) =>
    t.classList.toggle("is-active", t.dataset.page === name)
  );
  const targetEl = document.querySelector(`.admin-page[data-page="${name}"]`);
  if (targetEl) targetEl.classList.add("is-active");

  // Update URL hash without triggering another hashchange
  if (!replace && location.hash !== "#" + name) {
    history.pushState(null, "", "#" + name);
  } else if (replace && location.hash !== "#" + name) {
    history.replaceState(null, "", "#" + name);
  }

  currentPage = name;

  // Lazy-load the page's data on first open
  if (!loadedPages.has(name)) {
    loadedPages.add(name);
    try {
      await PAGE_LOADERS[name]();
    } catch (err) {
      console.error(`[admin] page "${name}" failed to load:`, err);
    }
  }

  // Scroll to top of content area
  document.querySelector(".side-rail__content")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   SIDEBAR: AUTH CHIP
   ============================================================ */
function renderHeaderChip() {
  const role = getCurrentRole() || "admin";
  const user = (typeof getCurrentUser === "function" ? getCurrentUser() : null) || {};

  const authSlot = document.getElementById("side-rail-auth");
  if (authSlot) {
    const name = user.fullName || user.name || "Admin";
    const roleLabel = role === "super" ? "SUPER" : "ADMIN";
    const roleColor = role === "super" ? "var(--ink)" : "var(--ochre)";

    authSlot.innerHTML = `
      <span style="font-size:0.85rem; color:var(--ink-70); display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
        Hi, ${escapeHtml(name)}
        <span style="background:${roleColor}; color:#fff; font-size:0.62rem;
                     padding:2px 8px; border-radius:999px; font-weight:600;
                     letter-spacing:0.4px; text-transform:uppercase;">
          ${roleLabel}
        </span>
      </span>
      <a href="#" id="logoutBtn" style="font-size:0.82rem; color:var(--ink-70);">Logout</a>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof logout === "function") logout();
      else window.location.href = "login.html";
    });
  }
  document.documentElement.setAttribute("data-role", role);
}

/* ============================================================
   SIDEBAR: DROPDOWN + SUPER-ONLY VISIBILITY
   ============================================================ */
function setupSidebarGroup() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".side-rail__group-toggle");
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      const group = toggle.closest(".side-rail__group");
      if (group) {
        group.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded",
          group.classList.contains("is-open") ? "true" : "false");
      }
      return;
    }
    document.querySelectorAll(".dropdown-menu.show")
      .forEach((m) => m.classList.remove("show"));
  });

  // Auto-open the Admin group
  const adminGroup = document.querySelector(".side-rail__group");
  if (adminGroup) {
    adminGroup.classList.add("is-open");
    const trigger = adminGroup.querySelector(".side-rail__group-toggle");
    if (trigger) {
      trigger.classList.add("is-active");
      trigger.setAttribute("aria-expanded", "true");
    }
  }

  // Hide super-only elements for non-supers
  if (!isSuperAdmin()) {
    document.querySelectorAll("[data-super-only]").forEach((el) => {
      el.style.display = "none";
    });
  }

  // Highlight the active sidebar submenu item based on hash
  function highlightSubmenu() {
    const hash = location.hash || "#overview";
    document.querySelectorAll(".side-rail__submenu a").forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("href") === hash);
    });
  }
  highlightSubmenu();
  window.addEventListener("hashchange", highlightSubmenu);
}

/* ============================================================
   OVERVIEW PAGE — dashboard stats + charts + alerts
   ============================================================ */
async function renderOverviewPage() {
  await renderVerifyQueue();
  await renderReports();
  await renderVendorsTab();
  await renderResidentsTab();

  const stats = await loadDashboardStats();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  renderAllCharts(stats);
}

async function loadDashboardStats() {
  try {
    const s = await Api.getAdminStats();
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? "-";
    };

    set("hero-pending",  s.headline?.pendingResidents);
    set("hero-vendors",  s.headline?.pendingVendors);
    set("hero-bookings", s.bookings?.thisMonth);

    set("tile-pending-residents",  s.headline?.pendingResidents);
    set("tile-approved-residents", s.headline?.approvedResidents);
    set("tile-pending-vendors",    s.headline?.pendingVendors);
    set("tile-approved-vendors",   s.headline?.approvedVendors);
    set("tile-residents-joined",   s.headline?.residentsJoinedThisMonth);
    set("tile-vendors-joined",     s.headline?.vendorsJoinedThisMonth);

    set("tile-bookings-open",      s.bookings?.open);
    set("tile-bookings-confirmed", s.bookings?.confirmed);
    set("tile-bookings-completed", s.bookings?.completed);
    set("tile-bookings-cancelled", s.bookings?.cancelled);
    set("tile-bookings-total",     s.bookings?.total);
    set("tile-bookings-month",     s.bookings?.thisMonth);
    set("tile-completed-month",    s.bookings?.completedThisMonth);
    set("tile-cancelled-month",    s.bookings?.cancelledThisMonth);
    set("tile-bookings-7d",        s.bookings?.last7d);
    set("tile-bookings-30d",       s.bookings?.last30d);

    renderDelta("delta-bookings-month",  s.bookings?.thisMonth,          s.bookings?.lastMonth,          false);
    renderDelta("delta-completed-month", s.bookings?.completedThisMonth, s.bookings?.completedLastMonth, false);
    renderDelta("delta-cancelled-month", s.bookings?.cancelledThisMonth, s.bookings?.cancelledLastMonth, true);

    set("tile-reviews-total", s.quality?.reviewsTotal);
    set("tile-avg-rating",    Number(s.quality?.avgRating ?? 0).toFixed(2));
    set("tile-reviews-5star", s.quality?.reviews5Star);
    set("tile-reviews-low",   s.quality?.reviewsLow);

    set("tile-vendors-active", s.providers?.active30d);
    set("tile-vendors-dead",   s.providers?.withNoBookings);
    set("tile-cats-empty",     s.providers?.categoriesWithoutVendor);
    set("tile-courts-total",   s.courts?.total);

    set("tile-distinct-bookers", s.residents?.distinctBookers);
    set("tile-repeat-bookers",   s.residents?.repeatBookers);

    renderAlertList("alert-empty-categories-body", s.emptyCategories, (c) => c.label,
      "Every category has an approved vendor.");
    renderAlertList("alert-dead-vendors-body", s.deadVendors,
      (v) => `${v.name} - ${v.phone || "no phone"}`,
      "Every approved vendor has at least one booking.");
    renderAlertList("alert-top-vendors-body", s.topVendors,
      (v) => `${v.name} - ⭐ ${Number(v.rating).toFixed(1)} (${v.reviews})`,
      "No reviews yet.");
    renderWeekday("alert-weekday-body", s.byWeekday || []);

    // Update approvals tab badge
    const badge = document.getElementById("tab-badge-approvals");
    if (badge) {
      const total = (s.headline?.pendingResidents || 0) + (s.headline?.pendingVendors || 0);
      badge.textContent = total > 0 ? total : "";
      badge.style.display = total > 0 ? "" : "none";
    }

    return s;
  } catch (err) {
    console.error("[admin] stats load failed:", err);
    return null;
  }
}

function renderDelta(elId, current, previous, lowerIsBetter = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  const diff = (current || 0) - (previous || 0);
  if (diff === 0) {
    el.textContent = "no change vs last month";
    el.className = "stat-tile__delta";
    return;
  }
  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  el.textContent = `${diff > 0 ? "+" : ""}${diff} vs last month`;
  el.className = "stat-tile__delta " + (isGood ? "is-good" : "is-bad");
}

function renderAlertList(elId, items, mapFn, emptyMsg) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!items || !items.length) {
    el.innerHTML = `<div class="alert-empty">${emptyMsg}</div>`;
    return;
  }
  el.innerHTML = `<ul class="alert-list">${items.map((it) => `<li>${mapFn(it)}</li>`).join("")}</ul>`;
}

function renderWeekday(elId, rows) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!rows.length) { el.innerHTML = `<div class="alert-empty">No bookings yet.</div>`; return; }
  const max = Math.max(...rows.map((r) => r.total), 1);
  el.innerHTML = `<ul class="weekday-list">${
    rows.map((r) => `
      <li>
        <span class="weekday-label">${r.day}</span>
        <span class="weekday-bar"><span style="width:${(r.total / max) * 100}%"></span></span>
        <span class="weekday-count">${r.total}</span>
      </li>`).join("")
  }</ul>`;
}

/* ============================================================
   CHARTS
   ============================================================ */
function destroyChart(id) {
  if (chartInstances[id]) {
    try { chartInstances[id].destroy(); } catch {}
    delete chartInstances[id];
  }
}

function renderTrendChart(trend) {
  const ctx = document.getElementById("chart-trend");
  if (!ctx) return;
  destroyChart("chart-trend");
  chartInstances["chart-trend"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: (trend || []).map((r) => r.month),
      datasets: [
        { label: "Total",     data: (trend || []).map((r) => r.total),
          borderColor: CHART_COLORS.ink,  backgroundColor: "rgba(22, 35, 63, 0.08)", tension: 0.3, fill: true },
        { label: "Completed", data: (trend || []).map((r) => r.completed),
          borderColor: CHART_COLORS.teal, backgroundColor: "rgba(47, 111, 94, 0.08)", tension: 0.3, fill: true },
        { label: "Cancelled", data: (trend || []).map((r) => r.cancelled),
          borderColor: CHART_COLORS.clay, backgroundColor: "rgba(176, 71, 46, 0.08)", tension: 0.3, fill: true },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

function renderStatusChart(b) {
  const ctx = document.getElementById("chart-status");
  if (!ctx) return;
  destroyChart("chart-status");
  const safe = b || {};
  chartInstances["chart-status"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Requested", "Confirmed", "Completed", "Cancelled"],
      datasets: [{
        data: [safe.open || 0, safe.confirmed || 0, safe.completed || 0, safe.cancelled || 0],
        backgroundColor: [CHART_COLORS.ochre, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.clay],
        borderWidth: 0,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: { legend: { position: "bottom" } } },
  });
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById("chart-category");
  if (!ctx) return;
  destroyChart("chart-category");
  const list = categories || [];
  chartInstances["chart-category"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: list.map((c) => c.label),
      datasets: [
        { label: "Approved", data: list.map((c) => c.approved), backgroundColor: CHART_COLORS.teal },
        { label: "Pending",  data: list.map((c) => c.pending),  backgroundColor: CHART_COLORS.ochre },
      ],
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

function renderWeekdayChart(byWeekday) {
  const ctx = document.getElementById("chart-weekday");
  if (!ctx) return;
  destroyChart("chart-weekday");
  const rows = byWeekday || [];
  const order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const map = Object.fromEntries(rows.map((r) => [r.day, r.total]));
  const labels = order.filter((d) => map[d] !== undefined);
  const values = labels.map((d) => map[d]);
  chartInstances["chart-weekday"] = new Chart(ctx, {
    type: "bar",
    data: { labels: labels.map((d) => d.slice(0, 3)),
      datasets: [{ label: "Bookings", data: values, backgroundColor: CHART_COLORS.ink, borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

function renderAllCharts(s) {
  if (!s) return;
  renderTrendChart(s.trend || []);
  renderStatusChart(s.bookings || { open: 0, confirmed: 0, completed: 0, cancelled: 0 });
  renderCategoryChart(s.categories || []);
  renderWeekdayChart(s.byWeekday || []);
}

async function refreshDashboard() {
  const stats = await loadDashboardStats();
  if (stats) {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    renderAllCharts(stats);
  }
}

/* ============================================================
   OVERVIEW: WORK QUEUE (verify / vendors / residents / reports)
   ============================================================ */
function setupOverviewTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    // Only wire tabs inside the overview page
    if (!btn.closest('[data-page="overview"]')) return;
    btn.addEventListener("click", async () => {
      document.querySelectorAll('[data-page="overview"] .tab-btn').forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll('[data-page="overview"] .tab-panel').forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.add("is-active");

      if (btn.dataset.tab === "vendors"   && !panel.dataset.loaded) { panel.dataset.loaded = "1"; await renderVendorsTab(); }
      if (btn.dataset.tab === "residents" && !panel.dataset.loaded) { panel.dataset.loaded = "1"; await renderResidentsTab(); }
    });
  });

  document.querySelectorAll("[data-goto-tab]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const btn = document.querySelector(`.tab-btn[data-tab="${a.dataset.gotoTab}"]`);
      if (btn) btn.click();
    });
  });
}

async function renderVerifyQueue() {
  const el = document.getElementById("tab-verify");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading providers…</div>`;

  let result;
  try {
    result = await Api.getProviders({
      verified: "false",
      page: verifyQueueState.page,
      limit: verifyQueueState.limit,
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load providers: ${err.message}</div>`;
    return;
  }

  const pending = Array.isArray(result) ? result : (result.data || []);
  verifyQueueState.total      = result.total      ?? pending.length;
  verifyQueueState.page       = result.page       ?? 1;
  verifyQueueState.limit      = result.limit      ?? VERIFY_QUEUE_PER_PAGE;
  verifyQueueState.totalPages = result.totalPages ?? 1;

  const countEl = document.getElementById("count-verify");
  if (countEl) countEl.textContent = verifyQueueState.total ? `(${verifyQueueState.total})` : "";

  if (!pending.length) {
    el.innerHTML = `<div class="empty-state">No listings waiting for review.</div>`;
    return;
  }

  const canDelete = isSuperAdmin();

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Phone</th><th>Actions</th></tr></thead>
        <tbody>
          ${pending.map((p) => `
            <tr>
              <td>${escapeHtml(p.name)}</td>
              <td>${categoryLabel(p.category)}</td>
              <td>${escapeHtml(p.phone || "-")}</td>
              <td class="row-actions">
                <button class="btn btn--accent btn--small" data-approve="${p.id}">Approve</button>
                ${canDelete
                  ? `<button class="btn btn--danger btn--small" data-reject="${p.id}"
                             data-name="${escapeAttr(p.name)}">Reject</button>`
                  : `<button class="btn btn--danger btn--small" disabled
                             style="opacity:0.5;cursor:not-allowed;">Reject</button>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${verifyQueuePaginationHtml()}
  `;
  wireVerifyQueuePagination();

  el.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await Api.updateProvider(btn.dataset.approve, { verified: true });
        toast("Provider approved.");
        if (el.querySelectorAll("tbody tr").length === 1 && verifyQueueState.page > 1) verifyQueueState.page--;
        await renderVerifyQueue();
        await refreshDashboard();
      } catch (e) { toast(e.message || "Could not approve."); btn.disabled = false; }
    })
  );

  el.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const name = btn.dataset.name;
      if (!confirm(`Permanently delete pending vendor "${name}"?\n\nThis also removes reviews, reports and bookings.\nThis cannot be undone.`)) return;
      btn.disabled = true;
      btn.textContent = "Deleting…";
      try {
        await Api.removeProvider(btn.dataset.reject);
        toast("Listing rejected and removed.");
        if (el.querySelectorAll("tbody tr").length === 1 && verifyQueueState.page > 1) verifyQueueState.page--;
        await renderVerifyQueue();
        await refreshDashboard();
      } catch (e) { toast(e.message || "Could not reject."); btn.disabled = false; btn.textContent = "Reject"; }
    })
  );
}

function verifyQueuePaginationHtml() {
  const { page, limit, total, totalPages } = verifyQueueState;
  const startRow = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const endRow   = Math.min(page * limit, total);
  return paginationFooter("pending listing", verifyQueueState, startRow, endRow, total, totalPages, page,
    `data-verify-page="prev"`, `data-verify-page="next"`);
}

function wireVerifyQueuePagination() {
  const el = document.getElementById("tab-verify");
  if (!el) return;
  el.querySelectorAll("[data-verify-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.verifyPage;
      if (dir === "prev" && verifyQueueState.page > 1) verifyQueueState.page--;
      else if (dir === "next" && verifyQueueState.page < verifyQueueState.totalPages) verifyQueueState.page++;
      else return;
      await renderVerifyQueue();
    });
  });
}

/* ---- Overview: All vendors tab ---- */
async function renderVendorsTab() {
  const el = document.getElementById("tab-vendors");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading vendors…</div>`;

  let result;
  try {
    result = await Api.getProviders({ page: vendorsTabState.page, limit: vendorsTabState.limit });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load vendors: ${err.message}</div>`;
    return;
  }

  const rows = Array.isArray(result) ? result : (result.data || []);
  vendorsTabState.total      = result.total      ?? rows.length;
  vendorsTabState.page       = result.page       ?? 1;
  vendorsTabState.totalPages = result.totalPages ?? 1;

  const countEl = document.getElementById("count-vendors");
  if (countEl) countEl.textContent = vendorsTabState.total ? `(${vendorsTabState.total})` : "";

  if (!rows.length) {
    el.innerHTML = `<div class="empty-state">No vendors on the platform.</div>`;
    return;
  }

  const canDelete = isSuperAdmin();

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Name</th><th>Category</th><th>Phone</th><th>Status</th><th>Rating</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${rows.map((p) => `
            <tr>
              <td><a href="/provider.html?id=${p.id}" style="font-weight:600;">${escapeHtml(p.name)}</a></td>
              <td>${escapeHtml(categoryLabel(p.category))}</td>
              <td>${escapeHtml(p.phone || "-")}</td>
              <td>${p.verified
                ? `<span class="badge badge--verified">Approved</span>`
                : `<span class="badge badge--pending">Pending</span>`}</td>
              <td>${p.rating ? Number(p.rating).toFixed(1) + " ★" : "—"}</td>
              <td class="row-actions">
                ${!p.verified
                  ? `<button class="btn btn--accent btn--small" data-vendor-approve="${p.id}">Approve</button>`
                  : `<button class="btn btn--ghost btn--small" data-vendor-unverify="${p.id}">Unverify</button>`}
                ${canDelete
                  ? `<button class="btn btn--danger btn--small" data-vendor-delete="${p.id}"
                             data-name="${escapeAttr(p.name)}">Delete</button>`
                  : `<button class="btn btn--danger btn--small" disabled style="opacity:0.5;">Delete</button>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${paginationFooter("vendor", vendorsTabState,
      (vendorsTabState.page - 1) * vendorsTabState.limit + 1,
      Math.min(vendorsTabState.page * vendorsTabState.limit, vendorsTabState.total),
      vendorsTabState.total, vendorsTabState.totalPages, vendorsTabState.page,
      `data-vendors-page="prev"`, `data-vendors-page="next"`)}
  `;
  wireVendorsTab();
}

function wireVendorsTab() {
  const el = document.getElementById("tab-vendors");
  if (!el) return;

  el.querySelectorAll("[data-vendor-approve]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await Api.updateProvider(b.dataset.vendorApprove, { verified: true });
        toast("Vendor approved.");
        await renderVendorsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; }
    })
  );
  el.querySelectorAll("[data-vendor-unverify]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await Api.updateProvider(b.dataset.vendorUnverify, { verified: false });
        toast("Vendor unverified.");
        await renderVendorsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; }
    })
  );
  el.querySelectorAll("[data-vendor-delete]").forEach((b) =>
    b.addEventListener("click", async () => {
      const id = b.dataset.vendorDelete;
      const name = b.dataset.name;
      if (!confirm(`Permanently delete vendor "${name}"?`)) return;
      b.disabled = true; b.textContent = "Deleting…";
      try {
        await Api.removeProvider(id);
        toast(`Vendor "${name}" deleted.`);
        await renderVendorsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; b.textContent = "Delete"; }
    })
  );
  el.querySelectorAll("[data-vendors-page]").forEach((b) => {
    b.addEventListener("click", async () => {
      const dir = b.dataset.vendorsPage;
      if (dir === "prev" && vendorsTabState.page > 1) vendorsTabState.page--;
      if (dir === "next" && vendorsTabState.page < vendorsTabState.totalPages) vendorsTabState.page++;
      await renderVendorsTab();
    });
  });
}

/* ---- Overview: All residents tab (very brief list) ---- */
async function renderResidentsTab() {
  const el = document.getElementById("tab-residents");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading residents…</div>`;

  let result;
  try {
    result = await Api.getResidents({ page: residentsTabState.page, limit: residentsTabState.limit });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load residents: ${err.message}</div>`;
    return;
  }

  const rows = Array.isArray(result) ? result : (result.data || []);
  residentsTabState.total      = result.total      ?? rows.length;
  residentsTabState.page       = result.page       ?? 1;
  residentsTabState.totalPages = result.totalPages ?? 1;

  const countEl = document.getElementById("count-residents");
  if (countEl) countEl.textContent = residentsTabState.total ? `(${residentsTabState.total})` : "";

  if (!rows.length) { el.innerHTML = `<div class="empty-state">No residents yet.</div>`; return; }

  const canDelete = isSuperAdmin();

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Phone</th><th>Court</th>
            <th>Phase</th><th>House</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td style="font-weight:600;">${escapeHtml(r.fullName)}</td>
              <td>${escapeHtml(r.phone || "-")}</td>
              <td>${escapeHtml(r.courtName || "-")}</td>
              <td>${r.phase != null ? "Phase " + r.phase : "—"}</td>
              <td>${escapeHtml(r.houseNumber || "—")}</td>
              <td>${r.verified
                ? `<span class="badge badge--verified">Verified</span>`
                : `<span class="badge badge--pending">Pending</span>`}</td>
              <td class="row-actions">
                ${!r.verified
                  ? `<button class="btn btn--accent btn--small" data-res-approve="${r.id}">Approve</button>`
                  : `<button class="btn btn--ghost btn--small" data-res-unverify="${r.id}">Unverify</button>`}
                ${canDelete
                  ? `<button class="btn btn--danger btn--small" data-res-delete="${r.id}"
                             data-name="${escapeAttr(r.fullName)}">Delete</button>`
                  : ""}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${paginationFooter("resident", residentsTabState,
      (residentsTabState.page - 1) * residentsTabState.limit + 1,
      Math.min(residentsTabState.page * residentsTabState.limit, residentsTabState.total),
      residentsTabState.total, residentsTabState.totalPages, residentsTabState.page,
      `data-residents-page="prev"`, `data-residents-page="next"`)}
  `;
  wireResidentsTab();
}

function wireResidentsTab() {
  const el = document.getElementById("tab-residents");
  if (!el) return;
  el.querySelectorAll("[data-res-approve]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await Api.updateResident(b.dataset.resApprove, { verified: true });
        toast("Resident verified.");
        await renderResidentsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; }
    })
  );
  el.querySelectorAll("[data-res-unverify]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await Api.updateResident(b.dataset.resUnverify, { verified: false });
        toast("Resident unverified.");
        await renderResidentsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; }
    })
  );
  el.querySelectorAll("[data-res-delete]").forEach((b) =>
    b.addEventListener("click", async () => {
      const id = b.dataset.resDelete;
      const name = b.dataset.name;
      if (!confirm(`Permanently delete resident "${name}"?`)) return;
      b.disabled = true; b.textContent = "Deleting…";
      try {
        await Api.removeResident(id);
        toast(`Resident "${name}" deleted.`);
        await renderResidentsTab();
        await refreshDashboard();
      } catch (e) { toast(e.message); b.disabled = false; b.textContent = "Delete"; }
    })
  );
  el.querySelectorAll("[data-residents-page]").forEach((b) => {
    b.addEventListener("click", async () => {
      const dir = b.dataset.residentsPage;
      if (dir === "prev" && residentsTabState.page > 1) residentsTabState.page--;
      if (dir === "next" && residentsTabState.page < residentsTabState.totalPages) residentsTabState.page++;
      await renderResidentsTab();
    });
  });
}

/* ---- Overview: Reports tab ---- */
async function renderReports() {
  const el = document.getElementById("tab-reports");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading reports…</div>`;

  let result;
  try {
    result = await Api.getReports({ page: reportsState.page, limit: reportsState.limit });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load reports: ${err.message}</div>`;
    return;
  }

  const reports = Array.isArray(result) ? result : (result.data || []);
  reportsState.total      = result.total      ?? reports.length;
  reportsState.page       = result.page       ?? 1;
  reportsState.totalPages = result.totalPages ?? 1;

  const openCount = result.openCount ?? reports.filter((r) => r.status === "open").length;
  const countEl = document.getElementById("count-reports");
  if (countEl) countEl.textContent = openCount ? `(${openCount})` : "";

  if (!reports.length) { el.innerHTML = `<div class="empty-state">No reports.</div>`; return; }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Provider</th><th>Reason</th><th>Details</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${reports.map((r) => `
            <tr>
              <td>${escapeHtml(r.providerName)}</td>
              <td>${escapeHtml(r.reason)}</td>
              <td style="max-width:260px;">${escapeHtml(r.details)}</td>
              <td>${statusBadge(r.status === "open" ? "requested" : "completed")}</td>
              <td>${r.status === "open"
                ? `<button class="btn btn--ghost btn--small" data-resolve="${r.id}">Mark reviewed</button>`
                : `<span class="meta">Reviewed</span>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${paginationFooter("report", reportsState,
      (reportsState.page - 1) * reportsState.limit + 1,
      Math.min(reportsState.page * reportsState.limit, reportsState.total),
      reportsState.total, reportsState.totalPages, reportsState.page,
      `data-reports-page="prev"`, `data-reports-page="next"`)}
  `;
  wireReportsPagination();

  el.querySelectorAll("[data-resolve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await Api.updateReport(btn.dataset.resolve, { status: "reviewed" });
      toast("Report marked as reviewed.");
      await renderReports();
      await refreshDashboard();
    })
  );
}

function wireReportsPagination() {
  const el = document.getElementById("tab-reports");
  if (!el) return;
  el.querySelectorAll("[data-reports-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.reportsPage;
      if (dir === "prev" && reportsState.page > 1) reportsState.page--;
      else if (dir === "next" && reportsState.page < reportsState.totalPages) reportsState.page++;
      else return;
      await renderReports();
    });
  });
}

/* ============================================================
   APPROVALS PAGE (pending residents + pending vendors)
   ============================================================ */
async function renderApprovalsPage() {
  setupApprovalsTabs();
  await Promise.all([loadPendingResidents(), loadPendingVendors()]);
}

function setupApprovalsTabs() {
  document.querySelectorAll("#pendingTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#pendingTabs .tab-btn").forEach((b) =>
        b.classList.toggle("is-active", b === btn));
      document.querySelectorAll('[data-page="approvals"] .tab-panel').forEach((p) =>
        p.classList.toggle("is-active", p.id === `tab-${btn.dataset.tab}`));
    });
  });
}

function pendingCard(item, kind) {
  const isResident = kind === "residents";
  const contact = isResident
    ? `<div class="meta"><i class="fas fa-phone"></i> ${item.phone || "-"}</div>
       <div class="meta"><i class="fas fa-envelope"></i> ${item.email || "-"}</div>
       <div class="meta"><i class="fas fa-map-marker-alt"></i> Phase ${item.phase} · ${item.courtName}</div>`
    : `<div class="meta"><i class="fas fa-tag"></i> ${categoryLabel(item.category)}</div>
       <div class="meta"><i class="fas fa-phone"></i> ${item.phone || "-"}</div>
       <div class="meta"><i class="fas fa-map-marker-alt"></i> ${item.zone || "-"}</div>`;
  const label = isResident ? item.fullName : item.name;

  return `
    <div class="pending-card" data-id="${item.id}">
      <div>
        <div class="name">${escapeHtml(label)}</div>
        ${contact}
        <div class="when"><i class="fas fa-clock"></i> Registered ${timeAgo(item.createdAt)}</div>
      </div>
      <div class="actions">
        <button class="btn btn--accent btn--small" data-approve="${item.id}" data-kind="${kind}">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn--danger btn--small" data-reject="${item.id}" data-kind="${kind}"
                data-name="${escapeAttr(label)}">
          <i class="fas fa-times"></i> Reject
        </button>
      </div>
    </div>
  `;
}

async function loadPendingResidents() {
  const el = document.getElementById("residents-list");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading…</div>`;

  let result;
  try {
    result = await Api.getResidents({
      verified: "false",
      page:  pendingState.residents.page,
      limit: pendingState.residents.limit,
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${err.message}</div>`;
    return;
  }

  const list = Array.isArray(result) ? result : (result.data || []);
  pendingState.residents.total      = result.total      ?? list.length;
  pendingState.residents.page       = result.page       ?? 1;
  pendingState.residents.totalPages = result.totalPages ?? 1;

  const countEl = document.getElementById("count-residents-pending");
  if (countEl) countEl.textContent = pendingState.residents.total ? `(${pendingState.residents.total})` : "";

  if (!list.length) { el.innerHTML = `<div class="empty-state">No pending residents. 🎉</div>`; return; }

  el.innerHTML = list.map((r) => pendingCard(r, "residents")).join("") +
    (pendingState.residents.totalPages > 1
      ? paginationFooter("pending resident", pendingState.residents,
          (pendingState.residents.page - 1) * pendingState.residents.limit + 1,
          Math.min(pendingState.residents.page * pendingState.residents.limit, pendingState.residents.total),
          pendingState.residents.total, pendingState.residents.totalPages, pendingState.residents.page,
          `data-pending="residents:prev"`, `data-pending="residents:next"`)
      : "");

  el.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => approvePending(b.dataset.approve, b.dataset.kind))
  );
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", () => rejectPending(b.dataset.reject, b.dataset.kind, b.dataset.name))
  );
  el.querySelectorAll("[data-pending]").forEach((b) =>
    b.addEventListener("click", () => {
      const [kind, dir] = b.dataset.pending.split(":");
      const st = pendingState[kind];
      if (dir === "prev" && st.page > 1) st.page--;
      if (dir === "next" && st.page < st.totalPages) st.page++;
      kind === "residents" ? loadPendingResidents() : loadPendingVendors();
    })
  );
}

async function loadPendingVendors() {
  const el = document.getElementById("vendors-list");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading…</div>`;

  let result;
  try {
    result = await Api.getProviders({
      verified: "false",
      page:  pendingState.vendors.page,
      limit: pendingState.vendors.limit,
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${err.message}</div>`;
    return;
  }

  const list = Array.isArray(result) ? result : (result.data || []);
  pendingState.vendors.total      = result.total      ?? list.length;
  pendingState.vendors.page       = result.page       ?? 1;
  pendingState.vendors.totalPages = result.totalPages ?? 1;

  const countEl = document.getElementById("count-vendors-pending");
  if (countEl) countEl.textContent = pendingState.vendors.total ? `(${pendingState.vendors.total})` : "";

  if (!list.length) { el.innerHTML = `<div class="empty-state">No pending vendors. 🎉</div>`; return; }

  el.innerHTML = list.map((v) => pendingCard(v, "vendors")).join("") +
    (pendingState.vendors.totalPages > 1
      ? paginationFooter("pending vendor", pendingState.vendors,
          (pendingState.vendors.page - 1) * pendingState.vendors.limit + 1,
          Math.min(pendingState.vendors.page * pendingState.vendors.limit, pendingState.vendors.total),
          pendingState.vendors.total, pendingState.vendors.totalPages, pendingState.vendors.page,
          `data-pending="vendors:prev"`, `data-pending="vendors:next"`)
      : "");

  el.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => approvePending(b.dataset.approve, b.dataset.kind))
  );
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", () => rejectPending(b.dataset.reject, b.dataset.kind, b.dataset.name))
  );
  el.querySelectorAll("[data-pending]").forEach((b) =>
    b.addEventListener("click", () => {
      const [kind, dir] = b.dataset.pending.split(":");
      const st = pendingState[kind];
      if (dir === "prev" && st.page > 1) st.page--;
      if (dir === "next" && st.page < st.totalPages) st.page++;
      kind === "residents" ? loadPendingResidents() : loadPendingVendors();
    })
  );
}

async function approvePending(id, kind) {
  const label = kind === "residents" ? "resident" : "vendor";
  if (!confirm(`Approve this ${label}?`)) return;

  try {
    if (kind === "residents") {
      await Api.updateResident(id, { verified: true });
      toast("✅ Resident approved.");
      if (pendingState.residents.page > 1 &&
          document.querySelectorAll("#residents-list .pending-card").length === 1) {
        pendingState.residents.page--;
      }
      await loadPendingResidents();
    } else {
      await Api.updateProvider(id, { verified: true });
      toast("✅ Vendor approved.");
      if (pendingState.vendors.page > 1 &&
          document.querySelectorAll("#vendors-list .pending-card").length === 1) {
        pendingState.vendors.page--;
      }
      await loadPendingVendors();
    }
    await refreshDashboard();
  } catch (err) {
    toast(err.message || "Approval failed.");
  }
}

async function rejectPending(id, kind, label) {
  if (!confirm(`Reject ${label}? This will delete their application.`)) return;
  try {
    if (kind === "residents") {
      await Api.removeResident(id);
      toast("Resident application rejected.");
      if (pendingState.residents.page > 1 &&
          document.querySelectorAll("#residents-list .pending-card").length === 1) {
        pendingState.residents.page--;
      }
      await loadPendingResidents();
    } else {
      await Api.removeProvider(id);
      toast("Vendor application rejected.");
      if (pendingState.vendors.page > 1 &&
          document.querySelectorAll("#vendors-list .pending-card").length === 1) {
        pendingState.vendors.page--;
      }
      await loadPendingVendors();
    }
    await refreshDashboard();
  } catch (err) {
    toast(err.message || "Rejection failed.");
  }
}

/* ============================================================
   REVIEWS PAGE
   ============================================================ */
async function renderReviewsPage() {
  await loadReviews();
}

async function loadReviews() {
  const listEl = document.getElementById("reviews-list");
  if (!listEl) return;
  listEl.innerHTML = `<div class="empty-state">Loading reviews…</div>`;

  try {
    const result = await Api.getAllReviews({ page: reviewsState.page, limit: reviewsState.limit });
    const reviews = Array.isArray(result) ? result : (result.data || []);
    reviewsState.total      = result.total      ?? reviews.length;
    reviewsState.page       = result.page       ?? 1;
    reviewsState.limit      = result.limit      ?? REVIEWS_PER_PAGE;
    reviewsState.totalPages = result.totalPages ?? 1;

    if (!reviews.length) {
      listEl.innerHTML = `<div class="empty-state">No reviews yet. 🎉</div>`;
      return;
    }

    listEl.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Provider</th><th>Resident</th><th>Rating</th><th>Review</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>${reviews.map(reviewRow).join("")}</tbody>
        </table>
      </div>
      ${reviewsPaginationHtml()}
    `;
    wireReviewActions();
    wireReviewsPagination();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load reviews: ${err.message}</div>`;
  }
}

function reviewRow(r) {
  const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  const dateStr = formatDate(r.date);
  const status = r.status || "pending";
  const statusBadge = status === "reviewed"
    ? `<span class="badge" style="background:#27ae60;color:#fff;padding:4px 8px;border-radius:4px;">Reviewed</span>`
    : `<span class="badge" style="background:#f39c12;color:#fff;padding:4px 8px;border-radius:4px;">Pending</span>`;
  const reviewBtn = status === "pending"
    ? `<button class="btn btn--accent btn--small" data-review="${r.id}">Mark reviewed</button>`
    : `<span class="meta" style="color:var(--ink-40);">-</span>`;
  return `
    <tr>
      <td>${dateStr}</td>
      <td><strong>${escapeHtml(r.providerName || "Unknown Vendor")}</strong></td>
      <td>${escapeHtml(r.author || "Anonymous")}</td>
      <td style="color:#d4af37;font-size:1.2rem;">${stars}</td>
      <td style="max-width:300px;">"${escapeHtml(r.text)}"</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${reviewBtn}
          <button class="btn btn--danger btn--small" data-delete-review="${r.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function reviewsPaginationHtml() {
  const { page, limit, total, totalPages } = reviewsState;
  return paginationFooter("review", reviewsState,
    (page - 1) * limit + 1, Math.min(page * limit, total),
    total, totalPages, page,
    `data-review-page="prev"`, `data-review-page="next"`);
}

function wireReviewActions() {
  const el = document.getElementById("reviews-list");
  if (!el) return;
  el.querySelectorAll("[data-delete-review]").forEach((btn) =>
    btn.addEventListener("click", () => deleteReview(btn.dataset.deleteReview))
  );
  el.querySelectorAll("[data-review]").forEach((btn) =>
    btn.addEventListener("click", () => markReviewed(btn.dataset.review))
  );
}

function wireReviewsPagination() {
  const el = document.getElementById("reviews-list");
  if (!el) return;
  el.querySelectorAll("[data-review-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.reviewPage;
      if (dir === "prev" && reviewsState.page > 1) reviewsState.page--;
      else if (dir === "next" && reviewsState.page < reviewsState.totalPages) reviewsState.page++;
      else return;
      await loadReviews();
    });
  });
}

async function markReviewed(id) {
  try {
    await Api.updateReview(id, { status: "reviewed" });
    toast("Review marked as reviewed.");
    await loadReviews();
  } catch (err) { toast(err.message || "Could not update."); }
}

async function deleteReview(id) {
  if (!confirm("Delete this review? This cannot be undone.")) return;
  try {
    await Api.deleteReview(id);
    toast("Review deleted.");
    const rows = document.querySelectorAll("#reviews-list tbody tr").length;
    if (rows === 1 && reviewsState.page > 1) reviewsState.page--;
    await loadReviews();
  } catch (err) { toast("Could not delete review."); }
}

/* ============================================================
   APPROVED RESIDENTS PAGE (with filters + export)
   ============================================================ */
async function renderResidentsPage() {
  await setupResidentsPageFilters();
  setupResidentsPageCourtPicker();
  setupResidentsPageFilterForm();
  setupResidentsPageExportButtons();
  await renderApprovedResidentsList();
}

async function setupResidentsPageFilters() {
  const phaseSel = document.getElementById("filter-phase-res");
  if (!phaseSel) return;
  try {
    RES_ALL_COURTS = await Api.getCourts();
  } catch (err) {
    phaseSel.innerHTML = `<option value="">Failed to load</option>`;
    return;
  }
  const phases = [...new Set(RES_ALL_COURTS.map((c) => String(c.phase)))].filter(Boolean).sort();
  phaseSel.innerHTML = `<option value="">All phases</option>` +
    phases.map((p) => `<option value="${p}">Phase ${p}</option>`).join("");
  phaseSel.disabled = false;

  RES_FILTERED_COURTS = RES_ALL_COURTS.slice();
  enableResidentsCourtSearch(true);
  renderResidentsCourtList("");

  phaseSel.addEventListener("change", () => {
    const phase = phaseSel.value;
    residentsState.phase = phase;
    residentsState.courtId = "";
    residentsState.page = 1;
    RES_FILTERED_COURTS = phase
      ? RES_ALL_COURTS.filter((c) => String(c.phase) === String(phase))
      : RES_ALL_COURTS.slice();
    clearResidentsCourtSelection();
    renderResidentsCourtList("");
  });
}

function enableResidentsCourtSearch(enabled) {
  const el = document.getElementById("filter-court-search-res");
  if (!el) return;
  el.disabled = !enabled;
  el.placeholder = enabled ? "All courts - type to search…" : "Select phase first…";
}

function clearResidentsCourtSelection() {
  const s = document.getElementById("filter-court-search-res");
  const h = document.getElementById("filter-court-res");
  const l = document.getElementById("filter-court-list-res");
  if (s) s.value = "";
  if (h) h.value = "";
  if (l) l.style.display = "none";
  residentsState.courtId = "";
}

function renderResidentsCourtList(query) {
  const listEl = document.getElementById("filter-court-list-res");
  if (!listEl) return;
  const q = (query || "").toLowerCase().trim();
  const options = [{ id: "", name: "All courts", isAll: true },
    ...RES_FILTERED_COURTS.filter((c) => !q || c.name.toLowerCase().includes(q))];
  listEl.innerHTML = "";
  options.forEach((c) => {
    const row = document.createElement("div");
    row.textContent = c.name;
    row.style.cssText = "padding:10px 12px;cursor:pointer;font-size:0.95rem;border-bottom:1px solid var(--line);";
    if (c.isAll) { row.style.fontWeight = "600"; row.style.color = "var(--ink-70)"; }
    row.addEventListener("mouseenter", () => (row.style.background = "var(--paper-dim)"));
    row.addEventListener("mouseleave", () => (row.style.background = ""));
    row.addEventListener("click", () => selectResidentsCourt(c));
    listEl.appendChild(row);
  });
  listEl.style.display = "block";
}

function selectResidentsCourt(court) {
  const isAll = court.isAll === true || !court.id;
  residentsState.courtId = isAll ? "" : String(court.id);
  const s = document.getElementById("filter-court-search-res");
  const h = document.getElementById("filter-court-res");
  const l = document.getElementById("filter-court-list-res");
  if (s) s.value = isAll ? "" : court.name;
  if (h) h.value = residentsState.courtId;
  if (l) l.style.display = "none";
}

function setupResidentsPageCourtPicker() {
  const s = document.getElementById("filter-court-search-res");
  const l = document.getElementById("filter-court-list-res");
  if (!s || !l) return;
  s.addEventListener("focus", () => { if (!s.disabled && RES_FILTERED_COURTS.length) renderResidentsCourtList(s.value); });
  s.addEventListener("input", () => {
    residentsState.courtId = "";
    const h = document.getElementById("filter-court-res");
    if (h) h.value = "";
    renderResidentsCourtList(s.value);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#filter-court-search-res") && !e.target.closest("#filter-court-list-res")) {
      l.style.display = "none";
    }
  });
}

async function renderApprovedResidentsList() {
  const el = document.getElementById("residents-list-approved");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading approved residents…</div>`;

  let result;
  try {
    result = await Api.getResidents({
      verified: "true",
      q:        residentsState.search  || undefined,
      phase:    residentsState.phase   || undefined,
      courtId:  residentsState.courtId || undefined,
      page:     residentsState.page,
      limit:    residentsState.limit,
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${err.message}</div>`;
    return;
  }

  const residents = Array.isArray(result) ? result : (result.data || []);
  residentsState.total      = result.total      ?? residents.length;
  residentsState.page       = result.page       ?? 1;
  residentsState.limit      = result.limit      ?? RESIDENTS_PER_PAGE_APP;
  residentsState.totalPages = result.totalPages ?? 1;

  if (!residents.length) {
    el.innerHTML = `<div class="empty-state">No approved residents match your filters.</div>`;
    const pager = document.getElementById("residents-pagination-approved");
    if (pager) pager.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Full name</th><th>ID number</th>
            <th>Phone</th><th>Phase</th><th>Court</th>
            <th>Role</th><th>Approved on</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${residents.map((r) => `
            <tr>
              <td>AR-${String(r.id).padStart(3, "0")}</td>
              <td>${escapeHtml(r.fullName || r.full_name || "-")}</td>
              <td>${escapeHtml(r.idNumber || r.id_number || "-")}</td>
              <td>${escapeHtml(r.phone || "-")}</td>
              <td>${r.phase ? "Phase " + r.phase : "-"}</td>
              <td>${escapeHtml(r.courtName || (r.court && r.court.name) || "-")}</td>
              <td>${escapeHtml(r.role || "Resident")}</td>
              <td>${formatDate(r.approvedAt || r.approved_at || r.createdAt)}</td>
              <td><span class="badge badge--ok">Approved</span></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  renderApprovedResidentsPagination();
  wireApprovedResidentsPagination();
}

function renderApprovedResidentsPagination() {
  const el = document.getElementById("residents-pagination-approved");
  if (!el) return;
  const { page, limit, total, totalPages } = residentsState;
  el.innerHTML = paginationFooter("resident", residentsState,
    total === 0 ? 0 : ((page - 1) * limit) + 1,
    Math.min(page * limit, total),
    total, totalPages, page,
    `data-res-app-page="prev"`, `data-res-app-page="next"`);
}

function wireApprovedResidentsPagination() {
  document.querySelectorAll("[data-res-app-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.resAppPage;
      if (dir === "prev" && residentsState.page > 1) residentsState.page--;
      else if (dir === "next" && residentsState.page < residentsState.totalPages) residentsState.page++;
      else return;
      await renderApprovedResidentsList();
    });
  });
}

function setupResidentsPageFilterForm() {
  const form = document.getElementById("residents-filter");
  const clear = document.getElementById("filter-clear-res");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    residentsState.search = document.getElementById("filter-search-res")?.value.trim() || "";
    residentsState.page   = 1;
    renderApprovedResidentsList();
  });
  clear?.addEventListener("click", () => {
    const phaseSel = document.getElementById("filter-phase-res");
    const searchEl = document.getElementById("filter-search-res");
    if (searchEl) searchEl.value = "";
    if (phaseSel) phaseSel.value = "";
    RES_FILTERED_COURTS = RES_ALL_COURTS.slice();
    clearResidentsCourtSelection();
    renderResidentsCourtList("");
    residentsState.search = ""; residentsState.phase = ""; residentsState.courtId = ""; residentsState.page = 1;
    renderApprovedResidentsList();
  });
}

async function downloadResidentsReport(kind) {
  const btnId = kind === "xlsx" ? "btn-excel-residents" : "btn-pdf-residents";
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "⏳ Preparing…";
  try {
    const blob = await Api.downloadResidentsReport(kind, {
      q:       residentsState.search  || undefined,
      phase:   residentsState.phase   || undefined,
      courtId: residentsState.courtId || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athi-soko-approved-residents-${new Date().toISOString().slice(0, 10)}.${kind}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast(`Residents report downloaded (${kind.toUpperCase()}).`);
  } catch (err) {
    toast(`Could not download ${kind.toUpperCase()}.`);
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
}

function setupResidentsPageExportButtons() {
  document.getElementById("btn-excel-residents")?.addEventListener("click", () => downloadResidentsReport("xlsx"));
  document.getElementById("btn-pdf-residents")?.addEventListener("click",   () => downloadResidentsReport("pdf"));
}

/* ============================================================
   PROVIDERS PAGE (all vendors with filters + export)
   ============================================================ */
async function renderProvidersPage() {
  await setupProvidersPageFilters();
  setupProvidersPageCourtPicker();
  setupProvidersPageFilterForm();
  setupProvidersPageExportButtons();
  await renderProvidersList();
}

async function setupProvidersPageFilters() {
  const phaseSel = document.getElementById("filter-phase-prov");
  if (!phaseSel) return;
  try {
    PROV_ALL_COURTS = await Api.getCourts();
  } catch (err) {
    phaseSel.innerHTML = `<option value="">Failed to load</option>`;
    return;
  }
  const phases = [...new Set(PROV_ALL_COURTS.map((c) => String(c.phase)))].filter(Boolean).sort();
  phaseSel.innerHTML = `<option value="">All phases</option>` +
    phases.map((p) => `<option value="${p}">Phase ${p}</option>`).join("");
  phaseSel.disabled = false;

  PROV_FILTERED_COURTS = PROV_ALL_COURTS.slice();
  enableProvidersCourtSearch(true);
  renderProvidersCourtList("");

  phaseSel.addEventListener("change", () => {
    const phase = phaseSel.value;
    providersState.phase = phase;
    providersState.courtId = "";
    providersState.page = 1;
    PROV_FILTERED_COURTS = phase
      ? PROV_ALL_COURTS.filter((c) => String(c.phase) === String(phase))
      : PROV_ALL_COURTS.slice();
    clearProvidersCourtSelection();
    renderProvidersCourtList("");
  });
}

function enableProvidersCourtSearch(enabled) {
  const el = document.getElementById("filter-court-search-prov");
  if (!el) return;
  el.disabled = !enabled;
  el.placeholder = enabled ? "All courts - type to search…" : "Select phase first…";
}

function clearProvidersCourtSelection() {
  const s = document.getElementById("filter-court-search-prov");
  const h = document.getElementById("filter-court-prov");
  const l = document.getElementById("filter-court-list-prov");
  if (s) s.value = "";
  if (h) h.value = "";
  if (l) l.style.display = "none";
  providersState.courtId = "";
}

function renderProvidersCourtList(query) {
  const listEl = document.getElementById("filter-court-list-prov");
  if (!listEl) return;
  const q = (query || "").toLowerCase().trim();
  const options = [{ id: "", name: "All courts", isAll: true },
    ...PROV_FILTERED_COURTS.filter((c) => !q || c.name.toLowerCase().includes(q))];
  listEl.innerHTML = "";
  options.forEach((c) => {
    const row = document.createElement("div");
    row.textContent = c.name;
    row.style.cssText = "padding:10px 12px;cursor:pointer;font-size:0.95rem;border-bottom:1px solid var(--line);";
    if (c.isAll) { row.style.fontWeight = "600"; row.style.color = "var(--ink-70)"; }
    row.addEventListener("mouseenter", () => (row.style.background = "var(--paper-dim)"));
    row.addEventListener("mouseleave", () => (row.style.background = ""));
    row.addEventListener("click", () => selectProvidersCourt(c));
    listEl.appendChild(row);
  });
  listEl.style.display = "block";
}

function selectProvidersCourt(court) {
  const isAll = court.isAll === true || !court.id;
  providersState.courtId = isAll ? "" : String(court.id);
  const s = document.getElementById("filter-court-search-prov");
  const h = document.getElementById("filter-court-prov");
  const l = document.getElementById("filter-court-list-prov");
  if (s) s.value = isAll ? "" : court.name;
  if (h) h.value = providersState.courtId;
  if (l) l.style.display = "none";
}

function setupProvidersPageCourtPicker() {
  const s = document.getElementById("filter-court-search-prov");
  const l = document.getElementById("filter-court-list-prov");
  if (!s || !l) return;
  s.addEventListener("focus", () => { if (!s.disabled && PROV_FILTERED_COURTS.length) renderProvidersCourtList(s.value); });
  s.addEventListener("input", () => {
    providersState.courtId = "";
    const h = document.getElementById("filter-court-prov");
    if (h) h.value = "";
    renderProvidersCourtList(s.value);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#filter-court-search-prov") && !e.target.closest("#filter-court-list-prov")) {
      l.style.display = "none";
    }
  });
}

async function renderProvidersList() {
  const el = document.getElementById("providers-list");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading providers…</div>`;

  let result;
  try {
    result = await Api.getProviders({
      verified: providersState.verified || undefined,
      q:        providersState.search   || undefined,
      phase:    providersState.phase    || undefined,
      courtId:  providersState.courtId  || undefined,
      page:     providersState.page,
      limit:    providersState.limit,
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${err.message}</div>`;
    return;
  }

  const providers = Array.isArray(result) ? result : (result.data || []);
  providersState.total      = result.total      ?? providers.length;
  providersState.page       = result.page       ?? 1;
  providersState.limit      = result.limit      ?? PROVIDERS_PER_PAGE;
  providersState.totalPages = result.totalPages ?? 1;

  if (!providers.length) {
    el.innerHTML = `<div class="empty-state">No providers match your filters.</div>`;
    const pager = document.getElementById("providers-pagination");
    if (pager) pager.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Phase</th>
            <th>Court</th><th>Phone</th><th>Status</th><th>Rating</th>
          </tr>
        </thead>
        <tbody>
          ${providers.map((p) => `
            <tr>
              <td>${escapeHtml(p.name || "-")}</td>
              <td>${escapeHtml(categoryLabel(p.category) || "-")}</td>
              <td>${p.phase ? "Phase " + p.phase : "-"}</td>
              <td>${escapeHtml(p.courtName || "-")}</td>
              <td>${escapeHtml(p.phone || "-")}</td>
              <td>${verifiedBadge(p.verified)}</td>
              <td>${p.rating ? Number(p.rating).toFixed(1) : "-"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
  renderProvidersPagination();
  wireProvidersPagination();
}

function renderProvidersPagination() {
  const el = document.getElementById("providers-pagination");
  if (!el) return;
  const { page, limit, total, totalPages } = providersState;
  el.innerHTML = paginationFooter("provider", providersState,
    total === 0 ? 0 : ((page - 1) * limit) + 1,
    Math.min(page * limit, total),
    total, totalPages, page,
    `data-pv-page="prev"`, `data-pv-page="next"`);
}

function wireProvidersPagination() {
  document.querySelectorAll("[data-pv-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.pvPage;
      if (dir === "prev" && providersState.page > 1) providersState.page--;
      else if (dir === "next" && providersState.page < providersState.totalPages) providersState.page++;
      else return;
      await renderProvidersList();
    });
  });
}

function setupProvidersPageFilterForm() {
  const form = document.getElementById("providers-filter");
  const clear = document.getElementById("filter-clear-prov");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    providersState.search   = document.getElementById("filter-search-prov")?.value.trim()  || "";
    providersState.phase    = document.getElementById("filter-phase-prov")?.value           || "";
    providersState.verified = document.getElementById("filter-status-prov")?.value          || "";
    providersState.courtId  = document.getElementById("filter-court-prov")?.value           || "";
    providersState.page     = 1;
    renderProvidersList();
  });
  clear?.addEventListener("click", () => {
    const phaseSel = document.getElementById("filter-phase-prov");
    const statusSel = document.getElementById("filter-status-prov");
    const searchEl = document.getElementById("filter-search-prov");
    if (searchEl) searchEl.value = "";
    if (phaseSel) phaseSel.value = "";
    if (statusSel) statusSel.value = "";
    PROV_FILTERED_COURTS = PROV_ALL_COURTS.slice();
    clearProvidersCourtSelection();
    renderProvidersCourtList("");
    providersState.search = ""; providersState.phase = ""; providersState.verified = "";
    providersState.courtId = ""; providersState.page = 1;
    renderProvidersList();
  });
}

async function downloadProvidersReport(kind) {
  const btnId = kind === "xlsx" ? "btn-excel-providers" : "btn-pdf-providers";
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "⏳ Preparing…";
  try {
    const blob = await Api.downloadProvidersReport(kind, {
      verified: providersState.verified || undefined,
      q:        providersState.search   || undefined,
      phase:    providersState.phase    || undefined,
      courtId:  providersState.courtId  || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athi-soko-providers-${new Date().toISOString().slice(0, 10)}.${kind}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast(`Providers report downloaded (${kind.toUpperCase()}).`);
  } catch (err) {
    toast(`Could not download ${kind.toUpperCase()}.`);
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
}

function setupProvidersPageExportButtons() {
  document.getElementById("btn-excel-providers")?.addEventListener("click", () => downloadProvidersReport("xlsx"));
  document.getElementById("btn-pdf-providers")?.addEventListener("click",   () => downloadProvidersReport("pdf"));
}

/* ============================================================
   HOUSE NUMBERS PAGE
   ============================================================ */
async function renderHouseNumbersPage() {
  await setupHNFilters();
  setupHNCourtPicker();
  setupHNFormHandlers();
  await loadHNSummary();
  await loadHNResidents();
  wireHNExportButtons();
}

async function setupHNFilters() {
  const phaseSel = document.getElementById("filter-phase-hn");
  if (!phaseSel) return;
  try {
    HN_ALL_COURTS = await Api.getCourts();
  } catch (err) {
    phaseSel.innerHTML = `<option value="">Failed to load</option>`;
    return;
  }
  for (const c of HN_ALL_COURTS) HN_COURT_NAMES.set(String(c.id), c.name);
  const phases = [...new Set(HN_ALL_COURTS.map((c) => String(c.phase)))].filter(Boolean).sort();
  phaseSel.innerHTML = `<option value="">All phases</option>` +
    phases.map((p) => `<option value="${p}">Phase ${p}</option>`).join("");
  phaseSel.disabled = false;

  HN_FILTERED_COURTS = HN_ALL_COURTS.slice();
  renderHNCourtList("");
  enableHNCourtSearch(true);

  phaseSel.addEventListener("change", () => {
    const phase = phaseSel.value;
    hnState.phase = phase;
    hnState.courtId = "";
    hnState.page = 1;
    HN_FILTERED_COURTS = phase
      ? HN_ALL_COURTS.filter((c) => String(c.phase) === String(phase))
      : HN_ALL_COURTS.slice();
    clearHNCourtSelection();
    renderHNCourtList("");
  });
}

function enableHNCourtSearch(enabled) {
  const s = document.getElementById("filter-court-search-hn");
  if (!s) return;
  s.disabled = !enabled;
  s.placeholder = enabled ? "All courts - type to search…" : "Select phase first…";
}

function clearHNCourtSelection() {
  const s = document.getElementById("filter-court-search-hn");
  const h = document.getElementById("filter-court-hn");
  const l = document.getElementById("filter-court-list-hn");
  if (s) s.value = "";
  if (h) h.value = "";
  if (l) l.style.display = "none";
  hnState.courtId = "";
}

function renderHNCourtList(query) {
  const listEl = document.getElementById("filter-court-list-hn");
  if (!listEl) return;
  const q = (query || "").toLowerCase().trim();
  const matches = HN_FILTERED_COURTS.filter((c) => c.name.toLowerCase().includes(q));
  listEl.innerHTML = "";
  if (!matches.length) {
    listEl.innerHTML = `<div style="padding:10px 12px;color:var(--ink-70);font-size:0.9rem;">No matches</div>`;
    listEl.style.display = "block";
    return;
  }
  for (const c of matches) {
    const row = document.createElement("div");
    row.textContent = c.name;
    row.style.cssText = "padding:10px 12px;cursor:pointer;font-size:0.95rem;border-bottom:1px solid var(--line);";
    row.addEventListener("mouseenter", () => (row.style.background = "var(--paper-dim)"));
    row.addEventListener("mouseleave", () => (row.style.background = ""));
    row.addEventListener("click", () => selectHNCourt(c));
    listEl.appendChild(row);
  }
  listEl.style.display = "block";
}

function selectHNCourt(court) {
  document.getElementById("filter-court-hn").value = court.id;
  document.getElementById("filter-court-search-hn").value = court.name;
  document.getElementById("filter-court-list-hn").style.display = "none";
  hnState.courtId = String(court.id);
}

function setupHNCourtPicker() {
  const s = document.getElementById("filter-court-search-hn");
  const l = document.getElementById("filter-court-list-hn");
  if (!s || !l) return;
  s.addEventListener("input", (e) => renderHNCourtList(e.target.value));
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#filter-court-search-hn") && !e.target.closest("#filter-court-list-hn")) {
      l.style.display = "none";
    }
  });
}

async function loadHNSummary() {
  try {
    const s = await Api.getHouseNumberSummary();
    document.getElementById("tile-assigned").textContent   = s.assigned;
    document.getElementById("tile-unassigned").textContent = s.unassigned;
    document.getElementById("tile-total").textContent      = s.total;
  } catch (err) {
    console.error("[admin] HN summary failed:", err);
  }
}

async function loadHNResidents() {
  const wrap = document.getElementById("hn-table-wrap");
  if (!wrap) return;
  wrap.innerHTML = `<div class="empty-state">Loading residents…</div>`;

  let result;
  try {
    result = await Api.getHouseNumberResidents({
      q: hnState.q, courtId: hnState.courtId, status: hnState.status,
      page: hnState.page, limit: hnState.limit,
    });
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${err.message}</div>`;
    return;
  }

  hnState.total      = result.total;
  hnState.page       = result.page;
  hnState.totalPages = result.totalPages;

  if (!result.data.length) {
    wrap.innerHTML = `<div class="empty-state">No residents match this filter.</div>`;
    renderHNPagination();
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Resident</th><th>Phone</th><th>Phase</th><th>Court</th><th>House number</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${result.data.map((r) => `
          <tr data-id="${r.id}">
            <td>${escapeHtml(r.fullName)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td>Phase ${escapeHtml(r.phase)}</td>
            <td>${escapeHtml(r.courtName)}</td>
            <td>
              <input type="text" class="input hn-input" data-id="${r.id}"
                     value="${escapeHtml(r.houseNumber || "")}"
                     placeholder="${escapeHtml(r.courtName)}-A01"
                     style="min-width:220px;font-family:monospace;" />
            </td>
            <td><button class="btn btn--accent btn--small" data-save="${r.id}">Save</button></td>
          </tr>`).join("")}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll("[data-save]").forEach((btn) =>
    btn.addEventListener("click", () => saveHN(btn.dataset.save, btn))
  );
  wrap.querySelectorAll(".hn-input").forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const btn = wrap.querySelector(`[data-save="${inp.dataset.id}"]`);
        if (btn) saveHN(inp.dataset.id, btn);
      }
    });
  });
  renderHNPagination();
}

async function saveHN(id, btn) {
  const input = document.querySelector(`.hn-input[data-id="${id}"]`);
  if (!input) return;
  const value = input.value.trim();
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await Api.setResidentHouseNumber(id, value);
    toast(value ? `House number set: ${value}` : "House number cleared.");
    await loadHNSummary();
    await loadHNResidents();
  } catch (err) {
    toast(err.message || "Could not save.");
    btn.disabled = false; btn.textContent = original;
  }
}

function renderHNPagination() {
  const el = document.getElementById("hn-pagination");
  if (!el) return;
  const { page, limit, total, totalPages } = hnState;
  if (!total) { el.innerHTML = ""; return; }
  el.innerHTML = paginationFooter("resident", hnState,
    (page - 1) * limit + 1, Math.min(page * limit, total),
    total, totalPages, page,
    `data-hn-page="prev"`, `data-hn-page="next"`);
  el.querySelectorAll("[data-hn-page]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.hnPage === "prev" && hnState.page > 1) hnState.page--;
      if (b.dataset.hnPage === "next" && hnState.page < hnState.totalPages) hnState.page++;
      loadHNResidents();
    });
  });
}

function setupHNFormHandlers() {
  document.getElementById("hn-filter")?.addEventListener("submit", (e) => {
    e.preventDefault();
    hnState.q = document.getElementById("filter-q-hn")?.value.trim() || "";
    hnState.page = 1;
    loadHNResidents();
  });
  document.getElementById("filter-status-hn")?.addEventListener("change", (e) => {
    hnState.status = e.target.value;
    hnState.page = 1;
    loadHNResidents();
  });
  document.getElementById("filter-clear-hn")?.addEventListener("click", () => {
    const q = document.getElementById("filter-q-hn");
    const st = document.getElementById("filter-status-hn");
    const ph = document.getElementById("filter-phase-hn");
    if (q) q.value = "";
    if (st) st.value = "unassigned";
    if (ph) ph.value = "";
    clearHNCourtSelection();
    HN_FILTERED_COURTS = HN_ALL_COURTS.slice();
    renderHNCourtList("");
    hnState.status = "unassigned"; hnState.phase = ""; hnState.courtId = ""; hnState.q = ""; hnState.page = 1;
    loadHNResidents();
  });
}

function downloadCSVTemplate() {
  const csv = "phone,houseNumber\n+254720689389,Riverside-A01\n+254715408527,Riverside-A02\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "house-numbers-template.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines.shift().split(",").map((h) => h.trim().toLowerCase());
  const phoneIdx = header.indexOf("phone");
  const hnIdx = header.indexOf("housenumber");
  if (phoneIdx === -1 || hnIdx === -1) throw new Error("CSV must have 'phone' and 'houseNumber' columns.");
  return lines.map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return { phone: cols[phoneIdx] || "", houseNumber: cols[hnIdx] || "" };
  });
}

async function uploadCSV(file) {
  const text = await file.text();
  let rows;
  try { rows = parseCSV(text); } catch (err) { toast(err.message); return; }
  if (!rows.length) { toast("CSV is empty."); return; }
  if (!confirm(`Upload ${rows.length} row(s)?`)) return;
  try {
    const result = await Api.bulkAssignHouseNumbers(rows);
    await loadHNSummary();
    await loadHNResidents();
    const summary = [
      `✅ Assigned: ${result.ok}`,
      result.notFound.length  ? `⚠️ Not found: ${result.notFound.length}` : "",
      result.invalid.length   ? `❌ Invalid: ${result.invalid.length}`    : "",
      result.duplicate.length ? `🔁 Duplicates: ${result.duplicate.length}` : "",
    ].filter(Boolean).join(" · ");
    toast(summary);
  } catch (err) { toast(err.message || "Upload failed."); }
}

function wireHNExportButtons() {
  document.getElementById("btn-download-template")?.addEventListener("click", downloadCSVTemplate);
  document.getElementById("btn-upload-csv")?.addEventListener("click", () =>
    document.getElementById("csv-input")?.click()
  );
  document.getElementById("csv-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) uploadCSV(file);
    e.target.value = "";
  });
}

/* ============================================================
   CATEGORIES PAGE
   ============================================================ */
async function renderCategoriesPage() {
  if (!isSuperAdmin()) return;   // router already guards this
  document.getElementById("btn-add-cat")?.addEventListener("click", openCatAdd);
  document.getElementById("cat-cancel")?.addEventListener("click", closeCatModal);
  document.getElementById("cat-save")?.addEventListener("click", saveCategory);
  document.getElementById("cat-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "cat-modal") closeCatModal();
  });
  await loadCategories();
}

async function loadCategories() {
  const el = document.getElementById("cat-list");
  if (!el) return;
  el.innerHTML = `<div class="empty-state">Loading…</div>`;
  try {
    currentCategories = await Api.getCategories();
  } catch (err) {
    el.innerHTML = `<div class="empty-state" style="color:var(--clay)">Could not load: ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!currentCategories.length) {
    el.innerHTML = `<div class="empty-state">No categories yet.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:60px;">Icon</th>
            <th>Label</th>
            <th style="width:110px; text-align:right;">Vendors</th>
            <th style="width:180px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${currentCategories.map((c) => `
            <tr>
              <td style="font-size:1.4rem; line-height:1; text-align:center;">${escapeHtml(c.icon || "—")}</td>
              <td style="font-weight:600;">${escapeHtml(c.label)}</td>
              <td style="text-align:right;">${c.vendors ?? 0}</td>
              <td class="row-actions">
                <button class="btn btn--ghost btn--small" data-cat-edit="${c.id}">Edit</button>
                <button class="btn btn--danger btn--small" data-cat-del="${c.id}"
                        data-cat-label="${escapeAttr(c.label)}">Delete</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
  el.querySelectorAll("[data-cat-edit]").forEach((b) =>
    b.addEventListener("click", () => openCatEdit(b.dataset.catEdit)));
  el.querySelectorAll("[data-cat-del]").forEach((b) =>
    b.addEventListener("click", () => deleteCategory(b.dataset.catDel, b.dataset.catLabel, b)));
}

function openCatAdd() {
  editingCategoryId = null;
  document.getElementById("cat-modal-title").textContent = "New category";
  document.getElementById("cat-label").value = "";
  document.getElementById("cat-icon").value  = "";
  document.getElementById("cat-error").style.display = "none";
  document.getElementById("cat-modal").style.display = "flex";
  document.getElementById("cat-label").focus();
}

function openCatEdit(id) {
  const c = currentCategories.find((x) => String(x.id) === String(id));
  if (!c) return;
  editingCategoryId = id;
  document.getElementById("cat-modal-title").textContent = "Edit category";
  document.getElementById("cat-label").value = c.label || "";
  document.getElementById("cat-icon").value  = c.icon  || "";
  document.getElementById("cat-error").style.display = "none";
  document.getElementById("cat-modal").style.display = "flex";
  document.getElementById("cat-label").focus();
}

function closeCatModal() {
  editingCategoryId = null;
  document.getElementById("cat-modal").style.display = "none";
}

async function saveCategory() {
  const label = document.getElementById("cat-label").value.trim();
  const icon  = document.getElementById("cat-icon").value.trim();
  const errEl = document.getElementById("cat-error");
  errEl.style.display = "none";

  if (!label) {
    errEl.textContent = "Label is required.";
    errEl.style.display = "block";
    return;
  }
  const btn = document.getElementById("cat-save");
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Saving…";
  try {
    if (editingCategoryId) {
      await Api.updateCategory(editingCategoryId, { label, icon });
      toast("Category updated.");
    } else {
      await Api.createCategory({ label, icon });
      toast("Category created.");
    }
    closeCatModal();
    await loadCategories();
  } catch (err) {
    errEl.textContent = err.message || "Could not save.";
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function deleteCategory(id, label, btn) {
  if (!confirm(`Delete category "${label}"?\n\nThis will fail if any vendor still uses it.`)) return;
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    await Api.deleteCategory(id);
    toast(`Category "${label}" deleted.`);
    await loadCategories();
  } catch (err) {
    toast(err.message || "Could not delete category.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

/* ============================================================
   ADMINS PAGE
   ============================================================ */
async function renderAdminsPage() {
  if (!isSuperAdmin()) return;
  await loadAdmins();

  document.getElementById("btnNewAdmin")?.addEventListener("click", openNewAdminModal);
  document.getElementById("btnCancelNewAdmin")?.addEventListener("click", closeNewAdminModal);
  document.getElementById("btnSaveNewAdmin")?.addEventListener("click", createAdmin);
  document.getElementById("btnCloseTempPw")?.addEventListener("click", () => {
    document.getElementById("tempPwModal").style.display = "none";
  });
  document.getElementById("btnCopyTempPw")?.addEventListener("click", () => {
    const text = document.getElementById("tempPwValue").textContent;
    navigator.clipboard.writeText(text).then(() => toast("Copied!"));
  });
}

async function loadAdmins() {
  const box = document.getElementById("adminsTable");
  if (!box) return;
  box.innerHTML = `<div class="empty-state">Loading…</div>`;

  let admins;
  try { admins = await Api.getAdmins(); }
  catch (err) {
    box.innerHTML = `<div class="empty-state" style="color:#c0392b;">${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!admins.length) { box.innerHTML = `<div class="empty-state">No admins yet.</div>`; return; }

  const me = (typeof getUser === "function") ? getUser() : {};
  const superCount = admins.filter((a) => a.role === "super").length;

  const rows = admins.map((a) => {
    const isMe = a.id === me.id;
    const isSuper = a.role === "super";
    const isLastSuper = isSuper && superCount === 1;

    return `
      <tr>
        <td>${escapeHtml(a.full_name)}${isMe ? " <em style='color:#6b7280;'>(you)</em>" : ""}</td>
        <td>${escapeHtml(a.email)}</td>
        <td>
          <span class="badge ${isSuper ? "badge--verified" : ""}"
                style="${isSuper ? "" : "background:#e5e7eb;color:#374151;"}">
            ${isSuper ? "SUPER" : "ADMIN"}
          </span>
        </td>
        <td>${a.must_change_password
          ? '<span style="color:#c0392b;">Pending first login</span>'
          : "Active"}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button type="button" class="btn btn--ghost btn--small"
                  data-admin-action="reset" data-id="${a.id}">Reset password</button>
          ${(!isSuper || !isMe) && !isLastSuper ? `
            <button type="button" class="btn btn--ghost btn--small"
                    data-admin-action="role" data-id="${a.id}"
                    data-role="${isSuper ? "admin" : "super"}">
              ${isSuper ? "Demote" : "Promote"}
            </button>` : ""}
          ${!isMe && !isLastSuper ? `
            <button type="button" class="btn btn--ghost btn--small"
                    style="color:#c0392b;"
                    data-admin-action="delete" data-id="${a.id}"
                    data-name="${escapeAttr(a.full_name)}">
              Delete
            </button>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  box.innerHTML = `
    <table style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden;">
      <thead>
        <tr style="background:#f3f4f6; text-align:left;">
          <th style="padding:12px;">Name</th>
          <th style="padding:12px;">Email</th>
          <th style="padding:12px;">Role</th>
          <th style="padding:12px;">Status</th>
          <th style="padding:12px;"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  box.querySelectorAll("[data-admin-action]").forEach((btn) =>
    btn.addEventListener("click", () => handleAdminRowAction(btn))
  );
}

async function handleAdminRowAction(btn) {
  const id = parseInt(btn.dataset.id, 10);
  const action = btn.dataset.adminAction;

  if (action === "reset") {
    if (!confirm("Reset this admin's password? A new temp password will be generated.")) return;
    try {
      const r = await Api.resetAdminPassword(id);
      showTempPassword(r.tempPassword);
    } catch (err) { toast(err.message); }
    return;
  }
  if (action === "role") {
    const newRole = btn.dataset.role;
    const verb = newRole === "super" ? "Promote to super admin" : "Demote to admin";
    if (!confirm(`${verb}?`)) return;
    try {
      await Api.updateAdmin(id, { role: newRole });
      toast("Role updated.");
      loadAdmins();
    } catch (err) { toast(err.message); }
    return;
  }
  if (action === "delete") {
    const name = btn.dataset.name;
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await Api.deleteAdmin(id);
      toast("Admin deleted.");
      loadAdmins();
    } catch (err) { toast(err.message); }
  }
}

function openNewAdminModal() {
  document.getElementById("newAdminName").value = "";
  document.getElementById("newAdminEmail").value = "";
  document.getElementById("newAdminRole").value = "admin";
  document.getElementById("newAdminModal").style.display = "flex";
}
function closeNewAdminModal() {
  document.getElementById("newAdminModal").style.display = "none";
}
async function createAdmin() {
  const fullName = document.getElementById("newAdminName").value.trim();
  const email    = document.getElementById("newAdminEmail").value.trim();
  const role     = document.getElementById("newAdminRole").value;
  if (!fullName || !email) { toast("Please fill in both fields."); return; }
  try {
    const r = await Api.createAdmin({ fullName, email, role });
    closeNewAdminModal();
    showTempPassword(r.tempPassword);
    loadAdmins();
  } catch (err) { toast(err.message); }
}
function showTempPassword(pw) {
  document.getElementById("tempPwValue").textContent = pw;
  document.getElementById("tempPwModal").style.display = "flex";
}

/* ============================================================
   EXPORT — dashboard-wide Excel / PDF
   ============================================================ */
async function downloadAdminReport(kind) {
  const btnId = kind === "xlsx" ? "btn-excel" : "btn-pdf";
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳ Preparing…";
  try {
    const token = typeof getToken === "function" ? getToken() : null;
    if (!token) throw new Error("Not logged in.");
    let res;
    if (kind === "xlsx") {
      const images = {};
      ["chart-trend", "chart-status", "chart-category", "chart-weekday"].forEach((id) => {
        const canvas = document.getElementById(id);
        if (canvas && canvas.width > 0) images[id] = canvas.toDataURL("image/png");
      });
      res = await fetch("http://localhost:4050/api/admin/export.xlsx", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
    } else {
      res = await fetch("http://localhost:4050/api/admin/export.pdf", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athi-soko-report-${new Date().toISOString().slice(0, 10)}.${kind}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast(`Report downloaded (${kind.toUpperCase()}).`);
  } catch (err) {
    toast(`Could not download ${kind.toUpperCase()}.`);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function setupExportButtons() {
  document.getElementById("btn-excel")?.addEventListener("click", () => downloadAdminReport("xlsx"));
  document.getElementById("btn-pdf")?.addEventListener("click",   () => downloadAdminReport("pdf"));
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireRole === "function" && !requireRole("admin", "super")) return;

  renderHeaderChip();
  setupSidebarGroup();
  setupExportButtons();
  setupOverviewTabs();

  if (typeof loadCategoryCache === "function") await loadCategoryCache();

  initRouter();

  console.log("[admin] role:", getCurrentRole(), "| super:", isSuperAdmin());
});