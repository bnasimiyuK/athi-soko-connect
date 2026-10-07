/* ============================================================
   api.js - thin fetch wrapper around the backend REST API.
   - Attaches the JWT (from auth.js) to every request
   - Auto-logs out on 401 (expired/invalid token)
   - Surfaces 403 with a clear message (role/permission denied)
   - Logs failing URL + method + status for debugging
   - Exposes window.api for admin-tools.js and other consumers
   ============================================================ */

const API_BASE = "http://localhost:4050/api";

/* ------------------------------------------------------------
   Debug flag — set to false once things are stable
   ------------------------------------------------------------ */
const API_DEBUG = true;

function apiLog(...args) {
  if (API_DEBUG) console.log("[api]", ...args);
}
function apiWarn(...args) {
  if (API_DEBUG) console.warn("[api]", ...args);
}

/* ------------------------------------------------------------
   Decode the JWT payload (no verification, client-side only)
   ------------------------------------------------------------ */
function apiDecodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Preflight: is the token present AND not obviously expired?
   ------------------------------------------------------------ */
function apiTokenStatus() {
  const token = typeof getToken === "function" ? getToken() : null;
  if (!token) return { ok: false, reason: "no-token" };

  const payload = apiDecodeToken(token);
  if (!payload) return { ok: false, reason: "malformed" };

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "expired", payload };
  }
  return { ok: true, payload };
}

/* ------------------------------------------------------------
   Core request helper - attaches Bearer token if present
   ------------------------------------------------------------ */
async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = typeof getToken === "function" ? getToken() : null;
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  } else {
    apiWarn("No token available for", options.method || "GET", url);
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr) {
    console.error("[api] network error:", netErr, { url, method: options.method || "GET" });
    throw new Error(
      "Network error. Check that the API server is running and CORS allows this origin."
    );
  }

  // ---- Success paths ----
  if (res.ok) {
    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return res.json();
  }

  // ---- Error paths ----
  let message = `Request failed (${res.status})`;
  let bodyText = "";
  try {
    bodyText = await res.text();
    if (bodyText) {
      try {
        const body = JSON.parse(bodyText);
        if (body && body.error) message = body.error;
        else if (body && body.message) message = body.message;
      } catch {
        if (bodyText.length < 200) message = bodyText;
      }
    }
  } catch { /* ignore */ }

  console.error("[api] request failed:", {
    url,
    method: options.method || "GET",
    status: res.status,
    statusText: res.statusText,
    body: bodyText,
  });

  if (res.status === 401) {
    const status = apiTokenStatus();
    if (status.reason === "expired") {
      message = "Your session has expired. Please log in again.";
    } else if (status.reason === "malformed" || status.reason === "no-token") {
      message = "You are not logged in.";
    }
    if (typeof logout === "function") {
      apiWarn("401 received — logging out");
      setTimeout(() => logout(), 50);
    }
    const err = new Error(message);
    err.status = 401;
    throw err;
  }

  if (res.status === 403) {
    const status = apiTokenStatus();
    const role = status.payload?.role || "unknown";
    console.error(
      `[api] 403 Forbidden on ${options.method || "GET"} ${url}\n` +
      `  Your role: ${role}\n` +
      `  Token valid: ${status.ok ? "yes" : "no (" + status.reason + ")"}\n` +
      `  → Check the backend's requireRole() on this route.`
    );
    message =
      "You do not have permission for this action. " +
      (role === "super"
        ? "The backend may be rejecting 'super' on this route — check requireRole()."
        : "");
    const err = new Error(message);
    err.status = 403;
    throw err;
  }

  if (res.status === 404) {
    const err = new Error(message || "Not found.");
    err.status = 404;
    throw err;
  }

  const err = new Error(message);
  err.status = res.status;
  throw err;
}

/* ------------------------------------------------------------
   Helper: strip empty params and build a query string
   ------------------------------------------------------------ */
function qsOf(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null
    )
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? "?" + qs : "";
}

/* ------------------------------------------------------------
   Helper: download a blob with auth
   ------------------------------------------------------------ */
async function downloadBlob(url) {
  const token = typeof getToken === "function" ? getToken() : null;
  if (!token) throw new Error("Not logged in.");

  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (netErr) {
    console.error("[api] blob network error:", netErr, { url });
    throw new Error("Network error. Check that the API server is reachable.");
  }

  if (res.status === 401) {
    if (typeof logout === "function") setTimeout(() => logout(), 50);
    throw new Error("Session expired. Please log in again.");
  }
  if (res.status === 403) {
    const status = apiTokenStatus();
    const role = status.payload?.role || "unknown";
    console.error(
      `[api] 403 on download ${url}\n  Your role: ${role}\n  ` +
      `→ The backend requireRole() may not accept 'super'.`
    );
    throw new Error("You do not have permission to download this file.");
  }
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  return res.blob();
}

/* ------------------------------------------------------------
   Helper: safely unwrap an envelope OR plain array
   ------------------------------------------------------------ */
function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (!result) return [];
  if (Array.isArray(result.data))    return result.data;
  if (Array.isArray(result.items))   return result.items;
  if (Array.isArray(result.rows))    return result.rows;
  if (Array.isArray(result.results)) return result.results;
  return [];
}

/* ============================================================
   Api - every backend endpoint exposed as a method
   ============================================================ */
const Api = {
  /* ---------- Auth ---------- */
  login: (credentials) =>
    request(`${API_BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  registerResident: (data) =>
    request(`${API_BASE}/auth/register-resident`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request(`${API_BASE}/auth/me`),

  changePassword: (payload) =>
    request(`${API_BASE}/auth/change-password`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /* ---------- Announcements ---------- */
  getAnnouncements: (params = {}) =>
    request(`${API_BASE}/announcements${qsOf(params)}`),

  createAnnouncement: (payload) =>
    request(`${API_BASE}/announcements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteAnnouncement: (id) =>
    request(`${API_BASE}/announcements/${id}`, { method: "DELETE" }),

  updateAnnouncement: (id, patch) =>
    request(`${API_BASE}/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  /* ---------- Admin ---------- */
  getAdminStats: () => request(`${API_BASE}/admin/stats`),
  getAdminDashboard: () => request(`${API_BASE}/admin/dashboard`),

  downloadAdminReport: async (kind) =>
    downloadBlob(`${API_BASE}/admin/export.${kind}`),

  /* ---------- Admins (super-admin only) ---------- */
  getAdmins: () => request(`${API_BASE}/admins`),
  createAdmin: (payload) =>
    request(`${API_BASE}/admins`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdmin: (id, patch) =>
    request(`${API_BASE}/admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  resetAdminPassword: (id) =>
    request(`${API_BASE}/admins/${id}/reset-password`, { method: "POST" }),
  deleteAdmin: (id) =>
    request(`${API_BASE}/admins/${id}`, { method: "DELETE" }),

  /* ---------- Categories ---------- */
  getCategories: () => request(`${API_BASE}/categories`),
  createCategory: (payload) =>
    request(`${API_BASE}/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (id, patch) =>
    request(`${API_BASE}/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteCategory: (id) =>
    request(`${API_BASE}/categories/${id}`, { method: "DELETE" }),

  /* ---------- Providers ---------- */
  getProviders: (params = {}) =>
    request(`${API_BASE}/providers${qsOf(params)}`),
  getProvider: (id) =>
    request(`${API_BASE}/providers/${id}`),
  registerProvider: (data) =>
    request(`${API_BASE}/providers`, { method: "POST", body: JSON.stringify(data) }),
  updateProvider: (id, patch) =>
    request(`${API_BASE}/providers/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeProvider: (id) =>
    request(`${API_BASE}/providers/${id}`, { method: "DELETE" }),

  /* ---------- Reviews ---------- */
  getReviews: (providerId) =>
    request(`${API_BASE}/reviews/provider/${providerId}`),
  getAllReviews: (params = {}) =>
    request(`${API_BASE}/reviews${qsOf(params)}`),
  addReview: (review) =>
    request(`${API_BASE}/reviews`, { method: "POST", body: JSON.stringify(review) }),
  deleteReview: (id) =>
    request(`${API_BASE}/reviews/${id}`, { method: "DELETE" }),
  updateReview: (id, patch) =>
    request(`${API_BASE}/reviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  /* ---------- Bookings ---------- */
  getBookings: (params = {}) =>
    request(`${API_BASE}/bookings${qsOf(params)}`),
  addBooking: (booking) =>
    request(`${API_BASE}/bookings`, { method: "POST", body: JSON.stringify(booking) }),
  updateBooking: (id, patch) =>
    request(`${API_BASE}/bookings/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  /* ---------- Reports ---------- */
  getReports: (params = {}) =>
    request(`${API_BASE}/reports${qsOf(params)}`),
  addReport: (report) =>
    request(`${API_BASE}/reports`, { method: "POST", body: JSON.stringify(report) }),
  updateReport: (id, patch) =>
    request(`${API_BASE}/reports/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  /* ---------- Courts ---------- */
  getCourts: (params = {}) =>
    request(`${API_BASE}/courts${qsOf(params)}`),
  addCourt: (data) =>
    request(`${API_BASE}/courts`, { method: "POST", body: JSON.stringify(data) }),

  /* ---------- Residents ---------- */
  getResidents: (params = {}) =>
    request(`${API_BASE}/residents${qsOf(params)}`),
  getResident: (id) =>
    request(`${API_BASE}/residents/${id}`),
  addResident: (data) =>
    request(`${API_BASE}/residents`, { method: "POST", body: JSON.stringify(data) }),
  updateResident: (id, patch) =>
    request(`${API_BASE}/residents/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeResident: (id) =>
    request(`${API_BASE}/residents/${id}`, { method: "DELETE" }),

  /* ---------- Admin: exports ---------- */
  downloadResidentsReport: async (kind, params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries({ verified: "true", ...params }).filter(
          ([, v]) => v !== "" && v !== undefined && v !== null
        )
      )
    ).toString();
    return downloadBlob(
      `${API_BASE}/admin/residents/export.${kind}${qs ? "?" + qs : ""}`
    );
  },

  downloadProvidersReport: async (kind, params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(
          ([, v]) => v !== "" && v !== undefined && v !== null
        )
      )
    ).toString();
    return downloadBlob(
      `${API_BASE}/admin/providers/export.${kind}${qs ? "?" + qs : ""}`
    );
  },

  /* ============================================================
     BILLING
     ============================================================ */
  getBillingSettings: () => request(`${API_BASE}/invoices/settings`),
  getMyInvoices: () => request(`${API_BASE}/invoices/mine`),
  getMyPayments: () => request(`${API_BASE}/payments/mine`),
  selfReportPayment: (payload) =>
    request(`${API_BASE}/payments/self-report`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getInvoices: (params = {}) =>
    request(`${API_BASE}/invoices${qsOf(params)}`),
  getInvoice: (id) => request(`${API_BASE}/invoices/${id}`),
  generateInvoices: (month) =>
    request(`${API_BASE}/invoices/generate`, {
      method: "POST",
      body: JSON.stringify({ month }),
    }),
  markInvoicesOverdue: () =>
    request(`${API_BASE}/invoices/mark-overdue`, { method: "POST" }),

  getPayments: (params = {}) =>
    request(`${API_BASE}/payments${qsOf(params)}`),
  recordManualPayment: (payload) =>
    request(`${API_BASE}/payments/manual`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyPayment: (id) =>
    request(`${API_BASE}/payments/${id}/verify`, { method: "POST" }),
  rejectPayment: (id, reason) =>
    request(`${API_BASE}/payments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  /* ---------- House numbers (admin) ---------- */
  getHouseNumberSummary: () => request(`${API_BASE}/house-numbers/summary`),
  getHouseNumberResidents: (params = {}) =>
    request(`${API_BASE}/house-numbers/residents${qsOf(params)}`),
  getHouseNumberProposal: () => request(`${API_BASE}/house-numbers/proposal`),
  setResidentHouseNumber: (id, houseNumber) =>
    request(`${API_BASE}/house-numbers/residents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ houseNumber }),
    }),
  bulkAssignHouseNumbers: (rows) =>
    request(`${API_BASE}/house-numbers/bulk`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    }),

  /* ============================================================
     ALIASES FOR admin-tools.js MODALS
     These unwrap envelopes so the modals always receive arrays.
     ============================================================ */

  /* All reviews — /admin/reviews → /reviews */
  getAdminReviews: async () => {
    const result = await Api.getAllReviews({ page: 1, limit: 100 });
    return unwrapList(result);
  },

  /* Categories — already returns an array */
  getAdminCategories: async () => {
    const result = await Api.getCategories();
    return unwrapList(result);
  },

  /* Admins — normalize full_name → name */
  getAdminAdmins: async () => {
    const admins = await Api.getAdmins();
    const list = unwrapList(admins);
    return list.map((a) => ({
      id:   a.id,
      name: a.full_name || a.name || a.email || "(unnamed)",
      role: a.role || "admin",
    }));
  },

  /* House numbers — join residents with their assigned numbers */
   getAdminHouseNumbers: async () => {
    const result = await Api.getHouseNumberResidents({ limit: 500 });
    const list = unwrapList(result);
    return list.map((r) => ({
      id:     r.id,
      number: r.houseNumber || "",
      name:   r.fullName || r.name || "",
      court:  r.courtName || "",
    }));
  },
};

/* ============================================================
   ESTATE ENDPOINTS — Discover page data
   ============================================================ */
Api.getStats = async () => {
  try { return await request(`${API_BASE}/estate/stats`); }
  catch (err) { console.warn("[api] getStats failed:", err); return null; }
};

Api.getPhaseRange = async () => {
  try { return await request(`${API_BASE}/estate/phase-range`); }
  catch (err) { console.warn("[api] getPhaseRange failed:", err); return null; }
};

Api.getLastSync = async () => {
  try {
    const data = await request(`${API_BASE}/estate/last-sync`);
    return data?.lastSync || null;
  } catch (err) { return null; }
};

Api.getNotice = async () => {
  try { return await request(`${API_BASE}/estate/notice`); }
  catch (err) { console.warn("[api] getNotice failed:", err); return null; }
};

Api.getGateRules = async () => {
  try { return await request(`${API_BASE}/estate/gate-rules`); }
  catch (err) { console.warn("[api] getGateRules failed:", err); return null; }
};

Api.getGateStatus = async () => {
  try { return await request(`${API_BASE}/estate/gate-status`); }
  catch (err) { return null; }
};

Api.getCategoryCounts = async () => {
  try { return await request(`${API_BASE}/estate/categories/with-counts`); }
  catch (err) { console.warn("[api] getCategoryCounts failed:", err); return null; }
};

/* ============================================================
   Generic REST helpers used by admin-tools.js modals
   ============================================================ */
Api.get = async function (path) {
  if (path === "/admin/reviews")        return Api.getAdminReviews();
  if (path === "/admin/categories")     return Api.getAdminCategories();
  if (path === "/admin/admins")         return Api.getAdminAdmins();
  if (path === "/admin/house-numbers")  return Api.getAdminHouseNumbers();

  return request(`${API_BASE}${path}`);
};

/* ============================================================
   Expose the API globally
   ============================================================ */
window.api = Api;

/* ============================================================
   DEBUG HELPERS — call from the console to inspect state
   ============================================================ */
window.apiDebug = {
  tokenStatus: () => apiTokenStatus(),
  decodeToken: () => {
    const t = typeof getToken === "function" ? getToken() : null;
    return t ? apiDecodeToken(t) : null;
  },
  testAdminStats: async () => {
    try {
      const r = await Api.getAdminStats();
      console.log("✅ /admin/stats OK:", r);
      return r;
    } catch (e) {
      console.error("❌ /admin/stats failed:", e.message);
      return null;
    }
  },
  testReviews: async () => {
    try {
      const r = await Api.getAdminReviews();
      console.log("✅ admin reviews OK:", r);
      return r;
    } catch (e) {
      console.error("❌ admin reviews failed:", e.message);
      return null;
    }
  },
  testHouseNumbers: async () => {
    try {
      const r = await Api.getHouseNumberSummary();
      console.log("✅ /house-numbers/summary OK:", r);
      return r;
    } catch (e) {
      console.error("❌ /house-numbers/summary failed:", e.message);
      return null;
    }
  },
  testCategories: async () => {
    try {
      const r = await Api.getAdminCategories();
      console.log("✅ admin categories OK:", r.length, "rows");
      return r;
    } catch (e) {
      console.error("❌ admin categories failed:", e.message);
      return null;
    }
  },
  testAdmins: async () => {
    try {
      const r = await Api.getAdminAdmins();
      console.log("✅ admin admins OK:", r.length, "rows");
      return r;
    } catch (e) {
      console.error("❌ admin admins failed:", e.message);
      return null;
    }
  },
};