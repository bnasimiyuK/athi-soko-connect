/* ============================================================
   frontend/js/provider.js - Provider profile (card layout)
   Reads ?id=N and renders into #provider-root.
   ============================================================ */

/* ---------------- helpers ---------------- */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initialsOf(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function servicesArray(services) {
  if (Array.isArray(services)) return services;
  if (!services) return [];
  return String(services)
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stars(rating) {
  const r = Math.round(Number(rating) || 0);
  const clamped = Math.max(0, Math.min(5, r));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function formatDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "-"; }
}

function todayPlusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function getProviderId() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"), 10);
  return isNaN(id) ? null : id;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("asc_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function isLoggedIn() {
  return typeof getToken === "function" && !!getToken();
}

function reviewAuthor(r) {
  const candidates = [
    r.author, r.residentName, r.resident_name, r.reviewerName,
    r.reviewer_name, r.userName, r.user_name, r.name,
    [r.firstName, r.lastName].filter(Boolean).join(" "),
    [r.first_name, r.last_name].filter(Boolean).join(" "),
  ];
  const me = getCurrentUser() || {};
  for (const c of candidates) {
    const v = String(c || "").trim();
    if (!v) continue;
    if (v.toLowerCase() === "you") {
      if (isLoggedIn() && (r.userId == null || r.userId === me.id)) return "You";
      return "Estate resident";
    }
    return v;
  }
  return "Estate resident";
}

function formatTimeUntil(iso) {
  if (!iso) return null;
  const diffMs   = new Date(iso) - new Date();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) return { relative: "any moment", backTime: null };

  const back = new Date(iso);
  const backTime = back.toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit",
  });

  let relative;
  if (diffMins < 60) {
    relative = `in ${diffMins} min`;
  } else {
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    relative = mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
  }
  return { relative, backTime };
}

function priceText(p) {
  const price = Number(p.priceFrom || 0);
  return price
    ? `KSh ${price.toLocaleString()} ${escapeHtml(p.priceUnit || "")}`.trim()
    : "-";
}

/* ---------------- render states ---------------- */
function renderLoading() {
  document.getElementById("provider-root").innerHTML =
    `<div class="empty-state" style="margin-top:40px;">Loading provider…</div>`;
}

function renderError(msg) {
  document.getElementById("provider-root").innerHTML = `
    <div class="empty-state" style="margin-top:40px;">
      <h3>${escapeHtml(msg)}</h3>
      <p><a href="index.html">← Back to Discover</a></p>
    </div>`;
}

/* ============================================================
   SECTIONS
   ============================================================ */

function topbarHtml(p) {
  const parts = [];
  if (p.courtName) parts.push(escapeHtml(p.courtName));
  if (p.phase != null) parts.push(`Phase ${p.phase}`);
  return `
    <div class="provider-topbar">
      <button type="button" class="provider-topbar__back" onclick="history.back()" aria-label="Go back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="provider-topbar__title">
        <h2>Service Detail</h2>
        <p>${parts.join(" · ") || "Athi Highway Estate"}</p>
      </div>
      <div class="provider-topbar__actions">
        <button type="button"
                class="pill pill--interactive"
                id="gate-clearance-pill"
                data-open="gate-rules"
                title="Click to see gate rules">
          Gate: —
        </button>
        <div class="provider-topbar__avatar">${escapeHtml(initialsOf(p.name))}</div>
      </div>
    </div>`;
}

function bannerHtml(p) {
  if (p.isAvailable !== false) return "";

  let bannerMessage;
  if (p.unavailableUntil) {
    const t = formatTimeUntil(p.unavailableUntil);
    bannerMessage = (t && t.backTime)
      ? `Expected back around <b>${t.backTime}</b> (${t.relative}). You can try booking again after that.`
      : "Back any moment.";
  } else {
    bannerMessage = `${escapeHtml(p.name)} has marked themselves unavailable right now. Check back later.`;
  }

  return `
    <div class="pv-banner out-of-office">
      <span class="pv-banner__icon">⏸️</span>
      <div>
        <strong>Currently not accepting new bookings</strong>
        <span class="busy-countdown" data-until="${p.unavailableUntil || ""}">
          ${bannerMessage}
        </span>
      </div>
    </div>`;
}

function statusHtml(p) {
  const label = p.verified ? "AHE RESIDENT ARTISAN" : "PENDING ARTISAN";
  const gate  = p.id ? `Gate Pass ID: #AHE-${String(p.id).padStart(4, "0")}` : "";
  return `
    <div class="provider-status">
      <span class="provider-status__icon">🛡️</span>
      <span class="provider-status__label">${label}</span>
      <span class="provider-status__id">${gate}</span>
    </div>`;
}

function heroHtml(p) {
  const locParts = [];
  if (p.courtName) locParts.push(`Estate Resident: ${escapeHtml(p.courtName)}`);
  if (p.phase != null) locParts.push(`Phase ${p.phase}`);
  const cat = p.categoryLabel || "";

  const badges = [
    p.verified
      ? `<span class="badge badge--verified">AHE Verified</span>`
      : `<span class="badge badge--pending">Pending</span>`,
    p.isAvailable === false
      ? `<span class="badge badge--busy">Busy</span>`
      : "",
  ].join("");

  return `
    <div class="provider-hero">
      <div class="provider-hero__photo">${escapeHtml(initialsOf(p.name))}</div>
      <div class="provider-hero__info">
        <h1>${escapeHtml(p.name)}</h1>
        <div class="provider-hero__badges">${badges}</div>
        <p class="provider-hero__loc">
          <i class="fas fa-map-marker-alt"></i>
          <span>${locParts.join(" · ") || "Athi Highway Estate"}</span>
        </p>
        ${cat ? `<p class="provider-hero__cat"><i class="fas fa-tag"></i> ${escapeHtml(cat)}</p>` : ""}
      </div>
    </div>`;
}

function statsHtml(p) {
  const rating  = Number(p.rating || 0);
  const reviews = Number(p.reviews || 0);
  return `
    <div class="provider-stats">
      <div class="provider-stats__cell">
        <b><span class="pv-star">★</span> ${rating.toFixed(1)} <small>/ 5.0</small></b>
        <span>${reviews} review${reviews === 1 ? "" : "s"}</span>
      </div>
      <div class="provider-stats__cell">
        <b class="pv-price">${Number(p.priceFrom || 0) ? "KSh " + Number(p.priceFrom).toLocaleString() : "-"}</b>
        <span>Starting price${p.priceUnit ? " · " + escapeHtml(p.priceUnit) : ""}</span>
      </div>
    </div>`;
}

function chipsHtml(p) {
  const busy = p.isAvailable === false;
  const since = p.createdAt || p.created_at;
  const member = since
    ? `Member since ${new Date(since).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}`
    : "";
  return `
    <div class="provider-chips">
      <span class="chip-pill ${busy ? "chip-pill--busy" : "chip-pill--ok"}">
        ${busy ? "Currently Unavailable" : "Available Today"}
      </span>
      ${p.hours ? `<span class="chip-pill"><i class="far fa-clock"></i> ${escapeHtml(p.hours)}</span>` : ""}
      ${member ? `<span class="chip-pill">${escapeHtml(member)}</span>` : ""}
    </div>`;
}

function contactHtml(p) {
  if (!isLoggedIn()) {
    const next = encodeURIComponent("provider.html?id=" + p.id);
    return `
      <div class="provider-contact provider-contact--single">
        <a class="provider-contact__btn provider-contact__btn--call" href="login.html?next=${next}">
          <i class="fas fa-lock"></i> Log in to view contact details
        </a>
      </div>
      <p class="provider-contact__note">
        <i class="fas fa-info-circle"></i> Phone and WhatsApp are shown to logged-in residents
      </p>`;
  }

  const phone = String(p.phone || "").trim();
  const digits = phone.replace(/[^0-9]/g, "");
  const intl = digits.startsWith("0") ? "254" + digits.slice(1) : digits;
  if (!phone) return "";

  const wa = `https://wa.me/${intl}?text=${encodeURIComponent(
    `Hi ${p.name}, I found you on Athi Soko Connect and would like to book your service.`
  )}`;

  return `
    <div class="provider-contact">
      <a class="provider-contact__btn provider-contact__btn--call" href="tel:${escapeHtml(phone)}">
        <i class="fas fa-phone-alt"></i> Call Direct
      </a>
      <a class="provider-contact__btn provider-contact__btn--wa" href="${wa}" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp"></i> WhatsApp Chat
      </a>
    </div>
    <p class="provider-contact__note">
      <i class="fas fa-info-circle"></i> For quick inquiries - send a booking request below to reserve a date
    </p>`;
}

function aboutHtml(p) {
  const services = servicesArray(p.services);
  const showPhone = isLoggedIn();

  return `
    ${p.bio ? `
    <section class="provider-section">
      <h3 class="provider-section__title">
        <span class="provider-section__icon">⚡</span> About
      </h3>
      <p class="provider-section__body">${escapeHtml(p.bio)}</p>
    </section>` : ""}

    ${services.length ? `
    <section class="provider-section">
      <h4 class="provider-section__label">Services</h4>
      <div class="provider-specs">
        ${services.map((s) => `<span class="chip-pill">${escapeHtml(s)}</span>`).join("")}
      </div>
    </section>` : ""}

    <section class="provider-section">
      <h3 class="provider-section__title">
        <span class="provider-section__icon">📋</span> Details
      </h3>
      <ul class="pv-details">
        <li><span>Hours</span><span>${escapeHtml(p.hours || "-")}</span></li>
        <li><span>Starting price</span><span>${priceText(p)}</span></li>
        <li><span>Category</span><span>${escapeHtml(p.categoryLabel || "-")}</span></li>
        <li><span>Court</span><span>${escapeHtml(p.courtName || "-")}</span></li>
        <li><span>Phase</span><span>${p.phase != null ? "Phase " + p.phase : "-"}</span></li>
        <li>
          <span>Phone</span>
          <span>
            ${showPhone && p.phone
              ? `<a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a>`
              : `<span class="pv-muted">Log in to view</span>`}
          </span>
        </li>
      </ul>
    </section>`;
}

function reviewsHtml(reviews) {
  const list = reviews.length
    ? reviews.map((r) => `
        <div class="review">
          <div class="review-head">
            <b>${escapeHtml(reviewAuthor(r))}</b>
            <span>${formatDate(r.date || r.createdAt || r.created_at)}</span>
          </div>
          <div class="pv-review-stars">
            ${stars(r.rating)} <span>${Number(r.rating).toFixed(1)}</span>
          </div>
          ${r.text ? `<p class="pv-review-text">${escapeHtml(r.text)}</p>` : ""}
        </div>`).join("")
    : `<div class="empty-state" style="padding:20px;">No reviews yet.</div>`;

  return `
    <section class="provider-section">
      <h3 class="provider-section__title" id="reviews-heading">
        <span class="provider-section__icon">⭐</span>
        Reviews <span>(${reviews.length})</span>
      </h3>
      <div class="provider-reviews">${list}</div>
    </section>`;
}

function shareHtml(p) {
  return `
    <section class="provider-section pv-share">
      <h4 class="provider-section__label">Share with a neighbor</h4>
      <div class="pv-share__buttons">
        <button type="button" class="btn btn--accent btn--small" id="refer-provider">
          🔗 Refer this provider
        </button>
        <button type="button" class="btn btn--ghost btn--small" id="open-report">
          <i class="fas fa-exclamation-triangle"></i> Report this provider
        </button>
      </div>

      <div id="refer-panel" class="pv-refer" style="display:none;">
        <p>Help your neighbors find <b>${escapeHtml(p.name)}</b>:</p>
        <div class="pv-share__buttons">
          <button type="button" class="btn btn--primary btn--small" id="refer-copy">📋 Copy link</button>
          <button type="button" class="btn btn--ghost btn--small" id="refer-whatsapp">💬 Share on WhatsApp</button>
          <button type="button" class="btn btn--ghost btn--small" id="refer-close">Cancel</button>
        </div>
      </div>
    </section>`;
}

/* ============================================================
   BOOKING CARD
   ============================================================ */
function bookingFormHtml(p) {
  if (!isLoggedIn()) {
    const next = encodeURIComponent("provider.html?id=" + p.id);
    return `
      <div class="booking-box" id="booking-box">
        <h3>Request a booking</h3>
        <p>Please log in as a resident to send a booking request.</p>
        <a class="btn btn--primary" href="login.html?next=${next}">Log in to book</a>
      </div>`;
  }

  if (p.isAvailable === false) {
    let backMessage;
    if (p.unavailableUntil) {
      const t = formatTimeUntil(p.unavailableUntil);
      backMessage = (t && t.backTime)
        ? `Expected back around <b>${t.backTime}</b> (${t.relative}). You can try booking again after that.`
        : "Back any moment.";
    } else {
      backMessage = "The vendor is currently not accepting new bookings. Check back later.";
    }

    return `
      <div class="booking-box booking-box--busy" id="booking-box">
        <div class="pv-busy-icon">⏸️</div>
        <h3>Currently unavailable</h3>
        <p class="busy-countdown" data-until="${p.unavailableUntil || ""}">${backMessage}</p>
        <button class="btn" disabled style="width:100%;">Booking disabled</button>
        <p class="pv-busy-links">
          You can still browse their <a href="#reviews-heading">reviews</a>
          or explore other providers on the <a href="index.html">Discover page</a>.
        </p>
      </div>`;
  }

  const user  = getCurrentUser() || {};
  const name  = user.name  || "";
  const phone = user.phone || "";

  return `
    <div class="booking-box" id="booking-box">
      <h3>Request a booking</h3>
      <p>Send a request to ${escapeHtml(p.name)}. They'll confirm shortly.</p>

      <form id="booking-form">
        <div class="field">
          <label for="bf-name">Your name</label>
          <input id="bf-name" type="text" required value="${escapeHtml(name)}" />
        </div>

        <div class="field">
          <label for="bf-phone">Your phone</label>
          <input id="bf-phone" type="tel" required
                 value="${escapeHtml(phone)}" placeholder="+2547…" />
        </div>

        <div class="field">
          <label for="bf-date">Date</label>
          <input id="bf-date" type="date" required value="${todayPlusDays(1)}" />
        </div>

        <div class="field">
          <label for="bf-service">What do you need?</label>
          <input id="bf-service" type="text" required
                 placeholder="e.g. 2 bags of laundry, pickup" />
        </div>

        <div class="field">
          <label for="bf-notes">
            Notes <span class="pv-muted">(optional)</span>
          </label>
          <textarea id="bf-notes" rows="3" placeholder="Any details the provider should know"></textarea>
        </div>

        <button type="submit" class="btn btn--accent" style="width:100%;">
          Request booking
        </button>

        <p id="booking-msg" class="pv-msg" style="display:none;"></p>
      </form>
    </div>`;
}

function ctaHtml(p) {
  const busy = p.isAvailable === false;
  const price = Number(p.priceFrom || 0);
  const note = busy
    ? "Currently unavailable"
    : price
      ? `Standard callout from KSh ${price.toLocaleString()} ${escapeHtml(p.priceUnit || "")}`
      : "Tap to send a booking request";

  return `
    <div class="provider-cta">
      <button type="button" class="btn btn--accent provider-cta__btn" id="pd-book" ${busy ? "disabled" : ""}>
        <span><i class="fas fa-calendar-check"></i> Book Service Request</span>
        <small>${note}</small>
      </button>
      <button type="button" class="provider-cta__share" aria-label="Share this provider">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>`;
}

/* ---------------- booking success ---------------- */
function renderBookingSuccess(p) {
  const box = document.getElementById("booking-box");
  if (!box) return;

  box.innerHTML = `
    <h3>Request sent ✓</h3>
    <p>
      Your request has been sent to <b>${escapeHtml(p.name)}</b>.
      They'll confirm shortly. Track it from your bookings page.
    </p>
    <div class="pv-share__buttons">
      <a class="btn btn--primary" href="dashboard.html">View my bookings</a>
      <button type="button" class="btn btn--ghost" id="book-again">Book another</button>
    </div>`;

  document.getElementById("book-again").addEventListener("click", () => {
    box.outerHTML = bookingFormHtml(p);
    wireBookingForm(p);
  });
}

/* ---------------- wire booking form (single definition) ---------------- */
function wireBookingForm(p) {
  const form = document.getElementById("booking-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = document.getElementById("booking-msg");
    const btn = form.querySelector("button[type=submit]");

    const name    = document.getElementById("bf-name").value.trim();
    const phone   = document.getElementById("bf-phone").value.trim();
    const date    = document.getElementById("bf-date").value;
    const service = document.getElementById("bf-service").value.trim();
    const notes   = document.getElementById("bf-notes").value.trim();

    if (!name || !phone || !date || !service) {
      msg.textContent = "Please fill in your name, phone, date, and what you need.";
      msg.style.color = "var(--clay)";
      msg.style.display = "block";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";
    msg.style.display = "none";

    try {
      await Api.addBooking({
        providerId:    p.id,
        service,
        date,
        notes,
        residentName:  name,
        residentPhone: phone,
      });
      renderBookingSuccess(p);
    } catch (err) {
      console.error("[provider] booking failed:", err);
      msg.textContent = err.message || "Could not send booking. Please try again.";
      msg.style.color = "var(--clay)";
      msg.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Request booking";
    }
  });
}

/* ---------------- wire sticky CTA ---------------- */
function wireStickyCta(p) {
  const bookBtn = document.getElementById("pd-book");
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      const box = document.getElementById("booking-box");
      if (!box) return;
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      const first = box.querySelector("input, textarea, a.btn");
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 400);
    });
  }

  const shareBtn = document.querySelector(".provider-cta__share");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}?id=${p.id}`;
      const text =
        `Check out ${p.name} on Athi Soko Connect - ` +
        `${p.categoryLabel || "a service provider"} in Phase ${p.phase || "?"}. ` +
        `Book them here: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: p.name, text, url });
          return;
        } catch { /* fall through */ }
      }
      const panel = document.getElementById("refer-panel");
      if (panel) {
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}

/* ---------------- wire report modal ---------------- */
function wireReportModal(provider) {
  const openBtn = document.getElementById("open-report");
  const modal   = document.getElementById("report-modal");
  const cancel  = document.getElementById("report-cancel");
  const form    = document.getElementById("report-form");

  if (!openBtn || !modal || !cancel || !form) return;

  openBtn.addEventListener("click", () => modal.classList.add("is-open"));
  cancel.addEventListener("click",   () => modal.classList.remove("is-open"));
  modal.addEventListener("click",    (e) => {
    if (e.target === modal) modal.classList.remove("is-open");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const reason  = document.getElementById("report-reason").value;
    const details = document.getElementById("report-details").value.trim();
    if (!details) return;

    try {
      await Api.addReport({ providerId: provider.id, reason, details });
      modal.classList.remove("is-open");
      form.reset();
      toast("✅ Report submitted. The estate admin will review it.");
    } catch (err) {
      console.error("[provider] report failed:", err);
      toast(err.message || "Could not submit report.");
    }
  });
}

/* ---------------- wire refer panel ---------------- */
function wireReferPanel(provider) {
  const referBtn    = document.getElementById("refer-provider");
  const panel       = document.getElementById("refer-panel");
  const copyBtn     = document.getElementById("refer-copy");
  const whatsappBtn = document.getElementById("refer-whatsapp");
  const closeBtn    = document.getElementById("refer-close");

  if (!referBtn || !panel || !copyBtn || !whatsappBtn || !closeBtn) return;

  const providerUrl = `${window.location.origin}${window.location.pathname}?id=${provider.id}`;
  const shareMessage =
    `Check out ${provider.name} on Athi Soko Connect - ` +
    `${provider.categoryLabel || "a service provider"} in Phase ${provider.phase || "?"}. ` +
    `Book them here: ${providerUrl}`;

  referBtn.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(providerUrl);
      toast("Link copied! Share it with your neighbors.");
      panel.style.display = "none";
    } catch (err) {
      const tempInput = document.createElement("input");
      tempInput.value = providerUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand("copy");
        toast("Link copied!");
      } catch {
        alert("Could not copy. Here is the link:\n\n" + providerUrl);
      }
      document.body.removeChild(tempInput);
      panel.style.display = "none";
    }
  });

  whatsappBtn.addEventListener("click", () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
    panel.style.display = "none";
  });

  closeBtn.addEventListener("click", () => {
    panel.style.display = "none";
  });
}

/* ---------------- live busy ticker (30s, text-only refresh) ---------------- */
function startBusyTicker(p) {
  if (p.isAvailable !== false || !p.unavailableUntil) return;

  setInterval(() => {
    document.querySelectorAll(".busy-countdown").forEach((el) => {
      const until = el.dataset.until;
      if (!until) return;

      const t = formatTimeUntil(until);
      if (!t || !t.backTime) return;

      if (el.tagName === "P") {
        el.innerHTML = `Expected back around <b>${t.backTime}</b> (${t.relative}). You can try booking again after that.`;
      } else {
        el.textContent = `Expected back around ${t.backTime} (${t.relative}).`;
      }
    });
  }, 30000);
}

/* ============================================================
   LIVE AVAILABILITY — auto-flip at the exact moment
   ============================================================ */

const _pvAvailability = {
  isAvailable: true,
  unavailableUntil: null,
  timerId: null,
};

function startAvailabilityTicker(provider) {
  if (_pvAvailability.timerId) {
    clearInterval(_pvAvailability.timerId);
    _pvAvailability.timerId = null;
  }

  _pvAvailability.isAvailable     = provider.isAvailable !== false;
  _pvAvailability.unavailableUntil = provider.unavailableUntil || null;

  if (_pvAvailability.isAvailable || !_pvAvailability.unavailableUntil) return;

  _pvAvailability.timerId = setInterval(() => {
    const remaining = new Date(_pvAvailability.unavailableUntil) - new Date();

    if (remaining <= 0) {
      clearInterval(_pvAvailability.timerId);
      _pvAvailability.timerId = null;
      _pvAvailability.isAvailable = true;
      _pvAvailability.unavailableUntil = null;
      refreshProviderAvailability();
    } else {
      updateBusyCountdown(remaining);
    }
  }, 1000);
}

function updateBusyCountdown(ms) {
  const el = document.querySelector(".busy-countdown");
  if (!el) return;

  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);

  let text;
  if (mins >= 1)      text = `Back in ${mins}m ${secs}s`;
  else if (secs > 0)  text = `Back in ${secs}s`;
  else                text = "Back any moment";

  el.textContent = text;
}

async function refreshProviderAvailability() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  try {
    const fresh = await Api.getProvider(id);
    if (fresh.isAvailable === false) {
      startAvailabilityTicker(fresh);
    } else {
      applyAvailableUI(fresh);
    }
  } catch (err) {
    console.warn("[provider] availability refresh failed:", err);
    applyAvailableUI(null);
  }
}

function applyAvailableUI(provider) {
  // 1. Remove the out-of-office banner
  const banner = document.querySelector(".pv-banner");
  if (banner) banner.remove();

  // 2. Un-disable the sticky CTA and restore its real markup
  const bookBtn = document.querySelector(".provider-cta__btn");
  if (bookBtn) {
    bookBtn.disabled = false;
    const price = provider ? Number(provider.priceFrom || 0) : 0;
    const unit  = provider ? escapeHtml(provider.priceUnit || "") : "";
    const note  = price
      ? `Standard callout from KSh ${price.toLocaleString()} ${unit}`
      : "Tap to send a booking request";
    bookBtn.innerHTML = `
      <span><i class="fas fa-calendar-check"></i> Book Service Request</span>
      <small>${note}</small>`;
  }

  // 3. Status chip
  const statusChip = document.querySelector(".chip-pill--busy");
  if (statusChip) {
    statusChip.classList.remove("chip-pill--busy");
    statusChip.classList.add("chip-pill--ok");
    statusChip.textContent = "Available Today";
  }

  // 4. Hero badge
  const busyBadge = document.querySelector(".badge--busy");
  if (busyBadge) {
    busyBadge.classList.remove("badge--busy");
    busyBadge.classList.add("badge--verified");
    busyBadge.textContent = "AHE Verified";
  }

  // 5. Replace the "Currently unavailable" panel with the real booking form
  const busyPanel = document.querySelector(".booking-box--busy");
  if (busyPanel && provider) {
    busyPanel.outerHTML = bookingFormHtml(provider);
    wireBookingForm(provider);
  }
}

/* ============================================================
   GATE CLEARANCE PILL
   ============================================================ */
async function renderGatePill() {
  const pill = document.getElementById("gate-clearance-pill");
  if (!pill) return;

  const data = await Api.getGateStatus();

  if (!data || !data.status) {
    const nowEAT = new Date(new Date().toLocaleString("en-US", {
      timeZone: "Africa/Nairobi",
    }));
    const h = nowEAT.getHours();
    if (h >= 6 && h < 22) {
      pill.className = "pill pill--interactive pill--live";
      pill.textContent = "Gate: Live";
    } else {
      pill.className = "pill pill--interactive pill--closed";
      pill.textContent = "Gate 2 Closed";
    }
    return;
  }

  const map = { live: "pill--live", busy: "pill--busy", closed: "pill--closed" };
  pill.className = `pill pill--interactive ${map[data.status] || "pill--live"}`;
  pill.textContent = data.label;

  let tooltip;
  switch (data.status) {
    case "live":
      tooltip = `Gate 2 open. Closes in ${data.nextChangeMinutes} min (22:00 EAT). Gate 1 open 24/7.`;
      break;
    case "busy":
      tooltip = `Gate 2 closing in ${data.nextChangeMinutes} min. Gate 1 remains open.`;
      break;
    case "closed":
      tooltip = `Gate 2 reopens in ${data.nextChangeMinutes} min (06:00 EAT). Gate 1 open 24/7.`;
      break;
    default:
      tooltip = "Gate status unavailable";
  }
  pill.title = tooltip;

  if (data.nextChangeMinutes != null && data.nextChangeMinutes > 0) {
    const msUntilChange = data.nextChangeMinutes * 60 * 1000;
    const delay = Math.min(msUntilChange + 5000, 60000);
    clearTimeout(renderGatePill._timer);
    renderGatePill._timer = setTimeout(renderGatePill, delay);
  }
}

/* ============================================================
   GATE RULES MODAL
   ============================================================ */
function setupGateRulesModalOnProviderPage() {
  const modal = document.getElementById("gate-rules-modal");
  if (!modal) return;

  const triggers      = document.querySelectorAll('[data-open="gate-rules"]');
  const closeButtons  = modal.querySelectorAll("[data-close-modal]");

  const open = (e) => {
    if (e) e.preventDefault();
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  triggers.forEach((t) => t.addEventListener("click", open));
  closeButtons.forEach((b) => b.addEventListener("click", close));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

/* ============================================================
   MAIN
   ============================================================ */
async function initProviderPage() {
  const root = document.getElementById("provider-root");
  if (!root) return;

  const id = getProviderId();
  if (!id) return renderError("No provider specified.");

  renderLoading();

  let provider, reviews;
  try {
    [provider, reviews] = await Promise.all([
      Api.getProvider(id),
      Api.getReviews(id).catch(() => []),
    ]);
  } catch (err) {
    console.error("[provider] load failed:", err);
    return renderError("Could not load this provider.");
  }

  if (!provider) return renderError("Provider not found.");

  root.innerHTML = `
    ${topbarHtml(provider)}
    ${bannerHtml(provider)}
    <div class="pv-layout">
      <div class="pv-col pv-col--main">
        ${statusHtml(provider)}
        ${heroHtml(provider)}
        ${statsHtml(provider)}
        ${chipsHtml(provider)}
        ${contactHtml(provider)}
        ${aboutHtml(provider)}
      </div>
      <aside class="pv-col pv-col--side">
        ${bookingFormHtml(provider)}
        ${reviewsHtml(reviews || [])}
        ${shareHtml(provider)}
      </aside>
    </div>
    ${ctaHtml(provider)}`;

  /* Wire everything */
  wireBookingForm(provider);
  wireReportModal(provider);
  wireReferPanel(provider);
  wireStickyCta(provider);
  startBusyTicker(provider);
  startAvailabilityTicker(provider);          // ← NOW CALLED
  renderGatePill();                            // ← NOW CALLED
  setupGateRulesModalOnProviderPage();         // ← NOW CALLED
}

document.addEventListener("DOMContentLoaded", initProviderPage);