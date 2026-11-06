/* ============================================================
   provider-dashboard.js - vendor view of incoming bookings
   Fetch all at once, group by status, per-section Load More
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

function formatDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "-"; }
}

function formatTime(t) {
  if (!t) return "";
  try {
    const [hours, minutes] = t.split(':');
    const d = new Date();
    d.setHours(hours, minutes);
    return d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  } catch { return t; }
}

function statusBadge(status) {
  const map = {
    requested:   "badge--requested",
    confirmed:   "badge--confirmed",
    in_progress: "badge--info",
    completed:   "badge--completed",
    cancelled:   "badge--declined",
  };
  const cls = map[status] || "badge--requested";
  return `<span class="badge ${cls}">${escapeHtml(status.replace('_', ' '))}</span>`;
}

function getUser() {
  try { return JSON.parse(localStorage.getItem("asc_user") || "null"); }
  catch { return null; }
}

/* ------------------------------------------------------------
   Global state - fetched once, sliced client-side
   ------------------------------------------------------------ */
const SECTION_LIMIT = 2;

let allBookings = [];
const shownCount = {
  requested:   SECTION_LIMIT,
  confirmed:   SECTION_LIMIT,
  in_progress: SECTION_LIMIT,
  completed:   SECTION_LIMIT,
  cancelled:   SECTION_LIMIT,
};

/* ---------------- booking card ---------------- */
function bookingCard(b, variant) {
  const actions = [];

  if (variant === "new") {
    // Just Accept/Decline. No duration yet.
    actions.push(`<button class="btn btn--accent btn--small" data-confirm="${b.id}">Accept Order</button>`);
    actions.push(`<button class="btn btn--danger btn--small" data-decline="${b.id}">Decline</button>`);
    
  } else if (variant === "confirmed") {
    // Just Start/Cancel. No duration yet.
    actions.push(`<button class="btn btn--accent btn--small" data-start="${b.id}">Start Work</button>`);
    actions.push(`<button class="btn btn--ghost btn--small" data-decline="${b.id}">Cancel</button>`);
    
  } else if (variant === "in-progress") {
    // NOW we show the duration dropdown because work has started
    const currentDuration = b.durationMinutes || 60;
    actions.push(`
      <div style="display:flex; align-items:center; gap:8px; margin-right:auto;">
        <label style="font-size:0.8rem; font-weight:600;">Est. Time:</label>
        <select id="duration-${b.id}" class="input" style="padding:6px; border-radius:6px; font-size:0.85rem;">
          <option value="30" ${currentDuration == 30 ? 'selected' : ''}>30 mins</option>
          <option value="60" ${currentDuration == 60 ? 'selected' : ''}>1 hour</option>
          <option value="90" ${currentDuration == 90 ? 'selected' : ''}>1.5 hours</option>
          <option value="120" ${currentDuration == 120 ? 'selected' : ''}>2 hours</option>
          <option value="180" ${currentDuration == 180 ? 'selected' : ''}>3 hours</option>
          <option value="240" ${currentDuration == 240 ? 'selected' : ''}>4 hours</option>
        </select>
        <button class="btn btn--ghost btn--small" data-update-duration="${b.id}">Save</button>
      </div>
    `);
    actions.push(`<button class="btn btn--accent btn--small" data-complete="${b.id}">Mark Completed</button>`);
    actions.push(`<button class="btn btn--ghost btn--small" data-decline="${b.id}">Cancel</button>`);
  }

  let starsHtml = "";
  if (b.rating) {
    starsHtml = `<li><span>Rating</span><span style="color:#d4af37;">${"★".repeat(b.rating)}${"☆".repeat(5 - b.rating)}</span></li>`;
  }

  let reasonHtml = "";
  if (b.status === "cancelled" && b.cancellationReason) {
    reasonHtml = `<li><span>Reason</span><span style="color:var(--clay);">${escapeHtml(b.cancellationReason)}</span></li>`;
  }

  // Show duration in the details if it exists
  const durationText = b.durationMinutes ? ` (${b.durationMinutes} mins)` : "";

  return `
    <div class="card" id="booking-${b.id}" style="margin-bottom:12px;">
      <div class="card-top">
        <div>
          <h3 style="margin:0 0 4px;">Booking #${b.id}</h3>
          <div class="meta">
            <b>${escapeHtml(b.residentName || "Unknown resident")}</b>
            ${b.residentPhone ? ` · ${escapeHtml(b.residentPhone)}` : ""}
          </div>
        </div>
        <div>${statusBadge(b.status)}</div>
      </div>

      <ul class="info-list" style="margin:6px 0 12px;">
        <li><span>Service</span><span>${escapeHtml(b.service || "-")}</span></li>
        <li><span>Date & Time</span><span>${formatDate(b.date)} ${b.time ? `at ${formatTime(b.time)}` : ""}${durationText}</span></li>
        ${b.notes ? `<li><span>Notes</span><span>${escapeHtml(b.notes)}</span></li>` : ""}
        <li><span>Requested</span><span>${formatDate(b.createdAt)}</span></li>
        ${starsHtml}
        ${reasonHtml}
      </ul>

      <div class="row-actions">${actions.join("")}</div>
    </div>`;
}

/* ------------------------------------------------------------
   Render a single section
   ------------------------------------------------------------ */
function sectionHtml(sectionKey, backendStatus, title, variant) {
  const items = allBookings.filter((b) => b.status === backendStatus);
  const total = items.length;
  if (total === 0) return "";

  const shown = Math.min(shownCount[sectionKey], total);
  const visible = items.slice(0, shown);
  const hasMore = shown < total;
  const remaining = total - shown;

  const footer = hasMore
    ? `<button class="btn btn--ghost btn--small" data-load-more="${sectionKey}"
               style="display:block; margin:12px auto 24px; min-height:44px; padding:10px 24px;">
         Load more (${remaining} remaining)
       </button>`
    : "";

  return `
    <h2 style="margin-top:32px;">
      ${title}
      <span style="color:var(--ink-40);font-size:1rem;">(${total})</span>
    </h2>
    ${visible.map((b) => bookingCard(b, variant)).join("")}
    ${footer}`;
}

/* ------------------------------------------------------------
   Render everything from state (no fetch)
   ------------------------------------------------------------ */
function renderSections() {
  const el = document.getElementById("provider-bookings");

  const hasAny = allBookings.length > 0;

  if (!hasAny) {
    el.innerHTML = `<div class="empty-state">
      No bookings yet. When residents request your services, they'll appear here.
    </div>`;
    return;
  }

  el.innerHTML = `
    ${sectionHtml("requested",   "requested",   "New Requests",               "new")}
    ${sectionHtml("confirmed",   "confirmed",   "Confirmed (Ready to Start)",  "confirmed")}
    ${sectionHtml("in_progress", "in_progress", "In Progress",                 "in-progress")}
    ${sectionHtml("completed",   "completed",   "Completed",                   "done")}
    ${sectionHtml("cancelled",   "cancelled",   "Cancelled",                   "done")}
  `;

  wireActions();
}

/* ------------------------------------------------------------
   Fetch all bookings once
   ------------------------------------------------------------ */
async function loadBookings() {
  const el = document.getElementById("provider-bookings");
  el.innerHTML = `<div class="empty-state">Loading bookings…</div>`;

  try {
    const result = await Api.getBookings();
    allBookings = Array.isArray(result) ? result : (result.data || []);
  } catch (err) {
    console.error("[provider-dashboard] load failed:", err);
    el.innerHTML = `<div class="empty-state">Could not load bookings.</div>`;
    return;
  }

  Object.keys(shownCount).forEach((k) => shownCount[k] = SECTION_LIMIT);

  renderSections();
  renderCalendar(); 
}

/* ------------------------------------------------------------
   Wire all buttons
   ------------------------------------------------------------ */
function wireActions() {
  const el = document.getElementById("provider-bookings");

  el.querySelectorAll("[data-confirm]").forEach((btn) =>
    btn.addEventListener("click", () => updateStatus(btn.dataset.confirm, "confirmed"))
  );

  el.querySelectorAll("[data-start]").forEach((btn) =>
    btn.addEventListener("click", () => updateStatus(btn.dataset.start, "in_progress"))
  );

  el.querySelectorAll("[data-complete]").forEach((btn) =>
    btn.addEventListener("click", () => updateStatus(btn.dataset.complete, "completed"))
  );

  el.querySelectorAll("[data-decline]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const reason = prompt("Please provide a reason for declining/cancelling this booking:");
      if (reason !== null && reason.trim() !== "") {
        updateStatus(btn.dataset.decline, "cancelled", reason);
      } else if (reason !== null) {
        alert("A reason is required to cancel or decline a booking.");
      }
    })
  );

  // UPDATED: Save Duration button listener with forced alerts for debugging
  el.querySelectorAll("[data-update-duration]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const bookingId = btn.dataset.updateDuration;
      const durationSelect = document.getElementById(`duration-${bookingId}`);
      const newDuration = parseInt(durationSelect.value, 10);
      
      const originalText = btn.textContent;
      btn.textContent = "Saving...";

      try {
        // Pass null for status/reason to ONLY update the duration
        await updateStatus(bookingId, null, null, newDuration); 
        // FORCE ALERT TO SHOW SUCCESS
        alert("✅ Success! Time saved.");
      } catch (err) {
        // FORCE ALERT TO SHOW ERROR
        alert("❌ Failed to save!\n\nError: " + (err.message || err));
      } finally {
        btn.textContent = originalText;
      }
    })
  );

  // Per-section Load more
  el.querySelectorAll("[data-load-more]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const sectionKey = btn.dataset.loadMore;
      shownCount[sectionKey] += SECTION_LIMIT;
      renderSections(); 
    })
  );
}

/* ------------------------------------------------------------
   Status update - reload all from server
   ------------------------------------------------------------ */
async function updateStatus(id, status, reason = null, durationMinutes = null) {
  try {
    const payload = {};
    if (status) payload.status = status;
    if (reason) payload.cancellationReason = reason;
    if (durationMinutes) payload.durationMinutes = durationMinutes;

    // This will throw an error if the API returns 4xx or 5xx, 
    // which is caught by the button click handler above.
    await Api.updateBooking(id, payload);
    
    // Only reload if it didn't throw
    await loadBookings(); 
  } catch (err) {
    console.error("[provider-dashboard] update failed:", err);
    // Re-throw the error so the button's catch block catches it and shows the alert
    throw err; 
  }
}

/* ============================================================
   CALENDAR LOGIC
   ============================================================ */
let currentCalDate = new Date();

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("cal-month-title");
  if (!grid || !title) return;

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  title.textContent = currentCalDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = daysOfWeek.map(d => `<div class="cal-header">${d}</div>`).join("");

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day is-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayBookings = allBookings.filter(b => {
        const bDate = b.date ? b.date.split('T')[0] : '';
        return bDate === dateStr && ['requested', 'confirmed', 'in_progress'].includes(b.status);
    });

    let bookingsHtml = dayBookings.map(b => {
      const isPending = b.status === 'requested';
      const durStr = b.durationMinutes ? ` (${b.durationMinutes}m)` : "";
      
      return `<div class="cal-booking ${isPending ? 'is-pending' : ''}" title="${b.residentName}: ${b.service} at ${b.time}${durStr}">
                <a href="javascript:void(0)" class="cal-booking-link" data-booking-id="${b.id}" style="text-decoration:none; color:inherit; display:block; width:100%;">
                  ${b.time} - ${b.service}${durStr}
                </a>
              </div>`;
    }).join("");

    html += `
      <div class="cal-day ${isToday ? 'is-today' : ''}">
        <div class="cal-date-num">${day}</div>
        ${bookingsHtml}
      </div>
    `;
  }

  grid.innerHTML = html;
}

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user || user.role !== "vendor") {
    window.location.href = "login.html?next=%2Fprovider-dashboard.html";
    return;
  }

  if (user.name) {
    document.getElementById("page-title").textContent =
      `Incoming bookings - ${user.name}`;
  }

  const prevBtn = document.getElementById("cal-prev");
  const nextBtn = document.getElementById("cal-next");

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      currentCalDate.setMonth(currentCalDate.getMonth() - 1);
      renderCalendar();
    });
    nextBtn.addEventListener("click", () => {
      currentCalDate.setMonth(currentCalDate.getMonth() + 1);
      renderCalendar();
    });
  }

  await loadBookings();

  // ============================================
  // Handle Calendar Event Clicks
  // ============================================
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest(".cal-booking-link");
    if (!link) return;

    e.preventDefault();
    const bookingId = link.dataset.bookingId;

    // Function to find the booking card and scroll to it
    const findAndScrollToBooking = () => {
      let targetCard = document.getElementById(`booking-${bookingId}`);

      if (!targetCard) {
        const headings = document.querySelectorAll('.card h3');
        for (const h of headings) {
          if (h.textContent.includes(`#${bookingId}`)) {
            targetCard = h.closest('.card');
            break;
          }
        }
      }

      if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        
        targetCard.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
        targetCard.style.border = "2px solid #c8862a";
        targetCard.style.boxShadow = "0 0 15px rgba(200, 134, 42, 0.4)";

        setTimeout(() => {
          targetCard.style.border = ""; 
          targetCard.style.boxShadow = ""; 
        }, 2000);

        return true;
      }
      return false;
    };

    let found = findAndScrollToBooking();

    if (!found) {
      const loadMoreBtns = document.querySelectorAll("[data-load-more]");
      if (loadMoreBtns.length > 0) {
        loadMoreBtns.forEach(btn => btn.click());
        setTimeout(() => {
          findAndScrollToBooking();
        }, 300);
      }
    }
  });
});