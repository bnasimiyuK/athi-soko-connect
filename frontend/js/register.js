/* ============================================================
   register.js - vendor application (two-step flow)
   1. Verify the applicant is a registered + verified resident
   2. Only then show the vendor listing form
   ============================================================ */

let verifiedResident = null;

document.addEventListener("DOMContentLoaded", () => {
  // Form Listeners
  document.getElementById("resident-check-form").addEventListener("submit", handleVerifyResident);
  document.getElementById("register-form").addEventListener("submit", handleSubmitVendor);
  
  // Back button in Step 2
  document.getElementById("back-btn").addEventListener("click", resetFlow);

  // Live Preview Listeners
  const previewInputs = ["r-name", "r-category", "r-hours", "r-price", "r-price-unit", "r-bio", "r-services"];
  previewInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updatePreview);
    if (el) el.addEventListener("change", updatePreview);
  });

  // "Register another" button on success card
  document.getElementById("again-btn").addEventListener("click", resetFlow);
});

/* ------------------------------------------------------------
   STEP 1 - Verify residency by phone
   ------------------------------------------------------------ */
async function handleVerifyResident(e) {
  e.preventDefault();

  const rawPhone = document.getElementById("r-phone").value.trim();
  const btn = document.getElementById("verify-btn");

  if (!rawPhone) {
    showCheckMessage("Please enter your phone number.", true);
    return;
  }

  showCheckMessage("Checking…", false);
  btn.disabled = true;

  try {
    const list = await Api.getResidents({ q: rawPhone });

    // Normalize the input for comparison (remove spaces, +, etc.)
    const cleanInput = rawPhone.replace(/\s+/g, '').replace(/^\+/, '');

    // Find a match where the phones match after normalization
    const match = list.find((r) => {
      if (!r.phone) return false;
      const cleanDbPhone = r.phone.replace(/\s+/g, '').replace(/^\+/, '');
      return cleanDbPhone === cleanInput 
          || cleanDbPhone.endsWith(cleanInput) 
          || cleanInput.endsWith(cleanDbPhone);
    });

    if (!match) {
      showCheckMessage("❌ No resident found with that phone number. Please sign up as a resident first.", true);
      return;
    }

    if (!match.verified) {
      showCheckMessage("⏳ Your resident account is still pending admin approval. Please try again once approved.", true);
      return;
    }

    // ✅ Resident exists and is verified
    verifiedResident = match;
    showCheckMessage("", false);

    // Populate the read-only info banner
    document.getElementById("resident-info").innerHTML =
      `✅ Verified resident: <strong>${match.fullName}</strong> - Phase ${match.phase}, ${match.courtName} (${match.phone})`;

    // Swap forms using the `hidden` attribute
    document.getElementById("resident-check-form").hidden = true;
    document.getElementById("register-form").hidden = false;
    document.getElementById("listing-preview").hidden = false;
    document.getElementById("done-card").hidden = true;
    document.getElementById("reg-layout").classList.add("reg-layout--split");

    // Update Progress Steps
    document.querySelector('.reg-steps li[data-step="1"]').classList.remove("is-current");
    document.querySelector('.reg-steps li[data-step="1"]').classList.add("is-done");
    document.querySelector('.reg-steps li[data-step="2"]').classList.add("is-current");

    // Load category dropdown for step 2
    await populateCategorySelect();

  } catch (err) {
    console.error("[register] resident check failed:", err);
    showCheckMessage("Could not verify. Please check your connection and try again.", true);
  } finally {
    btn.disabled = false;
  }
}
/* ------------------------------------------------------------
   Show inline message under Step 1
   ------------------------------------------------------------ */
function showCheckMessage(text, isError) {
  const el = document.getElementById("check-message");
  if (!text) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = text;
  el.style.color = isError ? "var(--clay)" : "var(--ink-70)";
}

/* ------------------------------------------------------------
   Load categories into the Step 2 dropdown
   ------------------------------------------------------------ */
async function populateCategorySelect() {
  const select = document.getElementById("r-category");
  if (select.options.length > 0) return; // already populated

  try {
    // Assuming Api.getCategories() exists in api.js and returns [{id, label}, ...]
    const categories = await Api.getCategories();
    select.innerHTML = "";

    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("[register] failed to load categories:", err);
    if (typeof toast === 'function') toast("Could not load service categories.");
  }
}

/* ------------------------------------------------------------
   STEP 2 - Submit the vendor application
   ------------------------------------------------------------ */
async function handleSubmitVendor(e) {
  e.preventDefault();

  if (!verifiedResident) {
    alert("❌ You haven't verified your residency yet.\n\nPlease scroll up, enter your phone number, and click 'Verify residency' first.");
    return;
  }

  const services = document
    .getElementById("r-services")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!services.length) {
    if (typeof toast === 'function') toast("Add at least one service, separated by commas.");
    return;
  }

  const payload = {
    // Inherited from verified resident
    residentId: verifiedResident.id,
    phone:      verifiedResident.phone,
    
    // Vendor-specific fields
    name:      document.getElementById("r-name").value.trim(),
    category:  document.getElementById("r-category").value,
    hours:     document.getElementById("r-hours").value.trim(),
    priceFrom: Number(document.getElementById("r-price").value),
    priceUnit: document.getElementById("r-price-unit").value,
    bio:       document.getElementById("r-bio").value.trim(),
    services,
  };

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;

  try {
    // Assuming Api.registerProvider(payload) exists and sends POST to backend
    await Api.registerProvider(payload);
    
    // Show success
    document.getElementById("register-form").hidden = true;
    document.getElementById("listing-preview").hidden = true;
    document.getElementById("done-card").hidden = false;
    
    // Populate confirmation details
    document.getElementById("done-resident").textContent = verifiedResident.fullName;
    document.getElementById("done-time").textContent = new Date().toLocaleString();

    // Update Progress Steps
    document.querySelector('.reg-steps li[data-step="2"]').classList.remove("is-current");
    document.querySelector('.reg-steps li[data-step="2"]').classList.add("is-done");
    document.querySelector('.reg-steps li[data-step="3"]').classList.add("is-current");

    if (typeof toast === 'function') toast(`Thanks, ${payload.name}! Your listing is pending admin verification.`);

  } catch (err) {
    console.error("[register] submit failed:", err);
    const msgEl = document.getElementById("submit-message");
    msgEl.textContent = err.message || "Couldn't submit your listing. Please try again.";
    msgEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------
   Live Preview Logic
   ------------------------------------------------------------ */
function updatePreview() {
  const name = document.getElementById("r-name").value;
  const catSelect = document.getElementById("r-category");
  const catText = catSelect.options[catSelect.selectedIndex]?.text || "Category";
  const hours = document.getElementById("r-hours").value;
  const price = document.getElementById("r-price").value;
  const priceUnit = document.getElementById("r-price-unit").value;
  const bio = document.getElementById("r-bio").value;
  const services = document.getElementById("r-services").value.split(",").map(s => s.trim()).filter(Boolean);

  // Update Preview Card
  document.getElementById("p-name").textContent = name || "Your Business Name";
  document.getElementById("p-cat").textContent = catText;
  document.getElementById("p-bio").textContent = bio || "Your short description will appear here.";
  document.getElementById("p-hours").textContent = hours || "Working hours";
  
  const priceDisplay = price ? `KSh ${price} ${priceUnit}` : "Price";
  document.getElementById("p-price").textContent = priceDisplay;

  const tagsContainer = document.getElementById("p-tags");
  tagsContainer.innerHTML = "";
  services.forEach(service => {
    const span = document.createElement("span");
    span.className = "listing-card__tag";
    span.textContent = service;
    tagsContainer.appendChild(span);
  });

  // Update Location (assuming verifiedResident has this data)
  if (verifiedResident) {
    document.getElementById("p-loc").textContent = `Phase ${verifiedResident.phase}, ${verifiedResident.courtName}`;
  }
}

/* ------------------------------------------------------------
   Reset the flow to Step 1
   ------------------------------------------------------------ */
function resetFlow() {
  verifiedResident = null;
  
  // Reset forms
  document.getElementById("resident-check-form").reset();
  document.getElementById("register-form").reset();
  
  // Show/Hide using hidden attribute
  document.getElementById("resident-check-form").hidden = false;
  document.getElementById("register-form").hidden = true;
  document.getElementById("done-card").hidden = true;
  document.getElementById("listing-preview").hidden = true;
  document.getElementById("reg-layout").classList.remove("reg-layout--split");
  document.getElementById("check-message").hidden = true;
  document.getElementById("submit-message").hidden = true;

  // Reset Progress Steps
  document.querySelectorAll('.reg-steps li').forEach(li => {
    li.classList.remove('is-current', 'is-done');
  });
  document.querySelector('.reg-steps li[data-step="1"]').classList.add("is-current");
}