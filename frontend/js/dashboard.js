/* ============================================================
   dashboard.js - resident's booking list + review flow
   ============================================================ */
let reviewTargetBooking = null;

function formatTime(t) {
  if (!t) return "";
  try {
    const [hours, minutes] = t.split(':');
    const d = new Date();
    d.setHours(hours, minutes);
    return d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  } catch { return t; }
}

function safeFormatDate(dateStr) {
  if (typeof formatDate === "function") return formatDate(dateStr);
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-KE", { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

const BOOKINGS_PER_PAGE = 10;
const bookingsState = { page: 1, limit: BOOKINGS_PER_PAGE, total: 0, totalPages: 1 };

function getStatusBadge(status) {
  const badges = {
    'requested':   '<span class="badge" style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px;">Requested</span>',
    'confirmed':   '<span class="badge" style="background:#3498db; color:white; padding:4px 8px; border-radius:4px;">Confirmed</span>',
    'in_progress': '<span class="badge" style="background:#9b59b6; color:white; padding:4px 8px; border-radius:4px;">In Progress</span>',
    'completed':   '<span class="badge" style="background:#27ae60; color:white; padding:4px 8px; border-radius:4px;">Completed</span>',
    'cancelled':   '<span class="badge" style="background:#e74c3c; color:white; padding:4px 8px; border-radius:4px;">Cancelled</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

async function renderBookings() {
  const list = document.getElementById("booking-list");
  if (!list) return;
  
  list.innerHTML = `<div class="empty-state">Loading bookings…</div>`;

  let result;
  try {
    result = await Api.getBookings({ page: bookingsState.page, limit: bookingsState.limit });
  } catch (err) {
    console.error("Fetch error:", err);
    list.innerHTML = `<div class="empty-state">Couldn't reach the server.</div>`;
    return;
  }

  const bookings = Array.isArray(result) ? result : (result.data || []);
  bookingsState.total      = result.total      ?? bookings.length;
  bookingsState.page       = result.page       ?? 1;
  bookingsState.limit      = result.limit      ?? BOOKINGS_PER_PAGE;
  bookingsState.totalPages = result.totalPages ?? 1;

  if (!bookings.length) {
    list.innerHTML = `<div class="empty-state">No bookings yet. <a href="index.html">Find a provider</a> to get started.</div>`;
    return;
  }

  list.innerHTML = `
    <div class="table-wrap" style="display: flex; flex-direction: column; gap: 20px;">
      ${bookings.map(b => bookingCard(b)).join("")}
    </div>
    ${bookingsPaginationHtml()}
  `;

  wireBookingsPagination();
  wireProviderActionButtons(bookings);
}

function bookingCard(b) {
  const bookingId = b.id || b._id;
  let actionButtons = "";

  if (b.status === "requested" || b.status === "confirmed") {
    actionButtons = `
      <button class="btn btn--accent btn--small" data-action="start" data-id="${bookingId}">Start Work</button>
      <button class="btn btn--ghost btn--small" data-action="cancel" data-id="${bookingId}">Cancel</button>
    `;
  } else if (b.status === "in_progress") {
    actionButtons = `
      <button class="btn btn--accent btn--small" data-action="complete" data-id="${bookingId}">Mark Completed</button>
      <button class="btn btn--ghost btn--small" data-action="cancel" data-id="${bookingId}">Cancel</button>
    `;
  } else if (b.status === "completed" && !b.reviewed) {
    actionButtons = `<button class="btn btn--accent btn--small" data-review="${bookingId}">Leave a review</button>`;
  } else if (b.reviewed) {
    actionButtons = `<span class="meta">Reviewed</span>`;
  } else if (b.status === "cancelled") {
    actionButtons = `<span class="meta" style="color:#e74c3c;">Cancelled</span>`;
  }

  const showEstTime = (b.status === "requested" || b.status === "confirmed" || b.status === "in_progress");
  const currentDur = b.durationMinutes || 60; 
  
  const estTimeHtml = showEstTime ? `
    <div style="display:flex; align-items:center; gap:8px; margin-top:12px;">
      <label style="font-size:0.85em; font-weight:600;">Est. Time:</label>
      <select id="est-time-${bookingId}" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
        <option value="30" ${currentDur == 30 ? "selected" : ""}>30 mins</option>
        <option value="60" ${currentDur == 60 ? "selected" : ""}>1 hour</option>
        <option value="90" ${currentDur == 90 ? "selected" : ""}>1.5 hours</option>
        <option value="120" ${currentDur == 120 ? "selected" : ""}>2 hours</option>
        <option value="180" ${currentDur == 180 ? "selected" : ""}>3 hours</option>
      </select>
      <button class="btn btn--ghost btn--small" data-action="save-time" data-id="${bookingId}">Save</button>
    </div>
  ` : "";

  let reasonHtml = "";
  if (b.status === "cancelled" && b.cancellationReason) {
    reasonHtml = `<div class="meta" style="color:var(--clay); font-size:0.85em; margin-top:4px;">Reason: ${b.cancellationReason}</div>`;
  }

  return `
    <div class="card" id="booking-${bookingId}" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #fff;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 4px 0; font-size: 1.1em;">Booking #${bookingId}</h3>
          <div style="font-size: 0.9em; color: #555;">
            <b>${b.providerName || 'Resident'}</b> • ${b.providerPhone || b.phone || '+254...'}
          </div>
        </div>
        <div>${getStatusBadge(b.status)}</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 12px;">
        <div style="color: #666;">Service</div>
        <div style="text-align: right;"><b>${b.service}</b></div>
        
        <div style="color: #666;">Date & Time</div>
        <div style="text-align: right;"><b>${safeFormatDate(b.date)} ${b.time ? `at ${formatTime(b.time)}` : ""} ${b.durationMinutes ? `(${b.durationMinutes} mins)` : ""}</b></div>
        
        <div style="color: #666;">Notes</div>
        <div style="text-align: right;">${b.notes || '-'}</div>
        
        <div style="color: #666;">Requested</div>
        <div style="text-align: right;">${safeFormatDate(b.createdAt || b.date)}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px;">
        <div>
          ${estTimeHtml}
          ${reasonHtml}
        </div>
        <div style="display: flex; gap: 8px;">
          ${actionButtons}
        </div>
      </div>
    </div>
  `;
}

function bookingsPaginationHtml() {
  const { page, limit, total, totalPages } = bookingsState;
  if (totalPages <= 1) return "";

  const startRow = ((page - 1) * limit) + 1;
  const endRow   = Math.min(page * limit, total);
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= totalPages ? "disabled" : "";

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px;padding:12px 4px;border-top:1px solid var(--line);">
      <div style="font-size:0.9rem;color:var(--ink-70);">Showing <b>${startRow}-${endRow}</b> of <b>${total}</b></div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn--ghost btn--small" data-bookings-page="prev" ${prevDisabled}>« Prev</button>
        <span style="font-size:0.9rem;color:var(--ink-70);padding:0 4px;">Page <b>${page}</b> of <b>${totalPages}</b></span>
        <button class="btn btn--ghost btn--small" data-bookings-page="next" ${nextDisabled}>Next »</button>
      </div>
    </div>
  `;
}

function wireBookingsPagination() {
  document.querySelectorAll("[data-bookings-page]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dir = btn.dataset.bookingsPage;
      if (dir === "prev" && bookingsState.page > 1) bookingsState.page--;
      else if (dir === "next" && bookingsState.page < bookingsState.totalPages) bookingsState.page++;
      else return;
      await renderBookings();
    });
  });
}

function wireProviderActionButtons(bookings) {
  const list = document.getElementById("booking-list");

  list.querySelectorAll("[data-review]").forEach((btn) =>
    btn.addEventListener("click", () => openReview(btn.dataset.review, bookings))
  );

  list.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "save-time") {
        const selectEl = document.getElementById(`est-time-${id}`);
        const newDuration = parseInt(selectEl.value, 10); 
        
        btn.textContent = "Saving...";
        try {
          // Send the request
          await Api.updateBooking(id, { durationMinutes: newDuration });
          
          // Force an alert so we know it worked
          alert("✅ Success! Estimated time saved to database.");
          
          await renderBookings(); 
        } catch (err) {
          console.error("Save time error:", err);
          
          // Force an alert to show the exact error (e.g., 401 Unauthorized)
          alert("❌ FAILED TO SAVE!\n\nError Details:\n" + (err.message || err));
          
        } finally {
          btn.textContent = "Save";
        }
      } 
      else if (action === "start") {
        try {
          await Api.updateBooking(id, { status: "in_progress" });
          if (typeof toast === "function") toast("Work started!");
          await renderBookings();
        } catch (err) {
          if (typeof toast === "function") toast("Failed to start work.");
        }
      } 
      else if (action === "complete") {
        try {
          await Api.updateBooking(id, { status: "completed" });
          if (typeof toast === "function") toast("Booking marked as completed!");
          await renderBookings();
        } catch (err) {
          if (typeof toast === "function") toast("Failed to complete booking.");
        }
      } 
      else if (action === "cancel") {
        cancelBooking(id);
      }
    });
  });
}

async function cancelBooking(id) {
  const reason = prompt("Please provide a reason for cancelling this booking:");
  if (reason !== null && reason.trim() !== "") {
    try {
      await Api.updateBooking(id, { status: "cancelled", cancellationReason: reason });
      if (typeof toast === "function") toast("Booking cancelled.");
      await renderBookings();
    } catch (err) {
      if (typeof toast === "function") toast("Couldn't cancel the booking.");
    }
  } else if (reason !== null) {
    if (typeof toast === "function") toast("A reason is required.");
  }
}

function openReview(bookingId, bookings) {
  reviewTargetBooking = bookings.find((b) => String(b.id) === String(bookingId) || String(b._id) === String(bookingId));
  if (!reviewTargetBooking) return alert("Error: Could not find booking.");

  document.getElementById("review-target").textContent = `${reviewTargetBooking.providerName} - ${reviewTargetBooking.service}`;
  document.getElementById("review-modal").classList.add("is-open");
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  if (!reviewTargetBooking) return;
  const targetId = reviewTargetBooking.id || reviewTargetBooking._id;

  try {
    await Api.addReview({
      providerId: reviewTargetBooking.providerId,
      bookingId:  targetId,
      author:     "You",
      rating:     Number(document.getElementById("review-rating").value),
      text:       document.getElementById("review-text").value,
    });
    await Api.updateBooking(targetId, { reviewed: true });

    document.getElementById("review-modal").classList.remove("is-open");
    document.getElementById("review-form").reset();
    if (typeof toast === "function") toast("Thanks - your review helps!");
    await renderBookings();
  } catch (err) {
    if (typeof toast === "function") toast("Couldn't submit review.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("asc_user") || "null");
  if (user?.role === "vendor") {
    window.location.href = "provider-dashboard.html";
    return;
  }
  if (!user || user.role !== "resident") {
    window.location.href = "login.html?next=%2Fdashboard.html";
    return;
  }

  renderBookings();

  const reviewForm = document.getElementById("review-form");
  if (reviewForm) reviewForm.addEventListener("submit", handleReviewSubmit);
  
  const reviewCancel = document.getElementById("review-cancel");
  if (reviewCancel) reviewCancel.addEventListener("click", () => {
    document.getElementById("review-modal").classList.remove("is-open");
  });
});