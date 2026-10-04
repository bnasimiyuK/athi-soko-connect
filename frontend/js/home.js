/* ============================================================
   home.js - Discover page with category-first landing
   All figures fetched from the backend.
   ============================================================ */

/* ---------------- helpers ---------------- */
function initialsOf(name) {
  return String(name || "?")
    .split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function servicesArray(p) {
  if (Array.isArray(p.services)) return p.services;
  if (!p.services) return [];
  return String(p.services).split(/,\s*/).map((s) => s.trim()).filter(Boolean);
}

function formatTimeUntil(iso) {
  if (!iso) return null;
  const diffMs   = new Date(iso) - new Date();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) return { relative: "any moment", backTime: null };

  const back = new Date(iso);
  const backTime = back.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

  let relative;
  if (diffMins < 60) {
    relative = `in ${diffMins} min`;
  } else {
    const hrs  = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    relative = mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
  }
  return { relative, backTime };
}

/* ------------------------------------------------------------
   Category icons (label → emoji)
   ------------------------------------------------------------ */
const CATEGORY_EMOJI = {
  "Plumbing":           "🔧",
  "Cleaning":           "🧽",
  "Housekeeping":       "🏠",
  "Electrical":         "⚡",
  "Electrical & Solar": "⚡",
  "Errands":            "🏃",
  "Gardening":          "🌿",
  "Painting":           "🎨",
  "Moving":             "📦",
  "Tutoring":           "📚",
  "Pharmacy":           "💊",
  "Cobbler":            "👞",
  "Bicycle repairs":    "🚲",
  "Mechanic":           "🔩",
  "Car wash":           "🚗",
  "Agro vet":           "🐄",
  "Mason":              "🧱",
  "Carpenter":          "🪚",
  "School":             "🏫",
  "Clinic":             "🩺",
  "Hospital":           "🏥",
  "Supermarket":        "🏪",
  "Poshomill":          "🌾",
  "Butchery":           "🥩",
  "Water vendor":       "💧",
  "Exhauster":          "🚛",
  "Restaurant":         "🍽️",
  "Grocery":            "🛒",
  "Fresh Groceries":    "🛒",
  "Garbage Collector":  "🗑️",
};

function categoryIcon(label) {
  return CATEGORY_EMOJI[label] || "🌐";
}

/* ---------------- state ---------------- */
const _state = {
  categories: [],
  courts: [],
  activeCategory: null,
  allProviders: [],
  categoriesExpanded: false,
};

const discoverState = {
  page: 1,
  limit: 6,
  total: 0,
  totalPages: 1,
  accumulated: [],
};

/* ---------------- Phase → Court cascade ---------------- */
function buildPhaseOptions(courts) {
  const phases = [...new Set(courts.map((c) => Number(c.phase)))]
    .filter((v) => !isNaN(v)).sort((a, b) => a - b);

  const $phase = document.getElementById("phase");
  if (!$phase) return;
  $phase.innerHTML = `<option value="">All Phases</option>`;
  phases.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = `Phase ${p}`;
    $phase.appendChild(opt);
  });
}

function filterCourtsByPhase(phase) {
  const $court = document.getElementById("court");
  if (!$court) return;

  const list = phase
    ? _state.courts.filter((c) => Number(c.phase) === Number(phase))
    : _state.courts;

  if (!list.length) {
    $court.innerHTML = `<option value="">No courts</option>`;
    $court.disabled = true;
    return;
  }

  $court.innerHTML = `<option value="">All Courts</option>` +
    list.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  $court.disabled = false;
}

/* ============================================================
   CATEGORY TILES
   ============================================================ */
function renderCategoryTiles() {
  const el = document.getElementById("category-tiles");
  if (!el) return;

  const allActive = _state.activeCategory === null;

  const countsById = {};
  _state.allProviders.forEach((p) => {
    const cid = p.category;
    if (cid != null) countsById[cid] = (countsById[cid] || 0) + 1;
  });

  const backendTotal = _state.allProviders.length;
  const sumOfCats    = _state.categories.reduce((sum, c) => sum + (c.count || 0), 0);
  const totalProviders = backendTotal || sumOfCats;

  const INITIAL_COUNT = 5;
  const visibleCats = _state.categoriesExpanded
    ? _state.categories
    : _state.categories.slice(0, INITIAL_COUNT);

  let html = `
    <button type="button" class="category-tile ${allActive ? "is-active" : ""}" data-cat="">
      <div class="category-tile__icon">📋</div>
      <div class="category-tile__label">All Providers</div>
      <div class="category-tile__count">${totalProviders || "—"}</div>
    </button>
  `;

  html += visibleCats.map((c) => {
    const isActive = _state.activeCategory === c.id;
    const count = c.count ?? countsById[c.id] ?? 0;

    return `
      <button type="button" class="category-tile ${isActive ? "is-active" : ""}" data-cat="${c.id}">
        <div class="category-tile__icon">${categoryIcon(c.label)}</div>
        <div class="category-tile__label">${escapeHtml(c.label)}</div>
        <div class="category-tile__count">${count}</div>
      </button>
    `;
  }).join("");

  el.innerHTML = html;

  el.querySelectorAll(".category-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.cat;
      _state.activeCategory = raw === "" ? null : parseInt(raw, 10);

      renderCategoryTiles();
      updateResultsHeading();

      discoverState.page = 1;
      discoverState.accumulated = [];
      renderResults();
    });
  });

  updateViewAllLink();
}

/* ------------------------------------------------------------
   View all categories toggle
   ------------------------------------------------------------ */
function updateViewAllLink() {
  const link = document.getElementById("view-all-categories");
  if (!link) return;

  const total = _state.categories.length;

  if (total <= 5) {
    link.style.display = "none";
    return;
  }

  link.style.display = "inline-block";

  if (_state.categoriesExpanded) {
    link.classList.add("is-expanded");
    link.innerHTML = `Show fewer categories ▴`;
  } else {
    link.classList.remove("is-expanded");
    const extra = total - 5;
    link.innerHTML = `View more categories (${extra}) ▾`;
  }
}

function setupViewAllToggle() {
  const link = document.getElementById("view-all-categories");
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    _state.categoriesExpanded = !_state.categoriesExpanded;
    renderCategoryTiles();
  });
}

/* ------------------------------------------------------------
   Hero eyebrow (phase range)
   ------------------------------------------------------------ */
async function renderHeroEyebrow() {
  const el = document.getElementById("hero-eyebrow");
  if (!el) return;

  if (typeof Api.getPhaseRange === "function") {
    try {
      const r = await Api.getPhaseRange();
      if (r && r.min != null && r.max != null) {
        el.textContent = r.min === r.max
          ? `Vetted Neighborhood Network · Phase ${r.min}`
          : `Vetted Neighborhood Network · Phase ${r.min}-${r.max}`;
        return;
      }
    } catch { /* fall through */ }
  }

  const phases = [...new Set(
    _state.courts.map((c) => Number(c.phase)).filter((v) => !isNaN(v))
  )].sort((a, b) => a - b);

  if (!phases.length) {
    el.textContent = "Vetted Neighborhood Network";
    return;
  }

  const min = phases[0];
  const max = phases[phases.length - 1];

  el.textContent = min === max
    ? `Vetted Neighborhood Network · Phase ${min}`
    : `Vetted Neighborhood Network · Phase ${min}-${max}`;
}

/* ------------------------------------------------------------
   Gate clearance pill
   ------------------------------------------------------------ */
function renderGateClearance() {
  const pill = document.getElementById("gate-clearance-pill");
  if (!pill) return;

  const nowEAT = new Date(new Date().toLocaleString("en-US", {
    timeZone: "Africa/Nairobi",
  }));
  const hour = nowEAT.getHours();

  if (hour >= 6 && hour < 22) {
    pill.className = "pill pill--live";
    pill.textContent = "Gate Clearance: Live";
  } else if (hour >= 22 && hour < 23) {
    pill.className = "pill pill--busy";
    pill.textContent = "Gate Clearance: Closing Soon";
  } else {
    pill.className = "pill pill--closed";
    pill.textContent = "Gate 2 Closed · Gate 1 Open";
  }
}

function updateResultsHeading() {
  const h = document.getElementById("results-heading");
  if (!h) return;

  if (_state.activeCategory === null) {
    h.textContent = "Showing verified providers";
  } else {
    const cat = _state.categories.find((c) => c.id === _state.activeCategory);
    h.textContent = cat ? `${cat.label} providers` : "Providers";
  }
}

/* ============================================================
   POPULATE FILTERS + STATS
   ============================================================ */
async function populateFilters() {
  try {
    _state.categories = typeof loadCategoryCache === "function"
      ? await loadCategoryCache()
      : await Api.getCategories();
  } catch (err) {
    console.error("[home] categories failed:", err);
    _state.categories = [];
  }

  renderCategoryTiles();

  try {
    _state.courts = await Api.getCourts();
    buildPhaseOptions(_state.courts);
    filterCourtsByPhase("");
  } catch (err) {
    console.error("[home] courts failed:", err);
  }

  await renderHeroEyebrow();

  try {
    const all = await Api.getProviders({ limit: 9999 });
    const list = Array.isArray(all) ? all : (all.data || []);
    _state.allProviders = list;

    renderCategoryTiles();
    renderStats(list);
  } catch (err) {
    console.error("[home] stats failed:", err);
    renderStatsFallback();
  }

  renderGateClearance();
}

function renderStats(providers) {
  const list = Array.isArray(providers) ? providers : [];

  const total    = list.length;
  const verified = list.filter((p) => p.verified).length;
  const readyNow = list.filter((p) => p.isAvailable !== false).length;

  const courts = [...new Set(list.map((p) => p.courtName).filter(Boolean))];

  const totalEl = document.getElementById("stat-providers");
  if (totalEl) totalEl.textContent = total.toLocaleString();

  const totalSub = document.getElementById("stat-providers-sub");
  if (totalSub) {
    totalSub.textContent = courts.length
      ? `Across ${courts.length} court${courts.length === 1 ? "" : "s"}`
      : "Across all courts";
  }

  const verifiedEl = document.getElementById("stat-verified");
  if (verifiedEl) verifiedEl.textContent = verified.toLocaleString();

  const verifiedSub = document.getElementById("stat-verified-sub");
  if (verifiedSub) {
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    verifiedSub.textContent = total > 0
      ? `${pct}% of all providers · Passed Security Clearance`
      : "Passed Security Clearance ⓘ";
  }

  const commissionEl = document.getElementById("stat-commission");
  if (commissionEl) commissionEl.textContent = "0%";

  const readyCountEl = document.getElementById("ready-count");
  if (readyCountEl) readyCountEl.textContent = readyNow.toLocaleString();
}

function renderStatsFallback() {
  const dash = (id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  };
  dash("stat-providers");
  dash("stat-verified");
  dash("ready-count");

  const sub1 = document.getElementById("stat-providers-sub");
  if (sub1) sub1.textContent = "Unavailable";

  const sub2 = document.getElementById("stat-verified-sub");
  if (sub2) sub2.textContent = "Unavailable";

  const commissionEl = document.getElementById("stat-commission");
  if (commissionEl) commissionEl.textContent = "0%";
}

/* ---------------- provider card ---------------- */
function providerCard(p) {
  const initials = initialsOf(p.name);
  const cat = p.categoryLabel
    || (typeof categoryLabel === "function" ? categoryLabel(p.category) : "-");

  const verifiedPill = typeof verifiedBadge === "function"
    ? verifiedBadge(p.verified)
    : (p.verified ? `<span class="badge badge--verified">Verified</span>` : "");

  const availabilityPill = p.isAvailable === false
    ? `<span class="badge" style="background:#e74c3c;color:white;">Busy</span>`
    : "";

  const badge = verifiedPill + (availabilityPill ? " " + availabilityPill : "");

  const rating      = Number(p.rating || 0).toFixed(1);
  const reviewCount = Number(p.reviews || 0);
  const services    = servicesArray(p).slice(0, 3);
  const price       = Number(p.priceFrom || 0);

  const locParts = [];
  if (p.courtName)      locParts.push(escapeHtml(p.courtName));
  if (p.phase != null)  locParts.push(`Phase ${p.phase}`);
  const loc = locParts.join(" · ");

  let busyLine = "";
  if (p.isAvailable === false) {
    let text;
    if (p.unavailableUntil) {
      const t = formatTimeUntil(p.unavailableUntil);
      text = (t && t.backTime)
        ? `⏸️ Busy until ${t.backTime} · ${t.relative}`
        : "⏸️ Busy · back any moment";
    } else {
      text = "⏸️ Busy · not accepting bookings";
    }
    busyLine = `
      <div class="busy-countdown busy-line" data-until="${p.unavailableUntil || ""}">
        ${text}
      </div>`;
  }

  return `
    <a class="card" href="provider.html?id=${encodeURIComponent(p.id)}">
      <div class="card-top">
        <div class="card-top__left">
          <div class="avatar">${escapeHtml(initials)}</div>
          <div>
            <h3>${escapeHtml(p.name)}</h3>
            <div class="meta">${escapeHtml(cat)}${loc ? " · " + loc : ""}</div>
          </div>
        </div>
        ${badge}
      </div>

      <div class="rating">
        ⭐ ${rating} ${reviewCount ? `(${reviewCount})` : ""}
      </div>

      <div class="tags">
        ${services.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}
      </div>

      ${busyLine}

      <div class="card-footer">
        <span class="price">
          From KSh ${price.toLocaleString()}
          <small>${escapeHtml(p.priceUnit || "")}</small>
        </span>
        <span class="meta">${escapeHtml(p.hours || "")}</span>
      </div>
    </a>
  `;
}

/* ---------------- Build current filters ---------------- */
function buildDiscoverFilters() {
  return {
    verified: true,
    search:   document.getElementById("q").value.trim(),
    phase:    document.getElementById("phase").value,
    courtId:  document.getElementById("court").value,
    category: _state.activeCategory ?? "",
    maxPrice: document.getElementById("maxPrice").value,
    page:     discoverState.page,
    limit:    discoverState.limit,
  };
}

/* ---------------- results ---------------- */
async function renderResults({ append = false } = {}) {
  const grid = document.getElementById("provider-grid");
  if (!grid) return;

  if (!append) {
    grid.innerHTML = `<div class="empty-state">Loading providers…</div>`;
    discoverState.accumulated = [];
  }

  let result;
  try {
    result = await Api.getProviders(buildDiscoverFilters());
  } catch (err) {
    console.error("[home] providers failed:", err);
    if (!append) grid.innerHTML = `<div class="empty-state">Could not load providers.</div>`;
    return;
  }

  const providers = Array.isArray(result) ? result : (result.data || []);
  discoverState.total      = result.total      ?? providers.length;
  discoverState.page       = result.page       ?? 1;
  discoverState.limit      = result.limit      ?? discoverState.limit;
  discoverState.totalPages = result.totalPages ?? 1;

  if (append) {
    discoverState.accumulated.push(...providers);
  } else {
    discoverState.accumulated = providers;
  }

  const countEl = document.getElementById("results-count");
  if (countEl) {
    if (discoverState.total === 0) {
      countEl.textContent = "No providers found";
    } else {
      countEl.textContent =
        `Showing ${discoverState.accumulated.length} of ${discoverState.total} provider${discoverState.total === 1 ? "" : "s"}`;
    }
  }

  if (!discoverState.accumulated.length) {
    grid.innerHTML = `<div class="empty-state">No providers match your search.</div>`;
    renderLoadMoreButton();
    return;
  }

  grid.innerHTML = discoverState.accumulated.map(providerCard).join("");
  renderLoadMoreButton();
}

/* ---------------- Load More button ---------------- */
function renderLoadMoreButton() {
  let btn = document.getElementById("load-more-btn");

  const shown   = discoverState.accumulated.length;
  const total   = discoverState.total;
  const hasMore = shown < total;

  if (!hasMore) {
    if (btn) btn.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "load-more-btn";
    btn.type = "button";
    btn.className = "btn btn--ghost";
    btn.style.cssText =
      "display:block; margin: 24px auto 8px; min-height:44px; padding: 12px 32px;";
    btn.addEventListener("click", handleLoadMore);
    document.getElementById("provider-grid").insertAdjacentElement("afterend", btn);
  }

  const remaining = total - shown;
  btn.textContent = `Load more (${remaining} remaining)`;
  btn.disabled = false;
}

async function handleLoadMore() {
  const btn = document.getElementById("load-more-btn");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Loading…";

  discoverState.page++;
  await renderResults({ append: true });
}

/* ---------------- Live countdown ticker ---------------- */
function startCountdownTicker() {
  if (startCountdownTicker._id) clearInterval(startCountdownTicker._id);

  startCountdownTicker._id = setInterval(() => {
    document.querySelectorAll(".busy-countdown").forEach((el) => {
      const until = el.dataset.until;
      if (!until) return;

      const t = formatTimeUntil(until);
      el.textContent = (t && t.backTime)
        ? `⏸️ Busy until ${t.backTime} · ${t.relative}`
        : "⏸️ Busy · back any moment";
    });
  }, 30000);
}

/* ============================================================
   QUICK FILTER PILLS
   ============================================================ */
function setupQuickFilters() {
  const pills = document.querySelectorAll(".quick-filter");
  if (!pills.length) return;

  pills.forEach((btn) => {
    btn.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");

      discoverState.page = 1;
      discoverState.accumulated = [];
      renderResults();
    });
  });
}

/* ============================================================
   LIVE SYNC INDICATOR
   ============================================================ */
async function fetchLastSyncTime() {
  try {
    if (typeof Api !== "undefined" && typeof Api.getLastSync === "function") {
      const iso = await Api.getLastSync();
      if (iso) return iso;
    }
  } catch (err) { /* silent */ }
  return new Date().toISOString();
}

function classifyFreshness(iso) {
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diffMin < 15)  return "fresh";
  if (diffMin < 120) return "recent";
  if (diffMin < 720) return "stale";
  return "offline";
}

function formatTimeEAT(iso) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi",
  });
}

async function renderSyncIndicator() {
  const el = document.getElementById("sync-indicator");
  const t  = document.getElementById("sync-time");
  if (!el || !t) return;

  const iso = await fetchLastSyncTime();
  const status = classifyFreshness(iso);

  t.textContent = `${formatTimeEAT(iso)} EAT`;
  t.setAttribute("datetime", iso);

  el.classList.remove(
    "sync-indicator--recent",
    "sync-indicator--stale",
    "sync-indicator--offline"
  );
  if (status !== "fresh") el.classList.add(`sync-indicator--${status}`);

  el.title = `Provider availability, AHE verification, and gate access rules were last synced at ${formatTimeEAT(iso)} EAT. Click to refresh.`;

  el.addEventListener("click", async () => {
    if (el.classList.contains("is-refreshing")) return;
    el.classList.add("is-refreshing");

    const [fresh] = await Promise.all([
      fetchLastSyncTime(),
      new Promise((r) => setTimeout(r, 500)),
    ]);

    t.textContent = `${formatTimeEAT(fresh)} EAT`;
    t.setAttribute("datetime", fresh);

    const newStatus = classifyFreshness(fresh);
    el.classList.remove(
      "sync-indicator--recent",
      "sync-indicator--stale",
      "sync-indicator--offline"
    );
    if (newStatus !== "fresh") el.classList.add(`sync-indicator--${newStatus}`);

    el.classList.remove("is-refreshing");

    if (typeof toast === "function") toast("Directory refreshed.");
  });

  setInterval(async () => {
    const fresh = await fetchLastSyncTime();
    const s = classifyFreshness(fresh);
    el.classList.remove(
      "sync-indicator--recent",
      "sync-indicator--stale",
      "sync-indicator--offline"
    );
    if (s !== "fresh") el.classList.add(`sync-indicator--${s}`);
    t.textContent = `${formatTimeEAT(fresh)} EAT`;
  }, 60000);
}

/* ============================================================
   GATE RULES MODAL
   ============================================================ */
function setupGateRulesModal() {
  const trigger = document.querySelector('[data-open="gate-rules"]');
  const modal   = document.getElementById("gate-rules-modal");
  if (!trigger || !modal) return;

  const updated = document.getElementById("gate-rules-updated");

  const open = async (e) => {
    if (e) e.preventDefault();

    if (updated) {
      const iso = await fetchLastSyncTime();
      updated.textContent = `${formatTimeEAT(iso)} EAT`;
      updated.setAttribute("datetime", iso);
    }

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";

    const btn = modal.querySelector("[data-close-modal]");
    if (btn) btn.focus();
  };

  const close = () => {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  trigger.addEventListener("click", open);

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.matches("[data-close-modal]")) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      close();
    }
  });
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireAuth === "function" && !requireAuth()) return;

  try {
    await populateFilters();
    setupQuickFilters();
    setupViewAllToggle();
    updateResultsHeading();
    await renderResults();
    startCountdownTicker();

    renderSyncIndicator();
    setupGateRulesModal();

    setInterval(renderGateClearance, 60000);
  } catch (err) {
    console.error("[home] init failed:", err);
  }

  let searchTimer = null;

  const $q = document.getElementById("q");
  if ($q) {
    $q.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        discoverState.page = 1;
        discoverState.accumulated = [];
        renderResults();
      }, 200);
    });
  }

  const $phase = document.getElementById("phase");
  if ($phase) {
    $phase.addEventListener("change", (e) => {
      filterCourtsByPhase(e.target.value);
      discoverState.page = 1;
      discoverState.accumulated = [];
      renderResults();
    });
  }

  const $court = document.getElementById("court");
  if ($court) {
    $court.addEventListener("change", () => {
      discoverState.page = 1;
      discoverState.accumulated = [];
      renderResults();
    });
  }

  const $maxPrice = document.getElementById("maxPrice");
  if ($maxPrice) {
    $maxPrice.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        discoverState.page = 1;
        discoverState.accumulated = [];
        renderResults();
      }, 200);
    });
  }

  const $form = document.getElementById("search-form");
  if ($form) {
    $form.addEventListener("submit", (e) => {
      e.preventDefault();
      discoverState.page = 1;
      discoverState.accumulated = [];
      renderResults();
    });
  }
});