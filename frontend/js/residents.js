/* ============================================================
   residents.js - public resident signup
   Submits to POST /api/auth/register-resident
   Account created as verified = 0 (pending admin approval)
   Uses shared validators.js for name/phone/email/password.
   Supports Google signup prefill via #googleProfile=... fragment.
   ============================================================ */

let ALL_COURTS      = [];
let FILTERED_COURTS = [];
let selectedCourtId = "";

/* ------------------------------------------------------------
   Google signup prefill.
   Runs when residents.html is loaded with either:
     #googleProfile=<urlencoded JSON>   → prefill form
     #error=<urlencoded message>        → show "already registered" message
   ------------------------------------------------------------ */
function handleGoogleSignupReturn() {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;

  const params           = new URLSearchParams(hash);
  const err              = params.get("error");
  const googleProfileRaw = params.get("googleProfile");

  /* ---------- Error: email already registered ---------- */
  if (err) {
    const msg          = decodeURIComponent(err);
    const responseBox  = document.getElementById("backendResponse");
    const responseText = document.getElementById("responseText");
    if (responseBox && responseText) {
      responseBox.classList.remove("hidden");
      responseBox.classList.add("error");
      responseText.textContent = msg + " Use 'Log in' at the top instead.";
    }
    history.replaceState(null, "", window.location.pathname);
    return true;
  }

  if (!googleProfileRaw) return false;

  /* ---------- Parse the Google profile ---------- */
  let profile;
  try {
    profile = JSON.parse(decodeURIComponent(googleProfileRaw));
  } catch (e) {
    console.error("[residents] bad google profile:", e);
    return false;
  }

  /* ---------- Prefill identity fields ---------- */
  const firstNameEl = document.getElementById("firstName");
  const lastNameEl  = document.getElementById("lastName");
  const emailEl     = document.getElementById("email");
  const googleIdEl  = document.getElementById("googleId");

  if (firstNameEl && profile.givenName)  firstNameEl.value = profile.givenName;
  if (lastNameEl  && profile.familyName) lastNameEl.value  = profile.familyName;
  if (emailEl     && profile.email) {
    emailEl.value            = profile.email;
    emailEl.readOnly         = true;
    emailEl.style.background = "#f3f4f6";
  }
  if (googleIdEl) googleIdEl.value = profile.id;

  /* ---------- Hide password fields (Google users have no password) ---------- */
  const pwEl  = document.getElementById("password");
  const cpwEl = document.getElementById("confirmPassword");

  [pwEl, cpwEl].forEach((el) => {
    if (!el) return;
    el.required = false;
    el.value    = "";
    const group = el.closest(".input-group");
    if (group) group.style.display = "none";
  });

  const hint = document.querySelector(".password-hint");
  if (hint) hint.style.display = "none";

  /* ---------- Banner ---------- */
  const header = document.querySelector(".register-header");
  if (header) {
    const note = document.createElement("div");
    note.id = "googleSignupBanner";
    note.style.cssText =
      "background:#ecfdf5; color:#065f46; padding:10px 14px; " +
      "border-radius:6px; margin-top:12px; font-size:0.9rem;";
    note.textContent =
      "✅ Google verified: " + (profile.email || "") +
      ". Fill in your phone, phase and court to finish signing up.";
    header.appendChild(note);
  }

  history.replaceState(null, "", window.location.pathname);
  return true;
}

/* ------------------------------------------------------------
   Load courts
   ------------------------------------------------------------ */
async function loadCourts() {
  try {
    ALL_COURTS = await Api.getCourts();
    console.log(`[residents] loaded ${ALL_COURTS.length} courts`);
  } catch (err) {
    console.error("[residents] failed to load courts:", err);
    toast("Could not load court list. Please refresh.");
  }
}

/* ------------------------------------------------------------
   Phase → enable court search
   ------------------------------------------------------------ */
function enableCourtSearch(phase) {
  const searchEl = document.getElementById("courtSearch");
  const listEl   = document.getElementById("courtList");

  if (!phase) {
    searchEl.disabled    = true;
    searchEl.value       = "";
    searchEl.placeholder = "Select a phase first…";
    listEl.style.display = "none";
    selectedCourtId      = "";
    document.getElementById("court").value = "";
    return;
  }

  FILTERED_COURTS = ALL_COURTS.filter((c) => String(c.phase) === String(phase));
  console.log(`[residents] phase ${phase} → ${FILTERED_COURTS.length} courts`);

  searchEl.disabled    = false;
  searchEl.value       = "";
  searchEl.placeholder = "Start typing a court name…";
  renderCourtList("");
}

/* ------------------------------------------------------------
   Render filtered courts
   ------------------------------------------------------------ */
function renderCourtList(query) {
  const listEl = document.getElementById("courtList");
  const q      = (query || "").toLowerCase().trim();

  const matches = FILTERED_COURTS.filter((c) =>
    c.name.toLowerCase().includes(q)
  );

  listEl.innerHTML = "";

  if (!matches.length) {
    listEl.innerHTML =
      `<div style="padding:10px 12px; color:var(--ink-70); font-size:0.9rem;">No courts match "${query}"</div>`;
    listEl.style.display = "block";
    return;
  }

  matches.forEach((c) => {
    const row = document.createElement("div");
    row.textContent        = c.name;
    row.style.padding      = "10px 12px";
    row.style.cursor       = "pointer";
    row.style.fontSize     = "0.95rem";
    row.style.borderBottom = "1px solid var(--line)";
    row.addEventListener("mouseenter", () => row.style.background = "var(--paper-dim)");
    row.addEventListener("mouseleave", () => row.style.background = "");
    row.addEventListener("click",      () => selectCourt(c));
    listEl.appendChild(row);
  });

  listEl.style.display = "block";
}

/* ------------------------------------------------------------
   Court selected
   ------------------------------------------------------------ */
function selectCourt(court) {
  selectedCourtId = String(court.id);
  document.getElementById("court").value       = selectedCourtId;
  document.getElementById("courtSearch").value = court.name;
  document.getElementById("courtList").style.display = "none";
  console.log(`[residents] selected court: ${court.name} (id ${court.id})`);
}

/* ------------------------------------------------------------
   Shared form validation - uses validators.js
   Returns { ok: true, data } on success, { ok: false } on failure.
   Toasts the first failure reason.
   ------------------------------------------------------------ */
function collectAndValidateForm() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName  = document.getElementById("lastName").value.trim();
  const rawPhone  = document.getElementById("phone").value.trim();
  const email     = document.getElementById("email").value.trim();

  const pwEl            = document.getElementById("password");
  const cpwEl           = document.getElementById("confirmPassword");
  const password        = pwEl  ? pwEl.value  : "";
  const confirmPassword = cpwEl ? cpwEl.value : "";

  const googleId = document.getElementById("googleId")?.value || null;

  /* ---------- First name ---------- */
  const firstNameCheck = validateName(firstName, "First name");
  if (!firstNameCheck.valid) {
    toast(firstNameCheck.reason);
    return { ok: false };
  }

  /* ---------- Last name ---------- */
  const lastNameCheck = validateName(lastName, "Last name");
  if (!lastNameCheck.valid) {
    toast(lastNameCheck.reason);
    return { ok: false };
  }

  /* ---------- Phone (normalizes +254XXXXXXXXX or foreign) ---------- */
  const phoneCheck = normalizePhone(rawPhone);
  if (!phoneCheck.valid) {
    toast(phoneCheck.reason);
    return { ok: false };
  }
  const phone = phoneCheck.normalized;

  /* ---------- Email (optional, but validated if provided) ---------- */
  let normalizedEmail = null;
  if (email) {
    const emailCheck = validateEmail(email, { optional: true });
    if (!emailCheck.valid) {
      toast(emailCheck.reason);
      return { ok: false };
    }
    normalizedEmail = emailCheck.normalized;
  }

  /* ---------- Court ---------- */
  if (!selectedCourtId) {
    toast("Please select a court.");
    return { ok: false };
  }

  /* ---------- Password - only for manual signups ---------- */
  if (!googleId) {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      toast(pwCheck.reason);
      return { ok: false };
    }
    if (password !== confirmPassword) {
      toast("Passwords do not match.");
      return { ok: false };
    }
  }

  /* ---------- Terms ---------- */
  if (!document.getElementById("terms").checked) {
    toast("Please agree to the Terms and Privacy Policy to continue.");
    return { ok: false };
  }

  return {
    ok: true,
    data: {
      firstName:  firstNameCheck.normalized,
      lastName:   lastNameCheck.normalized,
      fullName:   `${firstNameCheck.normalized} ${lastNameCheck.normalized}`,
      phone,
      email:      normalizedEmail,
      password:   googleId ? null : password,
      googleId,
    },
  };
}

/* ------------------------------------------------------------
   Submit form
   ------------------------------------------------------------ */
async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById("registerBtn");
  btn.disabled = true;

  const check = collectAndValidateForm();
  if (!check.ok) {
    btn.disabled = false;
    return;
  }
  const d = check.data;

  const payload = {
    fullName: d.fullName,
    phone:    d.phone,
    email:    d.email,
    courtId:  selectedCourtId,
    password: d.password,   /* null for Google signups */
    googleId: d.googleId,
  };

  showMessage("Submitting…", false);

  try {
    await Api.registerResident(payload);

    const pendingMsg = d.googleId
      ? `✅ Thanks, ${d.fullName}. Your registration is pending admin approval. ` +
        `Because you signed up with Google, you'll be able to log in with Google once approved.`
      : `✅ Thank you, ${d.fullName}. Your registration is pending admin approval. ` +
        `You'll receive an email once your account is approved.`;

    showMessage(pendingMsg, false);
    toast(`Registration submitted! Pending admin approval, ${d.firstName}.`);

    /* ---------- Reset form + UI state ---------- */
    e.target.reset();
    selectedCourtId = "";

    const searchEl = document.getElementById("courtSearch");
    searchEl.disabled    = true;
    searchEl.value       = "";
    searchEl.placeholder = "Select a phase first…";

    document.getElementById("courtList").style.display = "none";

    const googleIdEl = document.getElementById("googleId");
    if (googleIdEl) googleIdEl.value = "";

    const banner = document.getElementById("googleSignupBanner");
    if (banner) banner.remove();

  } catch (err) {
    console.error("[residents] submit failed:", err);
    document.getElementById("backendResponse").classList.add("hidden");
    toast(err.message || "Could not submit registration.");
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------
   Inline message box
   ------------------------------------------------------------ */
function showMessage(text, isError) {
  const box = document.getElementById("backendResponse");
  const txt = document.getElementById("responseText");
  if (!box || !txt) return;
  box.classList.remove("hidden");
  box.classList.toggle("error", !!isError);
  txt.textContent = text;
}

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[residents] DOM ready");

  /* Handle Google signup return BEFORE loading courts */
  handleGoogleSignupReturn();

  await loadCourts();

  const phaseEl  = document.getElementById("phase");
  const searchEl = document.getElementById("courtSearch");
  const listEl   = document.getElementById("courtList");

  phaseEl.addEventListener("change", (e) => enableCourtSearch(e.target.value));
  searchEl.addEventListener("input", (e) => renderCourtList(e.target.value));

  searchEl.addEventListener("focus", () => {
    if (!searchEl.disabled && FILTERED_COURTS.length) {
      renderCourtList(searchEl.value);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#courtSearch") && !e.target.closest("#courtList")) {
      listEl.style.display = "none";
    }
  });

  document.getElementById("residentForm").addEventListener("submit", handleSubmit);

  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("residentForm").reset();
    selectedCourtId = "";

    searchEl.disabled    = true;
    searchEl.value       = "";
    searchEl.placeholder = "Select a phase first…";
    listEl.style.display = "none";

    document.getElementById("backendResponse").classList.add("hidden");
    document.getElementById("googleId").value = "";

    const banner = document.getElementById("googleSignupBanner");
    if (banner) banner.remove();
  });
});