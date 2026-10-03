/* ============================================================
   social-auth.js — Google login button handler
   ============================================================ */

/* Google OAuth lives at /auth (NOT /api/auth), matching GOOGLE_REDIRECT_URI.
   Host must match the .env exactly: 127.0.0.1 (not localhost). */
const SOCIAL_API_BASE = "http://127.0.0.1:4050";

function startSocialLogin(provider) {
  const url = `${SOCIAL_API_BASE}/auth/${provider}`;
  console.log(`[social] → ${url}`);
  window.location.href = url;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-social]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      startSocialLogin(btn.dataset.social);
    });
  });
});