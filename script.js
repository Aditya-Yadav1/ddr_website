"use strict";

const M = Marketplace;
const $ = (selector) => document.querySelector(selector);
const content = $("#content");
const dialog = $("#dialog");
const toast = $("#notice");
const money = (number) => "₹" + Number(number).toLocaleString("en-IN");
const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const icons = {
  appearance: '<path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z"/><path d="M18 3v6m-3-3h6"/>',
  phone: '<path d="M6 3h4l2 5-3 2a13 13 0 0 0 5 5l2-3 5 2v4a3 3 0 0 1-3 3A16 16 0 0 1 3 6a3 3 0 0 1 3-3Z"/>',
  hive: '<path d="m12 2 8.7 5v10L12 22l-8.7-5V7L12 2Z"/><path d="M8.5 8.5v7m7-7v7m-7-3.5h7"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.4 4.4"/>',
  right: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  left: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  upRight: '<path d="M6 18 18 6M8 6h10v10"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  wrench: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3.1 3.1-2.3-2.3 2.4-3.8Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  sparkles: '<path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2Zm8 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM4 15l.8 2.2L7 18l-2.2.8L4 21l-.8-2.2L1 18l2.2-.8L4 15Z"/>',
  roller: '<rect x="3" y="3" width="14" height="6" rx="1.4"/><path d="M17 6h3v6h-8v3"/><rect x="10" y="15" width="4" height="7" rx="1"/>',
  home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4m-8 8h4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>',
  case: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a22 22 0 0 0 18 0m-9 1v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 2 3 6.2 7 .9-5.1 4.9 1.2 7L12 17.7l-6.1 3.3 1.2-7L2 9.1l7-.9L12 2Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--surface,white)"/><circle cx="15" cy="17" r="2" fill="var(--surface,white)"/>',
  message: '<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8m-8 4h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 2.8c-.8.3-1 1-1 2.2m0 3h.01"/>',
  swap: '<path d="M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4"/>',
};

function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

const button = (label, action, style = "secondary", glyph = "") =>
  `<button class="btn ${style}" type="button" data-action="${action}">${label}${glyph ? icon(glyph, 17) : ""}</button>`;
const link = (label, href, style = "secondary", glyph = "") =>
  `<a class="btn ${style}" href="${esc(href)}">${label}${glyph ? icon(glyph, 17) : ""}</a>`;
const option = (value, label, selected) =>
  `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;

const areaOptions = (value) => M.areas.map((area) => option(area, area, value)).join("");
const timeOptions = (value) => Object.entries(M.timing).map(([id, label]) => option(id, label, value)).join("");
const route = () => {
  const [path, search] = (location.hash.slice(1) || "/").split("?");
  const [page = "", id = ""] = path.split("/").filter(Boolean);
  return { page, id, query: new URLSearchParams(search) };
};
const href = (path, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `#${path}${query ? "?" + query : ""}`;
};
const browse = (trade, params) => href(`/services/${trade}`, params);

let toastTimer;
let focusReturn;
let checkout;
let joinStep = 0;
let draft;

function announce(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 4200);
}

function openDialog(title, body, sheet = "") {
  focusReturn = document.activeElement;
  dialog.dataset.sheet = sheet;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>
    <button class="icon-btn" type="button" data-action="close" aria-label="Close">${icon("close")}</button></div>${body}`;
  dialog.showModal();
}
dialog.addEventListener("close", () => {
  if (focusReturn?.isConnected && !Walkthrough.isActive()) focusReturn.focus({ preventScroll: true });
});

function go(destination) {
  if (location.hash === destination) render(true);
  else location.hash = destination;
}

function statusLabel(job) {
  return `<span class="status ${job.status}"><span></span>${M.statuses[job.status]}</span>`;
}

function timeBadge(person) {
  const labels = { today: "Available today", tomorrow: "Available tomorrow", flexible: "Flexible availability", offline: "Unavailable" };
  return `<span class="status ${person.next === "today" ? "available" : ""}"><span></span>${labels[person.next]}</span>`;
}

function portrait(person, large = false) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const image = person.photo ? `<img src="assets/pro-${person.photo}.jpg" alt="" loading="lazy">` : "";
  return `<span class="portrait ${large ? "portrait-large" : ""}"><span>${esc(initials)}</span>${image}</span>`;
}

function rating(person) {
  return person.reviews
    ? `<span class="rating">${icon("star", 15)} <b>${person.rating.toFixed(1)}</b> <span>(${person.reviews} sample reviews)</span></span>`
    : `<span class="muted">New · No reviews yet</span>`;
}

function price(person) {
  if (person.unit === "hourly") return `${money(person.price)} / hour`;
  return `${money(person.price)} / ${M.units[person.unit]}`;
}

function back(label, path) {
  return `<a class="back-link" href="${esc(path)}">${icon("left", 17)} ${label}</a>`;
}

function heading(title, description) {
  return `<div class="page-heading"><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</div>`;
}

function empty(glyph, title, description, actions = "") {
  return `<div class="empty panel"><span class="feature-icon">${icon(glyph, 25)}</span><h2>${title}</h2>
    <p>${description}</p>${actions ? `<div class="action-row">${actions}</div>` : ""}</div>`;
}

function shell(r, state) {
  const proSide = r.page === "workspace" || r.page === "join";
  const workspace = href("/workspace/jobs", r.query.has("pro") ? { pro: r.query.get("pro") } : {});
  const tabs = proSide ? [
    ["Jobs", workspace, "case", r.page === "workspace" && r.id === "jobs"],
    ["Availability", "#/workspace/availability", "clock", r.id === "availability"],
    ["Profile", "#/workspace/profile", "user", r.id === "profile" || r.page === "join"],
  ] : [
    ["Explore", "#/", "home", ["", "services", "pros", "request"].includes(r.page)],
    ["Bookings", "#/bookings", "calendar", r.page === "bookings"],
    ["Account", "#/account", "user", r.page === "account"],
  ];
  const nav = (mobile) => tabs.map(([label, url, glyph, selected]) =>
    `<a href="${esc(url)}" ${selected ? 'aria-current="page"' : ""}>${mobile ? icon(glyph, 21) : ""}<span>${label}</span></a>`).join("");

  $("#header").innerHTML = `<div class="header-inner wrap">
    <a class="brand" href="#/" aria-label="HandyHive home"><span class="brand-icon">${icon("hive", 24)}</span><span>handy<span class="brand-end">hive</span></span></a>
    <button class="location" type="button" data-action="location" aria-label="Change area, ${esc(state.area)}">
      ${icon("pin", 17)}<span>${esc(state.area)}</span>${icon("chevron", 13)}
    </button>
    <nav class="desktop-nav" aria-label="Main navigation">${nav(false)}</nav>
    <button class="icon-btn appearance-shortcut" type="button" data-action="appearance" aria-label="Appearance" title="Appearance">${icon("appearance", 19)}</button>
    <div class="header-actions">${proSide ? link("Customer view", "#/", "subtle", "swap")
      : `${link("Pro demo", workspace, "subtle", "case")}${link("Join as a pro", state.profile?.published ? "#/workspace/profile" : "#/join", "dark", "upRight")}`}</div>
  </div>`;
  $("#tabs").innerHTML = nav(true);
  $("#footer").innerHTML = `<div class="wrap footer-inner"><span>HandyHive <span class="footer-dot">·</span> ${M.city} marketplace demo</span>
    <div><button type="button" data-action="help">Help</button><a href="${proSide ? "#/" : workspace}">${proSide ? "Customer view" : "Contractor demo"}</a></div></div>`;
}

function explore(state) {
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${icon("pin", 15)} ${M.city} home services</p>
      <h1>Find the right pro<br class="hero-break"> for <em>your home.</em></h1>
      <p class="hero-description">Compare local professionals and book the one you want, from quick repairs to bigger jobs.</p>
      <form id="search-form" class="search" role="search">
        <label class="sr-only" for="service-search">What do you need help with?</label>
        ${icon("search", 22)}<input id="service-search" name="query" placeholder="Try “fix a leaking tap”" autocomplete="off" required maxlength="100">
        <button class="btn primary" type="submit">Find pros ${icon("right", 18)}</button>
      </form>
      <div id="search-suggestions" class="suggestions" hidden></div>
      <p class="search-area">Searching near <button data-action="location" type="button">${esc(state.area)} ${icon("chevron", 13)}</button></p>
    </div>
    <div class="hero-photo"><img src="assets/hero.jpg" alt="A home repair professional carrying a tool bag" fetchpriority="high"></div>
  </section>
  ${state.tutorial !== Walkthrough.version && !Walkthrough.isActive() ? `<aside class="tour-offer"><div>${icon("help", 19)}<span>First time here?</span></div>
    <div class="action-row">${button("Show me", "start-tour", "text-btn")}${button("Skip", "skip-tour", "subtle")}</div></aside>` : ""}
  <section class="category-section" aria-labelledby="service-title">
    <div class="section-head"><h2 id="service-title">What needs doing?</h2></div>
    <div class="category-grid">${M.services.map((trade, index) => `<a class="category" href="${browse(trade.id)}">
      <div class="category-photo"><img src="assets/service-${index + 1}.jpg" alt=""><span class="category-icon">${icon(trade.icon, 21)}</span></div>
      <div class="category-copy"><div><h3>${trade.name}</h3><p>${trade.note}</p></div><span class="circle-arrow">${icon("upRight", 17)}</span></div>
    </a>`).join("")}</div>
  </section>
  <section class="pro-callout"><div class="feature-icon">${icon("case", 23)}</div><div><h2>Take on local jobs</h2>
    <p>Create your profile, set your own rates and decide which requests to accept.</p></div>
    ${link("Join as a pro", state.profile?.published ? "#/workspace/profile" : "#/join", "dark", "right")}</section>`;
}

function resultParams(r, state) {
  const appointment = r.query.get("appointment") || "";
  return {
    area: M.areas.includes(r.query.get("area")) ? r.query.get("area") : state.area,
    appointment: Number.isFinite(M.appointmentTime(appointment)) ? appointment : "",
    sort: ["recommended", "price", "rating", "experience"].includes(r.query.get("sort")) ? r.query.get("sort") : "recommended",
    max: Math.max(0, Number(r.query.get("max")) || 0),
    intent: r.query.get("intent") || "",
  };
}

function scheduleFields(appointment, id) {
  const [date = "", time = ""] = appointment.split("T");
  return `<fieldset class="schedule-field">
    <legend>When do you need help?</legend>
    <div class="schedule-inputs">
      <label>Date<input type="date" name="date" min="${M.localAppointment(Date.now()).slice(0, 10)}" value="${esc(date)}" aria-describedby="${id}-schedule-note"></label>
      <label>Time<input type="time" name="time" value="${esc(time)}" aria-describedby="${id}-schedule-note"></label>
    </div>
    <div class="schedule-shortcuts">
      <button class="btn secondary" type="button" data-action="appointment-offset" data-minutes="30">In 30 min</button>
      <button class="btn secondary" type="button" data-action="appointment-offset" data-minutes="60">In 1 hour</button>
      ${button("Flexible", "appointment-clear", "subtle")}
    </div>
    <p class="muted schedule-note" id="${id}-schedule-note">Times are in IST. Leave both blank for flexible timing.</p>
    <p class="error" data-schedule-error role="alert" hidden></p>
  </fieldset>`;
}

function filterForm(params, serviceId, id = "results") {
  return `<form class="stack filters-form" data-service="${serviceId}">
    <label>Neighbourhood<select name="area">${areaOptions(params.area)}</select></label>
    ${scheduleFields(params.appointment, id)}
    <label>Maximum listed rate<select name="max">${[0, 500, 750, 1000, 1500].map((n) => option(String(n), n ? money(n) : "Any price", String(params.max))).join("")}</select></label>
    <button class="btn dark" type="submit">Apply filters</button>
    <a class="quiet-link" href="${browse(serviceId, params.intent ? { intent: params.intent } : {})}">Clear filters</a>
  </form>`;
}

function results(r, state) {
  const trade = M.service(r.id);
  if (!trade) return unavailable();
  const params = resultParams(r, state);
  const lastAttempt = state.requests.find((job) => job.intent === params.intent);
  const list = M.pros(state).filter((person) => person.service === trade.id
    && person.id !== lastAttempt?.proId
    && M.available(person, params.area, params.appointment, state) && (!params.max || person.price <= params.max));
  const compare = {
    recommended: (a, b) => Number(b.next === "today") - Number(a.next === "today") || (b.rating || 0) - (a.rating || 0),
    price: (a, b) => a.price - b.price,
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    experience: (a, b) => b.years - a.years,
  };
  list.sort(compare[params.sort]);
  const label = list.length === 1 ? "1 professional" : `${list.length} professionals`;
  return `${back("All services", "#/")}
  <div class="results-heading">
    <span class="feature-icon">${icon(trade.icon, 26)}</span>
    ${heading(`${trade.name} professionals`, `${icon("pin", 17)} ${esc(params.area)}, ${M.city} · ${M.appointmentLabel(params.appointment)}`)}
  </div>
  <div class="results-layout">
    <aside class="panel filter-side"><h2>${icon("sliders", 19)} Filters</h2>${filterForm(params, trade.id)}</aside>
    <section aria-label="Available professionals">
      <div class="result-toolbar"><span><b>${label}</b><span class="muted result-area"> in ${esc(params.area)}</span></span>
        <div class="action-row"><button class="btn secondary filter-mobile" type="button" data-action="filters">${icon("sliders", 16)} Filters</button>
        <label class="sort"><span class="sr-only">Sort professionals</span><select id="sort">
          ${[["recommended", "Recommended"], ["price", "Price: low to high"], ["rating", "Highest rated"], ["experience", "Most experienced"]]
            .map(([id, title]) => option(id, title, params.sort)).join("")}
        </select></label></div>
      </div>
      <div class="pro-list">${list.length ? list.map((person) => proCard(person, params)).join("")
        : empty("search", "No professionals match", "Try a different appointment time, neighbourhood, or rate.",
          link("Clear filters", browse(trade.id, params.intent ? { intent: params.intent } : {}), "dark"))}</div>
    </section>
  </div>`;
}

function proCard(person, params) {
  return `<article class="panel pro-card">
    ${portrait(person)}
    <div class="pro-copy"><h2>${esc(person.name)}</h2>
      <div class="meta">${rating(person)}<span class="muted">${person.years} yr experience</span></div>
      <p>${esc(person.bio)}</p>
      <div class="pro-badges">${timeBadge(person)}${person.credential ? '<span class="neutral-tag">Self-reported credentials</span>' : ""}</div>
    </div>
    <div class="pro-action"><div><strong>${money(person.price)}</strong><span> / ${M.units[person.unit]}</span>
      ${person.unit === "hourly" ? '<small>2-hour minimum</small>' : ""}</div>
      ${link("View profile", href(`/pros/${person.id}`, params), "dark", "right")}</div>
  </article>`;
}

function profile(r, state) {
  const person = M.pro(r.id, state);
  if (!person?.published) return unavailable();
  const trade = M.service(person.service);
  const params = resultParams(r, state);
  const bookable = M.available(person, params.area, params.appointment, state);
  return `${back("Back to results", browse(trade.id, params))}
  <div class="split-layout">
    <div class="stack">
      <section class="panel profile-intro">
        ${portrait(person, true)}<div><p class="eyebrow">${trade.name}</p><h1>${esc(person.name)}</h1>
        <div class="meta">${rating(person)}<span class="muted">${person.years} years of experience</span></div>${timeBadge(person)}</div>
      </section>
      <section class="panel details">
        <h2>About ${esc(person.name.split(" ")[0])}</h2><p>${esc(person.bio)}</p>
        <dl class="profile-facts"><div><dt>Service areas</dt><dd>${esc(person.areas.join(", "))}</dd></div>
          <div><dt>Languages</dt><dd>${esc(person.languages.join(", ") || "Ask the professional")}</dd></div>
          <div><dt>Credentials</dt><dd>${person.credential ? esc(person.credential) + " · Self-reported" : person.sample ? "Sample profile" : "No credentials listed"}</dd></div></dl>
        <h2>Common jobs</h2><ul class="checks">${trade.tasks.slice(0, 3).map((task) => `<li>${icon("check", 16)}${task}</li>`).join("")}</ul>
      </section>
      <section class="panel details"><h2>Reviews</h2><p>${person.reviews
        ? `${rating(person)} <span class="muted">· Illustrative ratings for this demo</span>` : "New to HandyHive. No reviews yet."}</p></section>
    </div>
    <aside class="panel summary">
      <h2>Request this pro</h2><strong class="summary-price">${price(person)}</strong>
      <p>${priceNote(person)}</p><p class="muted">${icon("pin", 17)} ${esc(params.area)}, ${M.city} · ${M.appointmentLabel(params.appointment)}</p>
      ${bookable ? link("Request this pro", href(`/request/${person.id}`, params), "primary full desktop-request", "right")
        : link("Change area or timing", browse(trade.id, params), "secondary full")}
    </aside>
  </div>
  ${bookable ? `<div class="mobile-request"><strong>${price(person)}</strong>${link("Request this pro", href(`/request/${person.id}`, params), "primary", "right")}</div>` : ""}`;
}

function priceNote(person) {
  if (person.unit === "visit") return "Covers the initial assessment. Labour and materials for repairs require a separate quote and your approval.";
  if (person.unit === "hourly") return `Labour only. Two-hour minimum (${money(person.price * 2)}). Materials or extra work require your approval.`;
  return "Covers the selected standard job. Materials and work outside that scope require your approval.";
}

function checkoutPage(r, state) {
  const person = M.pro(r.id, state);
  if (!person?.published) return unavailable();
  const trade = M.service(person.service);
  const params = resultParams(r, state);
  const previous = state.requests.find((job) => job.intent === params.intent && job.service === trade.id);
  const key = location.hash;
  if (checkout?.key !== key) {
    checkout = { key, intent: previous?.intent || M.id(), area: params.area, appointment: params.appointment,
      scope: previous?.scope || trade.tasks[0], contact: previous?.contact || "In-app message", review: false };
  }
  const details = checkout;
  return `${back("Back to profile", href(`/pros/${person.id}`, params))}
    ${heading(details.review ? "Review your request" : "Tell us about the job", "Your booking is confirmed once the professional accepts.")}
    <div class="split-layout">
      ${details.review ? `<section class="panel details"><h2>Job details</h2>
        <dl class="lines"><div><dt>Work needed</dt><dd>${esc(details.scope)}</dd></div>
          <div><dt>Location</dt><dd>${esc(details.area)}, ${M.city}</dd></div>
          <div><dt>Preferred timing</dt><dd>${M.appointmentLabel(details.appointment)}</dd></div>
          <div><dt>Contact preference</dt><dd>${esc(details.contact)}</dd></div></dl>
        <p class="info-note">The request appears in the contractor demo inbox. This browser demo uses the neighbourhood as a sample address.</p>
        <div class="action-row">${button("Edit details", "edit-request")}${button("Send demo request", "send-request", "primary", "right")}</div>
        <p id="form-error" role="alert" class="error" hidden></p></section>`
      : `<form id="request-form" class="panel details stack"><h2>Job details</h2>
        <label>Work needed<select name="scope">${trade.tasks.map((task) => option(task, task, details.scope)).join("")}</select></label>
        <label>Neighbourhood<select name="area">${areaOptions(details.area)}</select></label>
        ${scheduleFields(details.appointment, "request")}
        <label>Contact preference<select name="contact">${["In-app message", "Request a call"].map((mode) => option(mode, mode, details.contact)).join("")}</select></label>
        <p id="form-error" role="alert" class="error" hidden></p>
        <button class="btn primary form-cta" type="submit">Review request ${icon("right", 17)}</button></form>`}
      <aside class="panel summary"><div class="summary-person">${portrait(person)}<div><h2>${esc(person.name)}</h2><p>${trade.name}</p></div></div>
        <dl class="lines price-lines"><div><dt>${person.unit === "visit" ? "Diagnostic visit" : "Labour / service"}</dt><dd>${person.unit === "hourly" ? `${money(person.price * 2)} min.` : money(person.price)}</dd></div>
        ${person.unit === "visit" ? "<div><dt>Repair labour</dt><dd>Quoted separately</dd></div>" : ""}
        <div><dt>Materials</dt><dd>Quoted if needed</dd></div><div><dt>Platform fee / tax</dt><dd>Not applied in demo</dd></div></dl>
        <p>${priceNote(person)}</p><p class="muted">Sample pricing. No payment is collected.</p>
      </aside>
    </div>`;
}

const statusDescriptions = {
  pending: "Your request is in the professional’s demo inbox. Their response window is three minutes.",
  accepted: "The professional accepted your request. Call or chat to coordinate the details.",
  en_route: "The professional is on the way. Check the tracking panel for updates.",
  arrived: "The professional marked their arrival.",
  declined: "The professional declined this request. You can choose another professional using the same job details.",
  expired: "The response window closed. You can choose another professional using the same job details.",
  cancelled: "This request was cancelled. You can choose another professional using the same job details.",
  in_progress: "The professional marked this job as started.",
  completed: "The professional marked this job as completed.",
};

function countdown(job) {
  return `<span class="countdown">${icon("clock", 17)} <b data-deadline="${job.deadline}">${timeRemaining(job.deadline)}</b><span>to respond</span></span>`;
}

function timeRemaining(deadline) {
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function jobSummary(job) {
  return `<dl class="lines"><div><dt>Work needed</dt><dd>${esc(job.scope)}</dd></div>
    <div><dt>Location</dt><dd>${esc(job.area)}, ${M.city}</dd></div>
    <div><dt>Preferred time</dt><dd>${M.appointmentLabel(job.appointment)}</dd></div>
    <div><dt>Listed rate</dt><dd>${price(job)}</dd></div>
    <div><dt>Contact preference</dt><dd>${esc(job.contact)}</dd></div></dl>`;
}

function journeyProgress(job) {
  const step = M.journeyStatuses.indexOf(job.status);
  if (step < 0) return "";
  const labels = ["Accepted", "On the way", "Arrived", "Work started", "Completed"];
  return `<ol class="journey-progress" aria-label="Booking progress">${labels.map((label, index) =>
    `<li class="${index <= step ? "reached" : ""}" ${index === step ? 'aria-current="step"' : ""}>
      <span aria-hidden="true">${index < step ? icon("check", 12) : ""}</span>${label}</li>`).join("")}</ol>`;
}

function bookings(r, state) {
  if (!r.id) {
    return `${heading("Your bookings", "Track requests and see your upcoming and past jobs.")}
      ${state.requests.length ? `<div class="panel booking-list">${state.requests.map((job) => `
        <a class="booking-row" href="${href(`/bookings/${job.id}`)}"><span class="feature-icon">${icon(M.service(job.service).icon)}</span>
        <div><h2>${esc(job.scope)}</h2><p>${esc(job.proName)} · ${esc(job.area)}</p></div>
        ${statusLabel(job)}${icon("right", 17)}</a>`).join("")}</div>`
      : empty("calendar", "No bookings yet", "Choose a service and request a professional to see your booking here.", link("Explore services", "#/", "primary", "right"))}`;
  }
  const job = state.requests.find((item) => item.id === r.id);
  if (!job) return unavailable();
  const retry = ["declined", "expired", "cancelled"].includes(job.status);
  const person = M.pro(job.proId, state);
  return `${back("Your bookings", "#/bookings")}${heading(esc(job.scope), `${esc(job.proName)} · ${esc(job.area)}`)}
    <div class="split-layout booking-layout"><div class="stack">
      ${Tracking.render(job, "customer")}
      ${Contact.actions(job, "customer", person)}
      <section class="panel details job-state"><div class="section-head">${statusLabel(job)}${job.status === "pending" ? countdown(job) : ""}</div>
        ${job.status === "pending" ? "<h2>Request sent to demo inbox</h2>" : ""}
        <p>${statusDescriptions[job.status]}</p>
        ${journeyProgress(job)}
        <div class="action-row">
          ${M.activeStatuses.includes(job.status) ? link("Open contractor inbox", href("/workspace/jobs", { pro: job.proId, job: job.id }), "subtle", "swap") : ""}
          ${M.cancellableStatuses.includes(job.status) ? `<button class="btn secondary" type="button" data-action="cancel-job" data-job="${esc(job.id)}">Cancel request</button>` : ""}
          ${retry ? link("Choose another pro", browse(job.service, {
            area: job.area, appointment: M.appointmentTime(job.appointment) > Date.now() ? job.appointment : "", intent: job.intent,
          }), "primary", "right") : ""}
        </div>
      </section>
      </div>
      <aside class="panel summary"><h2>Booking details</h2>
        ${jobSummary(job)}</aside>
    </div>`;
}


function proProfileForm(profile, step) {
  const values = profile || {};
  const steps = ["Basics", "Credentials", "Rates & availability", "Preview"];
  let fields;
  if (step === 0) {
    fields = `<label>Display name<input name="name" value="${esc(values.name)}" required maxlength="60" placeholder="e.g. Ananya Rao"></label>
      <label>Service<select name="service" required><option value="">Choose your trade</option>
        ${M.services.map((item) => option(item.id, item.name, values.service)).join("")}</select></label>
      <fieldset><legend>Neighbourhoods you serve</legend><div class="checkboxes">
        ${M.areas.map((area) => `<label><input name="areas" type="checkbox" value="${area}" ${values.areas?.includes(area) ? "checked" : ""}>${area}</label>`).join("")}</div></fieldset>`;
  } else if (step === 1) {
    fields = `<div class="form-grid"><label>Years of experience<input type="number" name="years" min="0" max="70" value="${esc(values.years)}" required></label>
      <label>Languages <span class="optional">optional</span><input name="languages" maxlength="100" value="${esc(values.languages?.join(", "))}" placeholder="e.g. Kannada, Hindi"></label></div>
      <label>About your work<textarea name="bio" required maxlength="360" rows="4" placeholder="What jobs do you take on?">${esc(values.bio)}</textarea></label>
      <label>Public credential <span class="optional">optional</span><input name="credential" value="${esc(values.credential)}" maxlength="100" placeholder="e.g. ITI Electrician certificate"></label>
      <p class="muted">Credentials are displayed as self-reported. Use sample details and leave out private information.</p>`;
  } else if (step === 2) {
    fields = `<div class="form-grid"><label>Rate in rupees<input type="number" min="1" max="100000" name="price" value="${esc(values.price)}" required></label>
      <label>Pricing unit<select name="unit">${Object.entries(M.units).map(([id, label]) => option(id, label, values.unit)).join("")}</select></label></div>
      <label>Availability<select name="next">${timeOptions(values.next || "today")}${option("offline", "Unavailable", values.next)}</select></label>
      <p class="muted">Hourly demo jobs have a two-hour minimum. Customers see this with your rate.</p>`;
  } else {
    fields = `<div class="summary-person">${portrait(values)}<div><h2>${esc(values.name)}</h2><p>${M.service(values.service).name} · ${values.years} years of experience</p></div></div>
      <p>${esc(values.bio)}</p><dl class="lines"><div><dt>Area</dt><dd>${esc(values.areas.join(", "))}</dd></div>
      <div><dt>Listed rate</dt><dd>${price(values)}</dd></div><div><dt>Availability</dt><dd>${timeBadge(values)}</dd></div>
      <div><dt>Credentials</dt><dd>${values.credential ? esc(values.credential) + " · Self-reported" : "None listed"}</dd></div></dl>
      <p class="info-note">Publishing makes this profile visible in the marketplace on this browser. Customers will see “New · No reviews yet.”</p>`;
  }
  return `<ol class="stepper" aria-label="Profile setup progress">${steps.map((label, i) => `<li class="${i <= step ? "reached" : ""}" ${i === step ? 'aria-current="step"' : ""}><span>${i < step ? icon("check", 13) : i + 1}</span><b>${label}</b></li>`).join("")}</ol>
    <form id="join-form" class="panel details stack"><h2>${steps[step]}</h2>${fields}
      <p id="form-error" role="alert" class="error" hidden></p>
      <div class="action-row">${step > 0 ? button("Back", "join-back") : ""}
        <button class="btn primary" type="submit">${step === 3 ? "Publish demo profile" : "Continue"} ${icon("right", 17)}</button></div></form>`;
}

function join(r, state) {
  if (!draft) {
    draft = state.draft?.profile || state.profile || {};
    joinStep = state.draft?.step || 0;
  }
  return `<div class="narrow">${back("Pro profile", "#/workspace/profile")}
    ${heading(state.profile ? "Edit your pro profile" : "Join as a pro", "Set up your profile and choose the jobs you want to take on. Use sample information for this demo.")}
    ${proProfileForm(draft, joinStep)}</div>`;
}

function workspace(r, state) {
  const currentProfile = state.profile;
  if (r.id === "profile") {
    return `${heading("Your pro profile", "Manage how you appear in the demo marketplace.")}
      ${currentProfile ? `<section class="panel details narrow">
        <div class="summary-person">${portrait(currentProfile)}<div><h2>${esc(currentProfile.name)}</h2><p>${M.service(currentProfile.service).name}</p></div></div>
        <dl class="lines"><div><dt>Profile</dt><dd>${currentProfile.published ? "Published in this browser" : "Unpublished"}</dd></div>
        <div><dt>Service areas</dt><dd>${esc(currentProfile.areas.join(", "))}</dd></div><div><dt>Rate</dt><dd>${price(currentProfile)}</dd></div>
        <div><dt>Credentials</dt><dd>${currentProfile.credential ? "Self-reported" : "None listed"}</dd></div></dl>
        <div class="action-row">${link("Edit profile", "#/join", "dark")}${button(currentProfile.published ? "Unpublish" : "Publish profile", "toggle-profile")}
        ${currentProfile.published ? link("View public profile", href(`/pros/${currentProfile.id}`, { area: currentProfile.areas[0] }), "secondary", "upRight") : ""}</div></section>`
        : empty("user", "Create your pro profile", "Add your trade, experience, rates and availability.", link("Join as a pro", "#/join", "primary", "right"))}`;
  }
  if (r.id === "availability") {
    return `${heading("Availability", "Choose when customers can request you.")}
      ${currentProfile ? `<form id="availability-form" class="panel details stack narrow">
        <h2>${esc(currentProfile.name)}</h2><label>Next availability<select name="next">${timeOptions(currentProfile.next)}
          ${option("offline", "Unavailable", currentProfile.next)}</select></label>
        <button class="btn primary form-cta" type="submit">Save availability</button></form>`
      : empty("clock", "Set your availability", "Create a pro profile to start managing your availability.", link("Join as a pro", "#/join", "primary"))}`;
  }
  const people = M.pros(state);
  const selected = M.pro(r.query.get("pro"), state) || currentProfile || people[0];
  const jobs = state.requests.filter((job) => job.proId === selected.id);
  const selectedJob = jobs.find((job) => job.id === r.query.get("job"));
  const pending = jobs.filter((job) => job.status === "pending");
  const other = jobs.filter((job) => job.status !== "pending");
  const panel = (items) => `<div class="panel booking-list">${items.map((job) => `
    <a class="booking-row" href="${href("/workspace/jobs", { pro: selected.id, job: job.id })}">
      <span class="feature-icon">${icon(M.service(job.service).icon)}</span><div><h3>${esc(job.scope)}</h3><p>${esc(job.area)} · ${M.appointmentLabel(job.appointment)}</p></div>
      ${statusLabel(job)}${icon("right", 17)}</a>`).join("")}</div>`;
  return `${heading("Contractor inbox", "Try the professional’s side of a booking. Requests and messages are simulated in this browser.")}
    <div class="workspace-switch panel"><label>Viewing as<select id="workspace-pro">${people.map((person) => option(person.id, person.name, selected.id)).join("")}</select></label>
    ${selectedJob ? link("View as customer", href(`/bookings/${selectedJob.id}`), "secondary", "swap") : link("Customer view", "#/", "secondary", "swap")}</div>
    ${selectedJob ? workspaceJob(selectedJob, selected)
      : `<section class="inbox-section"><div class="section-head"><h2>Incoming requests</h2><span class="neutral-tag">${pending.length} pending</span></div>
        ${pending.length ? panel(pending) : empty("case", "No incoming requests", "Send a request from the customer view and select that professional here.", link("Find professionals", "#/", "dark", "right"))}</section>
        ${other.length ? `<section class="inbox-section"><h2>All other jobs</h2>${panel(other)}</section>` : ""}`}`;
}

function workspaceJob(job, person) {
  const action = (label, id, style = "secondary") => `<button class="btn ${style}" type="button" data-action="pro-job" data-pro="${esc(person.id)}"
    data-job="${esc(job.id)}" data-change="${id}">${label}</button>`;
  const actions = {
    pending: `${action("Accept job", "accept", "primary")}${action("Decline", "decline")}${action("Simulate timeout", "expire", "subtle")}`,
    accepted: action("On my way", "depart", "primary") + action("I’m already here", "arrive"),
    en_route: action("Mark arrival", "arrive", "primary"),
    arrived: action("Start job", "start", "primary"),
    in_progress: action("Mark completed", "complete", "primary"),
  };
  return `${back("Back to inbox", href("/workspace/jobs", { pro: person.id }))}
    <div class="split-layout"><div class="stack"><section class="panel details">
      <div class="section-head">${statusLabel(job)}${job.status === "pending" ? countdown(job) : ""}</div>
      <h2>${esc(job.scope)}</h2><p>${icon("calendar", 16)} ${M.appointmentLabel(job.appointment)}</p>${journeyProgress(job)}
      ${actions[job.status] ? `<div class="action-row">${actions[job.status]}</div>` : ""}
      <p id="form-error" role="alert" class="error" hidden></p></section>
      ${Tracking.render(job, "pro")}${Contact.actions(job, "pro")}</div>
      <aside class="panel summary"><h2>Request details</h2>${jobSummary(job)}</aside></div>`;
}

function account(state) {
  return `${heading("Account", "Explore HandyHive and manage the data stored in this demo.")}
    <div class="stack narrow">
      <section class="panel details"><h2>Appearance</h2><p>Choose how HandyHive looks on this browser.</p>${appearanceChoices()}</section>
      <section class="panel details"><h2>Neighbourhood</h2><p>${esc(state.area)}, ${M.city}</p>${button("Change area", "location")}</section>
      <section class="panel details"><h2>Professional workspace</h2><p>Try the inbox with a sample profile or publish a demo profile of your own.</p>
        <div class="action-row">${link("Open contractor demo", "#/workspace/jobs", "dark", "swap")}
          ${link(state.profile ? "Manage pro profile" : "Join as a pro", state.profile ? "#/workspace/profile" : "#/join")}</div></section>
      <section class="panel details"><h2>Help & demo data</h2><p>Replay the walkthrough or clear demo bookings, profiles and preferences on this browser.</p>
        <div class="action-row">${button("Replay walkthrough", "start-tour")}${button("Reset demo data", "reset-dialog", "subtle")}</div></section>
    </div>`;
}

function appearanceChoices() {
  return `<fieldset class="appearance-choices"><legend class="sr-only">Theme</legend>
    ${Object.entries(Appearance.options).map(([value, label]) => `<label>
      <input type="radio" name="appearance" value="${value}" ${Appearance.choice === value ? "checked" : ""}>
      <span>${label}</span></label>`).join("")}</fieldset>`;
}

function unavailable() {
  return empty("search", "Page unavailable", "This page or profile may no longer be available in this demo.", link("Explore services", "#/", "primary"));
}

function render(focus = false) {
  const r = route();
  const state = M.current();
  Walkthrough.clear();
  shell(r, state);
  const views = {
    "": () => explore(state), services: () => results(r, state), pros: () => profile(r, state),
    request: () => checkoutPage(r, state), bookings: () => bookings(r, state),
    join: () => join(r, state), workspace: () => workspace(r, state), account: () => account(state),
  };
  content.className = r.page ? "wrap page" : "wrap home-page";
  content.innerHTML = (Object.hasOwn(views, r.page) ? views[r.page] : unavailable)();
  if (dialog.open && !focusReturn?.isConnected && focusReturn?.dataset.job) {
    const { action, job } = focusReturn.dataset;
    focusReturn = content.querySelector('[data-action="' + CSS.escape(action) + '"][data-job="' + CSS.escape(job) + '"]') || content;
  }
  document.title = `${content.querySelector("h1,h2")?.textContent.trim() || "Local home services"} · HandyHive`;
  if (focus) {
    window.scrollTo(0, 0);
    content.focus({ preventScroll: true });
  }
  Contact.sync(state);
  Tracking.refresh(state.requests);
  Walkthrough.sync(r.page, location.hash);
}

function formError(message, form = content) {
  const target = form.querySelector("#form-error");
  if (!target) return announce(message);
  target.textContent = message;
  target.hidden = false;
}

function scheduleValue(form) {
  const { date, time } = form.elements;
  const error = form.querySelector("[data-schedule-error]");
  const appointment = date.value && time.value ? date.value + "T" + time.value : "";
  let message = "";
  if (!appointment && (date.value || time.value)) message = "Choose both a date and a time, or select Flexible.";
  else if (appointment && !(M.appointmentTime(appointment) > Date.now())) message = "Choose a time in the future (IST).";
  error.textContent = message;
  error.hidden = !message;
  if (!message) return appointment;
  (date.value ? time : date).focus();
  return null;
}

function completeTour() {
  M.save({ ...M.read(), tutorial: Walkthrough.version });
}

function updateDraft(form) {
  const values = new FormData(form);
  if (joinStep === 0) {
    const name = values.get("name").trim();
    const areas = values.getAll("areas");
    if (!name || !areas.length) return "Enter a display name and choose at least one neighbourhood.";
    draft = { ...draft, name, service: values.get("service"), areas };
  } else if (joinStep === 1) {
    const bio = values.get("bio").trim();
    if (!bio) return "Tell customers a little about your work.";
    draft = { ...draft, years: Number(values.get("years")), bio, credential: values.get("credential").trim(),
      languages: values.get("languages").split(",").map((language) => language.trim()).filter(Boolean) };
  } else if (joinStep === 2) {
    draft = { ...draft, price: Number(values.get("price")), unit: values.get("unit"), next: values.get("next") };
  }
  return "";
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();
  const r = route();
  const state = M.current();
  const data = new FormData(form);
  if (form.id === "search-form") {
    const value = data.get("query").trim();
    const matches = M.matches(value);
    if (matches.length === 1) go(browse(matches[0].id));
    else suggestions(value, true);
  } else if (form.classList.contains("filters-form")) {
    const appointment = scheduleValue(form);
    if (appointment === null) return;
    const params = { ...resultParams(r, state), area: data.get("area"), max: data.get("max"), appointment };
    if (dialog.open) dialog.close();
    go(browse(form.dataset.service, params));
  } else if (form.id === "area-form") {
    const area = data.get("area");
    M.save({ ...state, area });
    dialog.close();
    if (r.page === "services") go(browse(r.id, { ...resultParams(r, state), area }));
    else if (r.page === "pros" || r.page === "request") go(href(`/${r.page}/${r.id}`, { ...resultParams(r, state), area }));
    else render();
  } else if (form.id === "request-form") {
    const appointment = scheduleValue(form);
    if (appointment === null) return;
    const details = { scope: data.get("scope"), area: data.get("area"), contact: data.get("contact"), appointment };
    if (!M.available(M.pro(r.id, state), details.area, appointment, state)) {
      return formError("This professional isn’t available for that neighbourhood or timing.");
    }
    Object.assign(checkout, details, { review: true });
    render(true);
  } else if (form.id === "join-form") {
    const error = updateDraft(form);
    if (error) return formError(error);
    if (joinStep === 3) {
      const profile = { ...draft, id: state.profile?.id || M.id(), sample: false, published: true };
      M.save({ ...state, profile, draft: null });
      draft = null;
      joinStep = 0;
      go("#/workspace/profile");
      announce("Your demo profile is published.");
    } else {
      joinStep += 1;
      M.save({ ...state, draft: { profile: draft, step: joinStep } });
      render(true);
    }
  } else if (form.id === "availability-form" && state.profile) {
    M.save({ ...state, profile: { ...state.profile, next: data.get("next") } });
    announce("Availability saved.");
  } else if (form.id === "message-form") {
    Contact.send(form);
  }
});

function suggestions(value, submitted = false) {
  const target = $("#search-suggestions");
  if (!target) return;
  if (!value && !submitted) {
    target.hidden = true;
    return;
  }
  const matches = M.matches(value);
  target.hidden = false;
  target.innerHTML = matches.length
    ? `<p>${submitted ? "Choose a matching service" : "Suggested services"}</p>
      ${matches.map((trade) => `<a href="${browse(trade.id)}">${icon(trade.icon, 17)} ${trade.name} ${icon("right", 16)}</a>`).join("")}`
    : "<p>No matching service. Try plumbing, electrical, cleaning or painting.</p>";
}

document.addEventListener("input", (event) => {
  if (event.target.id === "service-search") suggestions(event.target.value.trim());
  if (event.target.id === "chat-message") Contact.saveDraft(event.target);
});

document.addEventListener("change", (event) => {
  const r = route();
  if (event.target.name === "appearance") {
    Appearance.set(event.target.value);
  } else if (event.target.id === "sort") {
    go(browse(r.id, { ...resultParams(r, M.read()), sort: event.target.value }));
  } else if (event.target.id === "workspace-pro") {
    go(href("/workspace/jobs", { pro: event.target.value }));
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    content.focus();
    return;
  }
  const control = event.target.closest("[data-action]");
  if (!control) {
    if (dialog.open && event.target.closest("a[href^='#']")) dialog.close();
    return;
  }
  const r = route();
  const state = M.current();
  const action = control.dataset.action;
  switch (action) {
    case "close": dialog.close(); break;
    case "appearance":
      openDialog("Appearance", appearanceChoices());
      break;
    case "location":
      openDialog("Choose your neighbourhood", `<form id="area-form" class="stack"><label>Area in ${M.city}
        <select name="area">${areaOptions(r.query.get("area") || state.area)}</select></label>
        <button class="btn primary" type="submit">Use this area</button></form>`);
      break;
    case "filters": openDialog("Filter professionals", filterForm(resultParams(r, state), r.id, "filter-sheet")); break;
    case "appointment-offset":
    case "appointment-clear": {
      const field = control.closest(".schedule-field");
      const offset = Number(control.dataset.minutes);
      const [date, time] = action === "appointment-clear" ? ["", ""]
        : M.localAppointment(Math.ceil(Date.now() / 60_000) * 60_000 + offset * 60_000).split("T");
      field.querySelector('[name="date"]').value = date;
      field.querySelector('[name="time"]').value = time;
      field.querySelector("[data-schedule-error]").hidden = true;
      break;
    }
    case "help":
      openDialog("Help", `<div class="stack"><p>Use the customer view to request a professional and the contractor inbox to respond. The demo keeps your activity in this browser.</p>
        ${button("Replay walkthrough", "start-tour", "dark", "right")}</div>`);
      break;
    case "start-tour":
      if (dialog.open) dialog.close();
      Walkthrough.start(control, completeTour);
      go("#/");
      break;
    case "skip-tour":
      if (Walkthrough.isActive()) Walkthrough.finish();
      else {
        completeTour();
        render();
        content.focus({ preventScroll: true });
      }
      break;
    case "edit-request":
      checkout.review = false;
      render(true);
      break;
    case "send-request": {
      control.disabled = true;
      const result = M.request({ ...checkout, proId: r.id });
      if (result.error) {
        control.disabled = false;
        formError(result.error);
        break;
      }
      checkout = null;
      go(href(`/bookings/${result.job.id}`));
      announce("Request added to the contractor demo inbox.");
      break;
    }
    case "cancel-job":
      openDialog("Cancel this request?", `<p>You can choose another professional using the same job details.</p><div class="action-row">
        ${button("Keep request", "close")}
        <button class="btn dark" type="button" data-action="confirm-cancel" data-job="${esc(control.dataset.job)}">Cancel request</button></div>`);
      break;
    case "confirm-cancel": {
      const result = M.transition(control.dataset.job, "cancel", "customer");
      dialog.close();
      render();
      announce(result.error || "Request cancelled.");
      break;
    }
    case "pro-job": {
      const { job, change, pro } = control.dataset;
      const result = M.transition(job, change, "pro", pro);
      render();
      content.focus({ preventScroll: true });
      if (result.error) formError(result.error);
      else announce(M.statuses[result.job.status]);
      break;
    }
    case "booking-call":
    case "booking-chat": {
      const job = state.requests.find((item) => item.id === control.dataset.job);
      Contact.open(job, control.dataset.role, action === "booking-call" ? "call" : "chat");
      break;
    }
    case "quick-message":
      Contact.quickMessage(Number(control.dataset.index));
      break;
    case "call-connecting":
    case "call-connected":
    case "call-unavailable":
    case "call-ended":
      Contact.advanceCall(action.slice(5));
      break;
    case "tracking": {
      const { job, pro, change } = control.dataset;
      const result = M.track(job, pro, change);
      if (result.error) announce(result.error);
      else {
        Tracking.refresh(M.read().requests);
        const panel = control.closest(".tracking-panel");
        if (control.hidden) panel.querySelector(".tracking-controls button:not([hidden])")?.focus();
      }
      break;
    }
    case "map-zoom-in":
    case "map-recenter":
      Tracking.zoom(control, action === "map-recenter");
      break;
    case "join-back":
      joinStep -= 1;
      M.save({ ...state, draft: { profile: draft, step: joinStep } });
      render(true);
      break;
    case "toggle-profile": {
      const published = !state.profile.published;
      M.save({ ...state, profile: { ...state.profile, published } });
      render();
      announce(published ? "Demo profile published." : "Demo profile unpublished.");
      break;
    }
    case "reset-dialog":
      openDialog("Reset this demo?", `<p>This clears bookings, demo messages, pro profiles and preferences saved in this browser.</p>
        <div class="action-row">${button("Keep data", "close")}${button("Reset demo data", "reset", "dark")}</div>`);
      break;
    case "reset":
      M.reset();
      Appearance.set("system");
      Contact.reset();
      draft = null;
      joinStep = 0;
      checkout = null;
      dialog.close();
      go("#/");
      announce("Demo data cleared.");
      break;
  }
});

window.addEventListener("hashchange", () => {
  if (dialog.open) dialog.close();
  render(true);
});
window.addEventListener("storage", (event) => {
  if (event.key === M.storageKey && ["bookings", "workspace", "services"].includes(route().page)) render();
});
window.setInterval(() => {
  const state = M.read();
  if (M.expire(state)) {
    M.save(state);
    if (["bookings", "workspace"].includes(route().page)) {
      render();
      announce("A request’s response window expired.");
    }
  }
  document.querySelectorAll("[data-deadline]").forEach((node) => {
    node.textContent = timeRemaining(Number(node.dataset.deadline));
  });
  Tracking.refresh(state.requests);
}, 1000);

render();
