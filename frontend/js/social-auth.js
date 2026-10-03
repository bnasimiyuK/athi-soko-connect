/* ============================================================
   social-auth.js - Social login button handler
   ============================================================ */

const SOCIAL_API_BASE = "http://127.0.0.1:4050";

function startSocialLogin(provider, mode) {
  const qs = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  const url = `${SOCIAL_API_BASE}/auth/${provider}${qs}`;
  console.log(`[social] → ${url}`);
  window.location.href = url;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-social]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const provider = btn.dataset.social;
      const mode     = btn.dataset.socialMode || "login";
      if (!provider) return;
      startSocialLogin(provider, mode);
    });
  });
});