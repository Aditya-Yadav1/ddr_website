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
  brush: '<path d="M14 2h4l-5 12H9zM8 13h6l3 8H3z" fill="currentColor" stroke="none"/>',
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
let renderedAccount;

function announce(message) {
  clearTimeout(toastTimer);
  toast.textContent = t(message);
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 4200);
}

function openDialog(title, body, sheet = "") {
  focusReturn = document.activeElement;
  dialog.dataset.sheet = sheet;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>
    <button class="icon-btn" type="button" data-action="close" aria-label="${t("Close")}">${icon("close")}</button></div>${body}`;
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
  return `<span class="status ${job.status}"><span></span>${t(M.statuses[job.status])}</span>`;
}

function timeBadge(person, timing = "") {
  const enabled = timing === "now" ? M.immediateEnabled(person) : M.acceptsAppointments(person);
  const label = timing === "now" ? (enabled ? "Taking immediate requests" : "Immediate requests off")
    : (enabled ? "Takes appointments" : "Appointments off");
  return `<span class="status ${enabled ? "available" : ""}"><span></span>${t(label)}</span>`;
}

function portrait(person, large = false) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const image = person.photo ? `<img src="assets/pro-${person.photo}.jpg" alt="" loading="lazy">` : "";
  return `<span class="portrait ${large ? "portrait-large" : ""}"><span>${esc(initials)}</span>${image}</span>`;
}

function rating(person) {
  return `<span class="muted">${person.sample ? "Demo profile" : "New professional"} · No reviews yet</span>`;
}

function price(person) {
  if (person.unit === "hourly") return `${money(person.price)} / ${t("hour")}`;
  return `${money(person.price)} / ${t(M.units[person.unit])}`;
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

const workerTabs = [
  ["Today", "today", "home"],
  ["Jobs", "jobs", "case"],
  ["Schedule", "schedule", "calendar"],
  ["Profile", "profile", "user"],
];

function workerLink(page, person, job) {
  return href(`/workspace/${page}`, { ...(person ? { pro: person.id } : {}), ...(job ? { job: job.id } : {}) });
}

function workerContext(r, state) {
  if (r.page === "join") return { page: "profile" };
  if (r.page !== "workspace") return null;
  const page = r.id === "availability" ? "schedule" : r.id || "today";
  const requestedPro = r.query.get("pro");
  const jobId = page === "jobs" ? r.query.get("job") : null;
  const job = jobId ? state.requests.find((item) => item.id === jobId) : null;
  const person = Live.enabled ? state.profile : M.pro(requestedPro || job?.proId, state) || state.profile;
  return { page, person, job: job?.proId === person?.id ? job : null, jobId, date: r.query.get("date"),
    practice: !Live.enabled && page === "jobs" && r.query.get("tour") === "sample" && person?.sample };
}

function shell(r, state, worker) {
  const workspace = workerLink("today", worker?.person);
  const tabs = worker ? workerTabs.map(([label, page, glyph]) => [
    label, workerLink(page, worker.person), glyph, worker.page === page,
  ]) : [
    ["Explore", "#/", "home", ["", "services", "pros", "request"].includes(r.page)],
    ["Bookings", "#/bookings", "calendar", r.page === "bookings"],
    ["Account", "#/account", "user", r.page === "account"],
  ];
  const nav = (mobile) => tabs.map(([label, url, glyph, selected]) =>
    `<a href="${esc(url)}" ${selected ? 'aria-current="page"' : ""}>${mobile ? icon(glyph, 21) : ""}<span>${t(label)}</span></a>`).join("");

  $("#header").innerHTML = `<div class="header-inner wrap">
    <a class="brand" href="${esc(worker ? workspace : "#/")}" aria-label="${t(worker ? "HandyHive Work home" : "HandyHive home")}"><span class="brand-icon">${icon("hive", 24)}</span><span>handy<span class="brand-end">hive</span>${worker ? '<span class="brand-work">Work</span>' : ""}</span></a>
    ${worker ? "" : `<button class="location" type="button" data-action="location" aria-label="Change area, ${esc(state.area)}">
      ${icon("pin", 17)}<span>${esc(state.area)}</span>${icon("chevron", 13)}
    </button>`}
    <nav class="desktop-nav" aria-label="${t(worker ? "Worker navigation" : "Customer navigation")}">${nav(false)}</nav>
    <button class="icon-btn appearance-shortcut" type="button" data-action="appearance" aria-label="${t("Appearance")}" title="${t("Appearance")}">${icon("appearance", 19)}</button>
    <div class="header-actions">${worker ? link(t("Book a service"), "#/", "subtle") : link("Find work", workspace, "dark", "case")}</div>
  </div>`;
  $("#tabs").classList.toggle("worker-tabs", Boolean(worker));
  $("#tabs").setAttribute("aria-label", t(worker ? "Worker navigation" : "Customer navigation"));
  $("#tabs").innerHTML = nav(true);
  $(".skip-link").textContent = t("Skip to content");
  $("#footer").innerHTML = `<div class="wrap footer-inner"><span>HandyHive <span class="footer-dot">·</span> ${t(M.city)} ${t("marketplace demo")}</span>
    <div><button type="button" data-action="help">${t("Help")}</button><a href="${worker ? "#/" : workspace}">${t(worker ? "Book a service" : "Find work")}</a>
    <a href="#/terms">${t("Terms of use")}</a><a href="#/privacy">${t("Privacy")}</a></div></div>`;
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
  ${!Live.enabled && state.tutorial !== Walkthrough.version && !Walkthrough.isActive() ? `<aside class="tour-offer"><div>${icon("help", 19)}<span>First time here?</span></div>
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
    ${link("Find work", workerLink("today"), "dark", "right")}</section>`;
}

function resultParams(r, state) {
  const appointment = r.query.get("appointment") || "";
  return {
    area: M.areas.includes(r.query.get("area")) ? r.query.get("area") : state.area,
    appointment: Number.isFinite(M.appointmentTime(appointment)) ? appointment : "",
    timing: !appointment && r.query.get("timing") === "now" ? "now" : "",
    sort: ["recommended", "price", "experience"].includes(r.query.get("sort")) ? r.query.get("sort") : "recommended",
    max: Math.max(0, Number(r.query.get("max")) || 0),
    intent: r.query.get("intent") || "",
  };
}

function scheduleFields({ appointment, timing }, id) {
  const [date = "", time = ""] = appointment.split("T");
  return `<fieldset class="schedule-field">
    <legend>When do you need help?</legend>
    <input type="hidden" name="timing" value="${timing === "now" ? "now" : ""}">
    <div class="schedule-inputs">
      <label>Date<input type="date" name="date" min="${M.localAppointment(Date.now()).slice(0, 10)}" value="${esc(date)}" aria-describedby="${id}-schedule-note"></label>
      <label>Time<input type="time" name="time" value="${esc(time)}" aria-describedby="${id}-schedule-note"></label>
    </div>
    <div class="schedule-shortcuts">
      <button class="btn secondary" type="button" data-action="appointment-now" aria-pressed="${timing === "now"}">Request now</button>
      <button class="btn secondary" type="button" data-action="appointment-offset" data-minutes="30">In 30 min</button>
      <button class="btn secondary" type="button" data-action="appointment-offset" data-minutes="60">In 1 hour</button>
      <button class="btn subtle" type="button" data-action="appointment-clear" aria-pressed="${!appointment && timing !== "now"}">Flexible</button>
    </div>
    <p class="muted schedule-note" id="${id}-schedule-note">Times are in IST. Request now checks who’s taking immediate requests. Arrival time is agreed with the worker.</p>
    <p class="error" data-schedule-error role="alert" hidden></p>
  </fieldset>`;
}

function filterForm(params, serviceId, id = "results") {
  return `<form class="stack filters-form" data-service="${serviceId}">
    <label>Neighbourhood<select name="area">${areaOptions(params.area)}</select></label>
    ${scheduleFields(params, id)}
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
    && Live.available(person, params, state) && (!params.max || person.price <= params.max));
  const compare = {
    recommended: (a, b) => b.years - a.years,
    price: (a, b) => a.price - b.price,
    experience: (a, b) => b.years - a.years,
  };
  list.sort(compare[params.sort]);
  const label = list.length === 1 ? "1 professional" : `${list.length} professionals`;
  return `${back("All services", "#/")}
  <div class="results-heading">
    <span class="feature-icon">${icon(trade.icon, 26)}</span>
    ${heading(`${trade.name} professionals`, `${icon("pin", 17)} ${esc(params.area)}, ${M.city} · ${M.appointmentLabel(params.appointment, params.timing)}`)}
  </div>
  <div class="results-layout">
    <aside class="panel filter-side"><h2>${icon("sliders", 19)} Filters</h2>${filterForm(params, trade.id)}</aside>
    <section aria-label="Available professionals">
      <div class="result-toolbar"><span><b>${label}</b><span class="muted result-area"> in ${esc(params.area)}</span></span>
        <div class="action-row"><button class="btn secondary filter-mobile" type="button" data-action="filters">${icon("sliders", 16)} Filters</button>
        <label class="sort"><span class="sr-only">Sort professionals</span><select id="sort">
          ${[["recommended", "Recommended"], ["price", "Price: low to high"], ["experience", "Most experienced"]]
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
      <div class="pro-badges">${timeBadge(person, params.timing)}${person.credential ? '<span class="neutral-tag">Self-reported credentials</span>' : ""}</div>
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
  const bookable = Live.available(person, params, state);
  return `${back("Back to results", browse(trade.id, params))}
  <div class="split-layout">
    <div class="stack">
      <section class="panel profile-intro">
        ${portrait(person, true)}<div><p class="eyebrow">${trade.name}</p><h1>${esc(person.name)}</h1>
        <div class="meta">${rating(person)}<span class="muted">${person.years} years of experience</span></div>${timeBadge(person, params.timing)}</div>
      </section>
      <section class="panel details">
        <h2>About ${esc(person.name.split(" ")[0])}</h2><p>${esc(person.bio)}</p>
        <dl class="profile-facts"><div><dt>Service areas</dt><dd>${esc(person.areas.join(", "))}</dd></div>
          <div><dt>Languages</dt><dd>${esc(person.languages.join(", ") || "Ask the professional")}</dd></div>
          <div><dt>Credentials</dt><dd>${person.credential ? esc(person.credential) + " · Self-reported" : person.sample ? "Sample profile" : "No credentials listed"}</dd></div></dl>
        <h2>Common jobs</h2><ul class="service-list">${trade.tasks.slice(0, 3).map((task) => `<li>${task}</li>`).join("")}</ul>
      </section>
      <section class="panel details"><h2>Reviews</h2><p>No customer reviews have been collected for this demo.</p></section>
    </div>
    <aside class="panel summary">
      <h2>Request this pro</h2><strong class="summary-price">${price(person)}</strong>
      <p>${priceNote(person)}</p><p class="muted">${icon("pin", 17)} ${esc(params.area)}, ${M.city} · ${M.appointmentLabel(params.appointment, params.timing)}</p>
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
    checkout = { key, intent: previous?.intent || M.id(), area: params.area, appointment: params.appointment, timing: params.timing,
      scope: previous?.scope || trade.tasks[0], contact: previous?.contact || "In-app message", review: false };
  }
  const details = checkout;
  return `${back("Back to profile", href(`/pros/${person.id}`, params))}
    ${heading(details.review ? "Review your request" : "Tell us about the job", "Your booking is confirmed once the professional accepts.")}
    <div class="split-layout">
      ${details.review ? `<section class="panel details"><h2>Job details</h2>
        <dl class="lines"><div><dt>Work needed</dt><dd>${esc(details.scope)}</dd></div>
          <div><dt>Location</dt><dd>${esc(details.area)}, ${M.city}</dd></div>
          <div><dt>Preferred timing</dt><dd>${M.appointmentLabel(details.appointment, details.timing)}</dd></div>
          <div><dt>Estimated duration</dt><dd>${M.duration(person)} min</dd></div>
          <div><dt>Contact preference</dt><dd>${esc(details.contact)}</dd></div></dl>
        <p class="info-note">${Live.enabled ? "The worker will see this request in Jobs. Use a neighbourhood and sample details for this preview." : "The request appears in the worker’s demo jobs. This browser demo uses the neighbourhood as a sample address."}</p>
        <div class="action-row">${button("Edit details", "edit-request")}${button(Live.enabled ? "Send request" : "Send demo request", "send-request", "primary", "right")}</div>
        <p id="form-error" role="alert" class="error" hidden></p></section>`
      : `<form id="request-form" class="panel details stack"><h2>Job details</h2>
        <label>Work needed<select name="scope">${trade.tasks.map((task) => option(task, task, details.scope)).join("")}</select></label>
        <label>Neighbourhood<select name="area">${areaOptions(details.area)}</select></label>
        ${scheduleFields(details, "request")}
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
  return `<span class="countdown">${icon("clock", 17)} <b data-deadline="${job.deadline}">${timeRemaining(job.deadline)}</b><span>${t("to respond")}</span></span>`;
}

function timeRemaining(deadline) {
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (seconds >= 3600) return t("{hours}h {minutes}m", { hours: Math.floor(seconds / 3600), minutes: Math.floor(seconds / 60) % 60 });
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function jobTiming(job) {
  return t(M.appointmentLabel(job.appointment, job.timing, document.documentElement.lang));
}

function jobSummary(job) {
  return `<dl class="lines"><div><dt>${t("Work needed")}</dt><dd>${esc(t(job.scope))}</dd></div>
    <div><dt>${t("Location")}</dt><dd>${esc(t(job.area))}, ${t(M.city)}</dd></div>
    <div><dt>${t("Preferred time")}</dt><dd>${jobTiming(job)}</dd></div>
    <div><dt>${t("Estimated duration")}</dt><dd>${t("{minutes} min", { minutes: M.duration(job) })}</dd></div>
    <div><dt>${t("Listed rate")}</dt><dd>${price(job)}</dd></div>
    <div><dt>${t("Contact preference")}</dt><dd>${esc(t(job.contact))}</dd></div></dl>`;
}

function journeyProgress(job) {
  const step = M.journeyStatuses.indexOf(job.status);
  if (step < 0) return "";
  const labels = ["Accepted", "On the way", "Arrived", "Work started", "Completed"];
  return `<ol class="journey-progress" aria-label="${t("Booking progress")}">${labels.map((label, index) =>
    `<li class="${index <= step ? "reached" : ""}" ${index === step ? 'aria-current="step"' : ""}>
      <span aria-hidden="true">${index < step ? icon("check", 12) : ""}</span>${t(label)}</li>`).join("")}</ol>`;
}

function bookings(r, state) {
  const requests = Live.enabled ? state.requests.filter((job) => job.customerId === state.account?.id) : state.requests;
  if (!r.id) {
    return `${heading("Your bookings", "Track requests and see your upcoming and past jobs.")}
      ${requests.length ? `<div class="panel booking-list">${requests.map((job) => `
        <a class="booking-row" href="${href(`/bookings/${job.id}`)}"><span class="feature-icon">${icon(M.service(job.service).icon)}</span>
        <div><h2>${esc(job.scope)}</h2><p>${esc(job.proName)} · ${esc(job.area)}</p></div>
        ${statusLabel(job)}${icon("right", 17)}</a>`).join("")}</div>`
      : empty("calendar", "No bookings yet", "Choose a service and request a professional to see your booking here.", link("Explore services", "#/", "primary", "right"))}`;
  }
  const job = requests.find((item) => item.id === r.id);
  if (!job) return unavailable();
  const retry = ["declined", "expired", "cancelled"].includes(job.status);
  const person = M.pro(job.proId, state);
  return `${back("Your bookings", "#/bookings")}${heading(esc(job.scope), `${esc(job.proName)} · ${esc(job.area)}`)}
    <div class="split-layout booking-layout"><div class="stack">
      ${Tracking.render(job, "customer")}
      ${Contact.actions(job, "customer", person)}
      <section class="panel details job-state"><div class="section-head">${statusLabel(job)}${job.status === "pending" ? countdown(job) : ""}</div>
        ${job.status === "pending" ? "<h2>Request sent</h2>" : ""}
        <p>${Live.enabled && job.status === "pending" ? "The worker can accept or decline until the response deadline." : statusDescriptions[job.status]}</p>
        ${journeyProgress(job)}
        <div class="action-row">
          ${!Live.enabled && M.activeStatuses.includes(job.status) ? link("View as worker (demo)", workerLink("jobs", { id: job.proId }, job), "subtle", "swap") : ""}
          ${M.cancellableStatuses.includes(job.status) ? `<button class="btn secondary" type="button" data-action="cancel-job" data-job="${esc(job.id)}">Cancel request</button>` : ""}
          ${retry ? link("Choose another pro", browse(job.service, {
            area: job.area, appointment: M.appointmentTime(job.appointment) > Date.now() ? job.appointment : "", timing: job.timing || "", intent: job.intent,
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
  const steps = ["Basics", "Work and rate", "Preview"].map((label) => t(label));
  let fields;
  if (step === 0) {
    fields = `<label>${t("Display name")}<input name="name" value="${esc(values.name)}" required maxlength="60" placeholder="${t("e.g. Ananya Rao")}"></label>
      <label>${t("Service")}<select name="service" required><option value="">${t("Choose your trade")}</option>
        ${M.services.map((item) => option(item.id, t(item.name), values.service)).join("")}</select></label>
      <fieldset><legend>${t("Neighbourhoods you serve")}</legend><div class="checkboxes">
        ${M.areas.map((area) => `<label><input name="areas" type="checkbox" value="${area}" ${values.areas?.includes(area) ? "checked" : ""}>${t(area)}</label>`).join("")}</div></fieldset>`;
  } else if (step === 1) {
    fields = `<div class="form-grid"><label>${t("Years of experience")}<input type="number" name="years" min="0" max="70" value="${esc(values.years)}" required></label>
      <label>${t("Languages")} <span class="optional">${t("optional")}</span><input name="languages" maxlength="100" value="${esc(values.languages?.join(", "))}" placeholder="${t("e.g. Hindi, English")}"></label></div>
      <label>${t("About your work")}<textarea name="bio" required maxlength="360" rows="4" placeholder="${t("What jobs do you take on?")}">${esc(values.bio)}</textarea></label>
      <label>${t("Public credential")} <span class="optional">${t("optional")}</span><input name="credential" value="${esc(values.credential)}" maxlength="100" placeholder="${t("e.g. ITI Electrician certificate")}"></label>
      <p class="muted">${t("Credentials are displayed as self-reported. Use sample details and leave out private information.")}</p>
      <div class="form-grid"><label>${t("Rate in rupees")}<input type="number" min="1" max="100000" name="price" value="${esc(values.price)}" required></label>
      <label>${t("Pricing unit")}<select name="unit">${Object.entries(M.units).map(([id, label]) => option(id, t(label), values.unit)).join("")}</select></label></div>
      <p class="muted">${t("Hourly demo jobs have a two-hour minimum. Customers see this with your rate.")}</p>`;
  } else {
    fields = `<div class="summary-person">${portrait(values)}<div><h2>${esc(values.name)}</h2><p>${t(M.service(values.service).name)} · ${t("{years} years of experience", { years: values.years })}</p></div></div>
      <p>${esc(values.bio)}</p><dl class="lines"><div><dt>${t("Area")}</dt><dd>${values.areas.map((area) => esc(t(area))).join(", ")}</dd></div>
      <div><dt>${t("Listed rate")}</dt><dd>${price(values)}</dd></div>
      <div><dt>${t("Credentials")}</dt><dd>${values.credential ? esc(values.credential) + " · " + t("Self-reported") : t("None listed")}</dd></div></dl>
      <p class="info-note">${t("Publishing makes this profile visible in the marketplace on this browser. Customers will see “New · No reviews yet.”")}</p>`;
  }
  return `<ol class="stepper" aria-label="${t("Profile setup progress")}">${steps.map((label, i) => `<li class="${i <= step ? "reached" : ""}" ${i === step ? 'aria-current="step"' : ""}><span>${i < step ? icon("check", 13) : i + 1}</span><b>${label}</b></li>`).join("")}</ol>
    <form id="join-form" class="panel details stack"><h2>${steps[step]}</h2>${fields}
      <p id="form-error" role="alert" class="error" hidden></p>
      <div class="action-row">${step > 0 ? button(t("Back"), "join-back") : ""}
        <button class="btn primary" type="submit">${step === 2 ? t("Publish demo profile") : t("Continue")} ${icon("right", 17)}</button></div></form>`;
}

function join(r, state) {
  if (!draft) {
    draft = state.draft?.profile || state.profile || {};
    const saved = state.draft?.step || 0;
    joinStep = state.draft?.version === 2 ? saved : [0, 1, 1, 2][saved] || 0;
  }
  return `<div class="narrow">${back(t("Worker profile"), "#/workspace/profile")}
    ${heading(state.profile ? t("Edit your worker profile") : t("Create your worker profile"), t("Set up your profile and choose the jobs you want to take on. Use sample information for this demo."))}
    ${proProfileForm(draft, joinStep)}</div>`;
}

function workerSwitcher(person, state) {
  if (Live.enabled) return "";
  const samples = M.pros(state).filter((profile) => profile.sample);
  return `<details class="panel worker-switch">
    <summary>${t("Demo profile switcher")}${person?.sample ? ` · ${esc(person.name)}` : ""}</summary>
    <label>${t("View as")}<select id="workspace-pro">
      ${option("", state.profile ? `${t("My profile")} · ${state.profile.name}` : t("Choose a sample worker"), person?.sample ? person.id : "")}
      ${samples.map((sample) => option(sample.id, sample.name, person?.id)).join("")}
    </select></label>
    ${state.profile ? "" : link("Create your own profile", "#/join", "text-btn")}
  </details>`;
}

function workerJobList(jobs, person) {
  return `<div class="panel booking-list">${jobs.map((job) => {
    const unread = M.unread(job, "pro");
    return `<a class="booking-row worker-job-row" href="${esc(workerLink("jobs", person, job))}">
      <span class="feature-icon">${icon(M.service(job.service).icon)}</span>
      <div><h3>${esc(t(job.scope))}</h3><p>${esc(t(job.area))} · ${jobTiming(job)}</p>
      <p>${t("{minutes} min estimated", { minutes: M.duration(job) })} · ${price(job)}${unread ? " · " + t(unread === 1 ? "{count} unread message" : "{count} unread messages", { count: unread }) : ""}</p></div>
      <div class="worker-job-state">${statusLabel(job)}${job.status === "pending" ? countdown(job) : ""}</div>
      ${icon("right", 17)}</a>`;
  }).join("")}</div>`;
}

function workerJobSection(title, jobs, person) {
  return jobs.length ? `<section class="inbox-section"><h2>${title}</h2>${workerJobList(jobs, person)}</section>` : "";
}

function workerTourOffer(state) {
  if (Live.enabled || state.workerTutorial === Walkthrough.version || Walkthrough.isActive()) return "";
  return `<aside class="tour-offer"><p>${t("Try the worker walkthrough")}</p>
    <div class="action-row">${button(t("Show me around"), "start-worker-tour", "text-btn")}
    ${button(t("Skip"), "skip-worker-tour", "subtle")}</div></aside>`;
}

function workerToday(person, jobs, state) {
  if (!person) {
    return `${heading(t("Find work with HandyHive"), t("Offer home services in Delhi and choose which jobs you take on."))}
      <div class="stack narrow">
        ${empty("case", t("Set up your worker profile"), t("Add your trade, service areas and rates to get started."), link(t(state.draft ? "Resume profile setup" : "Create worker profile"), "#/join", "primary", "right"))}
        ${workerTourOffer(state)}
        ${workerSwitcher(person, state)}
      </div>`;
  }
  const now = Date.now();
  const accepted = jobs.filter((job) => job.status === "accepted");
  const active = jobs.filter((job) => ["en_route", "arrived", "in_progress"].includes(job.status)
    || (job.status === "accepted" && (job.timing === "now" || M.appointmentTime(job.appointment) <= now)));
  const incoming = jobs.filter((job) => job.status === "pending").sort((a, b) => a.deadline - b.deadline);
  const upcoming = accepted.filter((job) => M.appointmentTime(job.appointment) > now)
    .sort((a, b) => M.appointmentTime(a.appointment) - M.appointmentTime(b.appointment));
  const flexible = accepted.filter((job) => !job.appointment && job.timing !== "now");
  const hasWork = active.length || incoming.length || upcoming.length || flexible.length;
  return `${heading(t("Today"), esc(person.name) + (person.sample ? " · " + t("Sample worker") : ""))}
    <section class="panel worker-overview" aria-label="${t("Availability")}">
      <div><h2 id="worker-availability" tabindex="-1">${t("Availability")}</h2><p>${person.areas.map((area) => esc(t(area))).join(", ")} · ${t(M.city)}</p></div>
      <div class="action-row">${immediateControl(person)}
      ${link(t("View schedule"), workerLink("schedule", person), "secondary")}</div>
    </section>
    ${workerJobSection(t("Jobs to attend to"), active, person)}
    ${workerJobSection(t("Incoming requests"), incoming, person)}
    ${workerJobSection(t("Next appointment"), upcoming.slice(0, 1), person)}
    ${workerJobSection(t("Accepted jobs with flexible timing"), flexible, person)}
    ${hasWork ? `<div class="action-row worker-actions">${link(t("View all jobs"), workerLink("jobs", person), "secondary", "right")}</div>`
      : `<div class="inbox-section">${empty("calendar", t("You’re all caught up"), t("New requests and upcoming jobs will appear here."), link(t("View all jobs"), workerLink("jobs", person), "secondary"))}</div>`}
    ${workerTourOffer(state)}${workerSwitcher(person, state)}`;
}

function immediateControl(person) {
  if (!person.published) return `<span class="status">${t("Profile unpublished")}</span>`;
  if (person.sample) return timeBadge(person, "now");
  const enabled = M.immediateEnabled(person);
  return `<button class="btn secondary" type="button" data-action="worker-immediate" aria-pressed="${enabled}">${t("Available for requests now")} <span aria-hidden="true">${enabled ? t("On") : t("Off")}</span></button>`;
}

function workerSchedule(person, date, state) {
  if (!person) return empty("calendar", t("Set up your schedule"), t("Create a worker profile to manage your availability."), link(t("Create worker profile"), "#/join", "primary"));
  const today = M.localAppointment(Date.now()).slice(0, 10);
  const selectedDate = Number.isFinite(M.appointmentTime(date + "T00:00")) ? date : today;
  const entries = M.agenda(person, state.requests, selectedDate);
  const shortTime = (timestamp) => {
    const local = M.localAppointment(timestamp);
    return local.startsWith(selectedDate) ? local.slice(11) : local.replace("T", " ");
  };
  const hours = person.hours || M.defaultHours;
  return `<div class="split-layout worker-schedule">
    <div class="stack">
      <section class="panel details">
        <div class="section-head agenda-heading"><h2 id="worker-agenda" tabindex="-1">${t("Day agenda")}</h2>
          <label>${t("Agenda date (IST)")}<input type="date" id="agenda-date" value="${esc(selectedDate)}" required></label>
        </div>
        ${entries.length ? `<ul class="agenda-list">${entries.map(({ job, block, start, end }) => `<li>
          <div><strong>${shortTime(start)} – ${shortTime(end)}</strong>
          ${job ? `<a class="quiet-link" href="${esc(workerLink("jobs", person, job))}">${esc(t(job.scope))}</a><p>${esc(t(job.area))} · ${t(M.statuses[job.status])}</p>` : `<p>${t("Blocked time")}</p>`}</div>
          ${block && !person.sample ? `<button class="btn secondary" type="button" data-action="remove-schedule-block" data-block="${esc(block.id)}"
            aria-label="${esc(t("Remove block from {start} to {end}", { start: shortTime(start), end: shortTime(end) }))}">${t("Remove")}</button>` : ""}</li>`).join("")}</ul>`
        : `<p class="muted">${t("No timed jobs or blocks on this date.")}</p>`}
      </section>
      ${person.sample ? "" : `<form id="schedule-block-form" class="panel details stack">
        <h2>${t("Block time")}</h2><label>${t("Date (IST)")}<input type="date" name="blockDate" min="${today}" value="${selectedDate >= today ? esc(selectedDate) : today}" required></label>
        <div class="form-grid"><label>${t("From")}<input type="time" name="blockStart" required></label><label>${t("To")}<input type="time" name="blockEnd" required></label></div>
        <p class="error" role="alert" hidden data-form-error></p>
        <button class="btn secondary form-cta" type="submit">${t("Block time")}</button>
      </form>`}
    </div>
    <div class="stack">
      <section class="panel details stack"><h2>${t("Immediate requests")}</h2>
        <p class="muted">${t("This setting is separate from your appointment hours.")}</p>
        <div class="action-row">${immediateControl(person)}</div>
      </section>
      ${person.sample ? `<section class="panel details"><h2>${t("Sample working hours")}</h2><p>${person.next === "tomorrow" ? t("Appointments from tomorrow.") : t("Appointments any day.")}</p>
        <p class="muted">${t("{minutes} min travel buffer between jobs.", { minutes: hours.buffer })}</p></section>`
        : `<form id="working-hours-form" class="panel details stack">
          <h2>${t("Working hours (IST)")}</h2>
          ${person.hours ? "" : `<p class="muted" data-legacy-hours>${t("Save these hours to replace your previous appointment setting.")}</p>`}
          <fieldset><legend>${t("Appointment days")}</legend><div class="schedule-days">
            ${[t("Mon"), t("Tue"), t("Wed"), t("Thu"), t("Fri"), t("Sat"), t("Sun")].map((label, index) => {
              const day = (index + 1) % 7;
              return `<label><input type="checkbox" name="days" value="${day}" ${hours.days.includes(day) ? "checked" : ""}>${label}</label>`;
            }).join("")}
          </div></fieldset>
          <p class="muted">${t("Clear all days to pause new appointments. Confirmed jobs stay on your agenda.")}</p>
          <div class="form-grid"><label>${t("From")}<input type="time" name="opens" value="${esc(hours.start)}" required></label>
          <label>${t("To")}<input type="time" name="closes" value="${esc(hours.end)}" required></label></div>
          <label>${t("Travel buffer between jobs (min)")}<input type="number" name="buffer" min="0" max="180" value="${esc(hours.buffer)}" required></label>
          <p class="error" role="alert" hidden data-form-error></p>
          <button class="btn primary form-cta" type="submit">${t("Save working hours")}</button>
        </form>`}
    </div></div>`;
}

function workspace(worker, state) {
  const { page, person, job, jobId } = worker;
  if (page === "today") return workerToday(person, state.requests.filter((item) => item.proId === person?.id), state);
  if (page === "profile") {
    return `${heading(t("Worker profile"), t("Manage how you appear in the demo marketplace."))}
      ${person ? `<section class="panel details narrow">
        <div class="summary-person">${portrait(person)}<div><h2>${esc(person.name)}</h2><p>${t(M.service(person.service).name)}</p></div></div>
        <dl class="lines"><div><dt>${t("Profile")}</dt><dd>${person.sample ? t("Sample profile") : person.published ? t(Live.enabled ? "Published" : "Published in this browser") : t("Unpublished")}</dd></div>
        <div><dt>${t("Service areas")}</dt><dd>${person.areas.map((area) => esc(t(area))).join(", ")}</dd></div><div><dt>${t("Rate")}</dt><dd>${price(person)}</dd></div>
        <div><dt>${t("Credentials")}</dt><dd>${person.credential ? t("Self-reported") : t("None listed")}</dd></div></dl>
        <div class="action-row">${person.sample ? "" : link(t("Edit profile"), "#/join", "dark") + button(t(person.published ? "Unpublish" : "Publish profile"), "toggle-profile")}
        ${person.published ? link(t("View public profile"), href(`/pros/${person.id}`, { area: person.areas[0] }), "secondary", "upRight") : ""}</div></section>`
        : empty("user", t("Create your worker profile"), t("Add your trade, experience, rates and availability."), link(t("Create worker profile"), "#/join", "primary", "right"))}
      ${workerSwitcher(person, state)}`;
  }
  if (page === "schedule") {
    return `${heading(t("Schedule"), person ? esc(person.name) : "")}
      ${workerSchedule(person, worker.date, state)}${workerSwitcher(person, state)}`;
  }
  if (page !== "jobs") return unavailable();
  if (worker.practice) {
    const sample = { scope: M.service(person.service).tasks[0], area: person.areas[0],
      appointment: M.localAppointment(Date.now() + 86_400_000), unit: person.unit, price: person.price, contact: "In-app message" };
    return `${heading(t("Sample request"))}
      <section class="panel details narrow" id="worker-practice-request" tabindex="-1" aria-labelledby="worker-practice-title">
        <h2 id="worker-practice-title">${esc(t(sample.scope))}</h2>${jobSummary(sample)}
      </section>`;
  }
  if (job) return workspaceJob(job, person);
  if (jobId) return empty("case", t("Job unavailable"), t("Open Jobs to see requests for this worker."), link(t("Back to jobs"), workerLink("jobs", person), "primary"));
  if (!person) return `${heading(t("Jobs"))}
    ${empty("case", t("Set up your worker profile"), t("Create a profile to receive requests, or choose a sample worker to try the demo."), link(t("Create worker profile"), "#/join", "primary"))}
    ${workerSwitcher(person, state)}`;
  const jobs = state.requests.filter((item) => item.proId === person.id);
  return `${heading(t("Jobs"), esc(person.name) + (person.sample ? " · " + t("Sample worker") : ""))}
    ${workerJobSection(t("Incoming requests"), jobs.filter((item) => item.status === "pending"), person)}
    ${workerJobSection(t("Accepted and in progress"), jobs.filter((item) => item.status !== "pending" && M.activeStatuses.includes(item.status)), person)}
    ${workerJobSection(t("History"), jobs.filter((item) => !M.activeStatuses.includes(item.status)), person)}
    ${jobs.length ? "" : empty("case", "No jobs yet", "Incoming requests, accepted jobs and job history will appear here.")}
    ${workerSwitcher(person, state)}`;
}

function workspaceJob(job, person) {
  const action = (label, id, style = "secondary") => `<button class="btn ${style}" type="button" data-action="pro-job" data-pro="${esc(person.id)}"
    data-job="${esc(job.id)}" data-change="${id}">${label}</button>`;
  const actions = {
    pending: `${action(t("Accept job"), "accept", "primary")}${action(t("Decline"), "decline")}${Live.enabled ? "" : action(t("Simulate timeout"), "expire", "subtle")}`,
    accepted: action(t("On my way"), "depart", "primary") + action(t("I’m already here"), "arrive"),
    en_route: action(t("Mark arrival"), "arrive", "primary"),
    arrived: action(t("Start job"), "start", "primary"),
    in_progress: action(t("Mark completed"), "complete", "primary"),
  };
  return `${back(t("Back to jobs"), workerLink("jobs", person))}
    <div class="worker-job-heading">${heading(esc(t(job.scope)), `${esc(person.name)} · ${esc(t(job.area))}, ${t(M.city)}`)}
    ${Live.enabled ? "" : link(t("View as customer (demo)"), href(`/bookings/${job.id}`), "secondary", "swap")}</div>
    <div class="split-layout"><div class="stack"><section class="panel details">
      <div class="section-head">${statusLabel(job)}${job.status === "pending" ? countdown(job) : ""}</div>
      <h2>${job.status === "pending" ? t("Respond to request") : t("Job progress")}</h2>${journeyProgress(job)}
      ${actions[job.status] ? `<div class="action-row">${actions[job.status]}</div>` : ""}
      <p id="form-error" role="alert" class="error" hidden></p></section>
      ${Tracking.render(job, "pro")}${Contact.actions(job, "pro")}
      ${["pending", "accepted"].includes(job.status) ? `<form id="job-duration-form" class="panel details stack" data-job="${esc(job.id)}" data-pro="${esc(person.id)}">
        <h2>${t("Time estimate")}</h2><label>${t("Estimated duration (min)")}<input type="number" name="duration" value="${M.duration(job)}" min="15" max="720" required></label>
        <p class="muted">${t("Used to reserve time in your schedule. Your listed rate stays the same.")}</p>
        <p class="error" role="alert" hidden data-form-error></p>
        <button class="btn secondary form-cta" type="submit">${t("Save estimate")}</button>
      </form>` : ""}</div>
      <aside class="panel summary"><h2>${t("Request details")}</h2>${jobSummary(job)}</aside></div>`;
}

function account(state) {
  if (Live.enabled && !state.account) return signInPage();
  return `${heading("Account", "Explore HandyHive and manage the data stored in this demo.")}
    <div class="stack narrow">
      ${Live.enabled ? `<section class="panel details"><h2>${state.account.handle.startsWith("phone_") ? "Phone account" : esc(state.account.handle)}</h2><p>Signed in to the connected preview.</p>
        <div class="action-row">${button("Sign out", "live-logout")}</div></section>
        ${bookingUpdatesPanel(state)}` : ""}
      <section class="panel details"><h2>Appearance</h2><p>Choose how HandyHive looks on this browser.</p>${appearanceChoices()}</section>
      <section class="panel details"><h2>Neighbourhood</h2><p>${esc(state.area)}, ${M.city}</p>${button("Change area", "location")}</section>
      <section class="panel details"><h2>HandyHive Work</h2><p>Manage your worker profile, schedule and jobs.</p>
        <div class="action-row">${link("Find work", workerLink("today"), "dark", "case")}</div></section>
      ${Live.enabled ? "" : `<section class="panel details"><h2>Help & demo data</h2><p>Replay the walkthrough or clear demo bookings, profiles and preferences on this browser.</p>
        <div class="action-row">${button("Replay walkthrough", "start-tour")}${button("Reset demo data", "reset-dialog", "subtle")}</div></section>`}
    </div>`;
}

const updateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function bookingUpdatesPanel(state) {
  const updates = state.bookingUpdates || [];
  return `<section class="panel details"><h2>Booking updates</h2>
    ${updates.length ? `<dl class="lines">${updates.map((update) => {
      const target = update.role === "pro" ? workerLink("jobs", null, { id: update.job }) : href("/bookings/" + update.job);
      return `<div><dt><a href="${esc(target)}">${esc(update.label)}</a></dt>
        <dd><time datetime="${new Date(update.created).toISOString()}">${updateTime.format(update.created)} IST</time></dd></div>`;
    }).join("")}</dl>` : "<p>New requests and changes to your bookings will appear here.</p>"}
    ${typeof state.bookingSms === "boolean" ? `<p>Booking SMS is ${state.bookingSms ? "on" : "off"} for your verified number.</p>
      <div class="action-row">${button(state.bookingSms ? "Turn off booking SMS" : "Turn on booking SMS", "toggle-booking-sms")}</div>` : ""}
  </section>`;
}

let phoneChallenge = null;
function signInPage() {
  const sms = Live.smsSignIn;
  return `<div class="narrow">${heading(t("Sign in to HandyHive"), sms ? "Enter your Indian mobile number to receive a sign-in code by SMS." : t("Use fictional details in the connected preview."))}
    <form id="phone-auth" class="panel details stack">
      <h2>${sms ? "Sign in by phone" : "Phone sign-in preview"}</h2>
      ${sms ? "" : "<p>Use a fictional Indian mobile number. Codes appear here for local testing.</p>"}
      ${phoneChallenge ? `<p>Code requested for ${esc(phoneChallenge.phone)}.</p>
        <p role="status">${sms ? "Check your SMS messages." : `Local test code: <strong>${esc(phoneChallenge.previewCode)}</strong>.`} The code expires after five minutes.</p>
        <label>Six-digit code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>` :
        `<label>Mobile number<input name="phone" type="tel" autocomplete="tel" placeholder="+91 90000 00000" required></label>`}
      <p class="error" role="alert" hidden data-form-error></p>
      <div class="action-row"><button class="btn primary" type="submit">${phoneChallenge ? "Continue with code" : sms ? "Text me a code" : "Get test code"}</button>
      ${phoneChallenge ? `<button class="btn secondary" type="submit" value="restart" formnovalidate>Change number or request again</button>` : ""}</div>
    </form>
    ${sms ? "" : `<form id="preview-auth" class="panel details stack">
      <h2>Test password accounts</h2>
      <label>${t("Username")}<input name="handle" autocomplete="username" pattern="[a-zA-Z0-9_\\-]{3,32}" required></label>
      <label>${t("Password")}<input type="password" name="password" autocomplete="current-password" minlength="12" maxlength="128" required></label>
      <p class="muted">${t("Choose at least 12 characters for your password.")}</p>
      <p class="error" role="alert" hidden data-form-error></p>
      <div class="action-row"><button class="btn primary" type="submit" value="login">${t("Sign in")}</button>
        <button class="btn secondary" type="submit" value="register">${t("Create account")}</button></div>
    </form>`}</div>`;
}

function appearanceChoices() {
  return `<fieldset class="appearance-choices"><legend class="sr-only">${t("Appearance")}</legend>
    ${Object.entries(Appearance.options).map(([value, label]) => `<label>
      <input type="radio" name="appearance" value="${value}" ${Appearance.choice === value ? "checked" : ""}>
      <span>${t(label)}</span></label>`).join("")}</fieldset>`;
}

function unavailable() {
  return empty("search", "Page unavailable", "This page or profile may no longer be available in this demo.", link("Explore services", "#/", "primary"));
}

function policyPage(page) {
  if (Live.enabled && page === "privacy") return `<article class="policy">
    ${back("Home", "#/")}${heading("Privacy notice", "HandyHive connected preview")}
    <section><h2>What this preview stores</h2><p>The local server stores sign-in records, published profiles, bookings, booking updates, scheduling settings and messages. A browser cookie keeps you signed in. Drafts and display preferences stay in your browser.</p></section>
    <section><h2>Phone sign-in and booking updates</h2><p>${Live.smsSignIn ? "Twilio receives your mobile number to send and check sign-in codes. Where booking SMS is available, you can opt in or turn it off in Account. SMS updates contain the booking status and direct you to HandyHive for details." : "Phone sign-in uses fictional numbers and on-screen test codes. Booking updates appear in Account."}</p></section>
    <section><h2>Who can see your information</h2><p>Published profiles appear in search. A booking and its messages are visible to its customer and assigned worker. Google Fonts receives network information when the browser requests fonts.</p></section>
    <section><h2>Using the preview</h2><p>${Live.smsSignIn ? "Use sample details for your bookings." : "Use fictional details and a password unique to this preview."} Signing out ends your browser session. The person running this local server manages its saved data.</p></section>
  </article>`;
  const sections = page === "terms" ? [
    ["Using this demo", "HandyHive is an interactive demonstration of a Delhi home-services marketplace. Sample professionals, photos, rates and bookings illustrate the experience. Submitting a request does not arrange an actual home visit."],
    ["Bookings and payments", "You can explore booking, worker response, scheduling, chat and journey controls. Calls and location tracking are simulated. The demo collects no payments and makes no service or arrival guarantee."],
    ["Information you enter", "Use sample details for profiles and messages. Avoid entering identity documents, payment details, private addresses or other sensitive information. Use the demo respectfully and only enter content you have permission to use."],
    ["Your saved activity", Live.enabled ? "The connected preview saves account and booking activity on the local server. Sign out in Account when finished on a shared browser." : "Your browser keeps demo profiles, bookings and messages. You can remove them using Reset demo data in Account. Clearing browser storage also removes this activity."],
    ["Before a live launch", "Service fulfilment, cancellation, payment and dispute policies will need to be published with the operator’s identity and support contact before real bookings are offered."]
  ] : [
    ["What this demo stores", "HandyHive stores demo profiles, profile drafts, bookings, messages, scheduling preferences, language and walkthrough completion in this browser’s local storage. Appearance preferences are also saved locally. This data persists after a refresh."],
    ["Where information goes", "The application has no account server or shared booking database. Demo form entries are saved in your browser. Pages and images are served by the preview host. Fonts are requested from Google Fonts, so those requests expose network information such as your IP address to that service."],
    ["Calls, location and analytics", "Call and map controls simulate a journey. This version does not request GPS access, dial a phone number, collect payment information or include an analytics script."],
    ["Removing data", "Open Account and choose Reset demo data to clear saved demo activity and reset appearance. You can also clear site data through your browser settings. Anyone with access to this browser profile may be able to view its saved demo activity."],
    ["Scope of this notice", "This notice describes the local prototype. A live service will need updated information about its operator, contact details, hosting, retention and any external communication or payment providers."]
  ];
  return `<article class="policy">${back("Home", "#/")}${heading(page === "terms" ? "Terms of use" : "Privacy notice", "HandyHive local demo · Updated 11 November 2026")}
    ${sections.map(([title, text]) => `<section><h2>${title}</h2><p>${text}</p></section>`).join("")}</article>`;
}

function render(focus = false) {
  const r = route();
  const state = M.current();
  renderedAccount = state.account?.id;
  const worker = workerContext(r, state);
  document.documentElement.lang = worker && state.workerLanguage === "hi" ? "hi-IN" : "en-IN";
  Walkthrough.clear();
  shell(r, state, worker);
  const views = {
    "": () => explore(state), services: () => results(r, state), pros: () => profile(r, state),
    request: () => checkoutPage(r, state), bookings: () => bookings(r, state),
    join: () => join(r, state), workspace: () => workspace(worker, state), account: () => account(state),
    terms: () => policyPage("terms"), privacy: () => policyPage("privacy"),
  };
  content.className = worker ? "wrap page worker-page" : r.page ? "wrap page" : "wrap home-page";
  const languageControl = worker ? `<div class="worker-language"><label for="worker-language">${t("Language")}</label>
    <select id="worker-language">${option("en", "English", state.workerLanguage !== "hi" ? "en" : "hi")}
    ${option("hi", "हिंदी", state.workerLanguage)}</select>${Live.enabled && state.account ? link(t("Account"), "#/account", "text-btn") : ""}</div>` : "";
  const needsAccount = Live.enabled && !state.account && (worker || ["request", "bookings"].includes(r.page));
  const offline = Live.enabled && !Live.online ? `<p class="info-note" role="status">${t("The preview server is disconnected. Reconnecting…")}</p>` : "";
  content.innerHTML = offline + languageControl + (needsAccount ? signInPage() : (Object.hasOwn(views, r.page) ? views[r.page] : unavailable)());
  content.querySelectorAll("img").forEach((img) => {
    if (img.complete) return;
    img.classList.add("image-pending");
    const reveal = () => img.classList.remove("image-pending");
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", reveal, { once: true });
  });
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
  const target = form.querySelector("[data-form-error], #form-error");
  if (!target) return announce(message);
  target.textContent = t(message);
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
  if (!message) return { appointment, timing: appointment ? "" : form.elements.timing.value };
  (date.value ? time : date).focus();
  return null;
}

function setTimingShortcut(field, timing) {
  field.querySelector('[name="timing"]').value = timing === "now" ? "now" : "";
  field.querySelector('[data-action="appointment-now"]').setAttribute("aria-pressed", timing === "now");
  field.querySelector('[data-action="appointment-clear"]').setAttribute("aria-pressed", timing === "flexible");
  field.querySelector("[data-schedule-error]").hidden = true;
}

function completeTour() {
  M.save({ ...M.read(), tutorial: Walkthrough.version });
}

function completeWorkerTour() {
  M.save({ ...M.read(), workerTutorial: Walkthrough.version });
}

function startWorkerTour(control, state) {
  const origin = location.hash;
  const person = M.pros(state).find((profile) => profile.sample);
  const guide = [
    ["Availability", "On your own profile, turn on immediate requests when you’re ready to take them. Set future appointment hours in Schedule.",
      "#worker-availability", workerLink("today", person)],
    ["Sample request", "Check the job, area, timing and estimated duration before responding. This sample is for practice.",
      "#worker-practice-request", href("/workspace/jobs", { pro: person.id, tour: "sample" })],
    ["Schedule", "Pick a date to see timed jobs and blocked time. Set working hours and a travel buffer on your own profile.",
      "#worker-agenda", workerLink("schedule", person)],
  ];
  if (dialog.open) dialog.close();
  Walkthrough.start(control, (restoreFocus) => {
    completeWorkerTour();
    if (restoreFocus) go(origin);
  }, guide);
  go(guide[0][3]);
}

function updateDraft(form) {
  const values = new FormData(form);
  if (joinStep === 0) {
    const name = values.get("name").trim();
    const areas = values.getAll("areas");
    draft = { ...draft, name, service: values.get("service"), areas };
  } else if (joinStep === 1) {
    const bio = values.get("bio").trim();
    draft = { ...draft, years: values.get("years") === "" ? "" : Number(values.get("years")), bio,
      credential: values.get("credential").trim(), languages: values.get("languages").split(",").map((language) => language.trim()).filter(Boolean),
      price: values.get("price") === "" ? "" : Number(values.get("price")), unit: values.get("unit") };
  }
  if (joinStep === 0 && (!draft.name || !draft.areas.length)) return "Enter a display name and choose at least one neighbourhood.";
  if (joinStep === 1 && !draft.bio) return "Tell customers a little about your work.";
  return "";
}

function saveWorkerDraft(state = M.current()) {
  M.save({ ...state, draft: { version: 2, profile: draft, step: joinStep } });
}

function mutatePreview(action, data, localAction) {
  return Live.enabled ? Live.command(action, data) : localAction();
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  event.preventDefault();
  const r = route();
  const state = M.current();
  const data = new FormData(form);
  if (form.id === "phone-auth") {
    if (event.submitter?.value === "restart") { phoneChallenge = null; render(true); return; }
    form.querySelectorAll("button").forEach((control) => { control.disabled = true; });
    const verifying = Boolean(phoneChallenge);
    const result = await Live.command(verifying ? "phone-verify" : "phone-start", verifying
      ? { challenge: phoneChallenge.challenge, code: data.get("code") }
      : { phone: data.get("phone") });
    if (result.error) {
      form.querySelectorAll("button").forEach((control) => { control.disabled = false; });
      return formError(result.error, form);
    }
    phoneChallenge = verifying ? null : { ...result, phone: data.get("phone") };
    if (verifying) { draft = null; joinStep = 0; checkout = null; }
    render(true);
    if (!verifying) content.querySelector("#phone-auth [name=code]")?.focus();
  } else if (form.id === "preview-auth") {
    const action = event.submitter?.value === "register" ? "register" : "login";
    form.querySelectorAll("button").forEach((control) => { control.disabled = true; });
    const result = await Live.command(action, { handle: data.get("handle"), password: data.get("password") });
    if (result.error) {
      form.querySelectorAll("button").forEach((control) => { control.disabled = false; });
      return formError(result.error, form);
    }
    draft = null;
    joinStep = 0;
    checkout = null;
    render(true);
  } else if (form.id === "search-form") {
    const value = data.get("query").trim();
    const matches = M.matches(value);
    if (matches.length === 1) go(browse(matches[0].id));
    else suggestions(value, true);
  } else if (form.classList.contains("filters-form")) {
    const schedule = scheduleValue(form);
    if (!schedule) return;
    const params = { ...resultParams(r, state), area: data.get("area"), max: data.get("max"), ...schedule };
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
    const schedule = scheduleValue(form);
    if (!schedule) return;
    const details = { scope: data.get("scope"), area: data.get("area"), contact: data.get("contact"), ...schedule };
    if (!Live.available(M.pro(r.id, state), details, state)) {
      return formError("This professional isn’t available for this neighbourhood or timing. Try another time or return to results.");
    }
    Object.assign(checkout, details, { review: true });
    render(true);
  } else if (form.id === "join-form") {
    const error = updateDraft(form);
    if (error) return formError(error);
    if (joinStep === 2) {
      const { hours, blocks, immediate, next } = state.profile || { hours: M.defaultHours, immediate: false };
      const profile = { ...draft, hours, blocks, immediate, next, id: state.profile?.id || M.id(), sample: false, published: true };
      const result = await mutatePreview("profile", profile, () => {
        M.save({ ...state, profile });
        return {};
      });
      if (result.error) return formError(result.error, form);
      M.save({ ...M.read(), draft: null });
      draft = null;
      joinStep = 0;
      go("#/workspace/profile");
      announce(Live.enabled ? "Your worker profile is published." : "Your demo profile is published.");
    } else {
      joinStep += 1;
      saveWorkerDraft(state);
      render(true);
    }
  } else if (form.id === "working-hours-form" && state.profile) {
    const hours = { days: data.getAll("days").map(Number), start: data.get("opens"), end: data.get("closes"), buffer: Number(data.get("buffer")) };
    if (hours.start >= hours.end) return formError("Choose a closing time after the opening time on the same day.", form);
    const result = await mutatePreview("hours", hours, () => {
      M.save({ ...state, profile: { ...state.profile, hours } });
      return {};
    });
    if (result.error) return formError(result.error, form);
    form.querySelector("[data-form-error]").hidden = true;
    form.querySelector("[data-legacy-hours]")?.remove();
    announce("Working hours and travel buffer saved.");
  } else if (form.id === "schedule-block-form") {
    const date = data.get("blockDate");
    const start = `${date}T${data.get("blockStart")}`;
    const end = `${date}T${data.get("blockEnd")}`;
    const result = await mutatePreview("block", { start, end }, () => M.blockSchedule(start, end));
    if (result.error) return formError(result.error, form);
    go(href("/workspace/schedule", { pro: state.profile.id, date }));
    announce("Time block saved.");
  } else if (form.id === "job-duration-form") {
    const { job, pro } = form.dataset;
    const minutes = Number(data.get("duration"));
    const result = await mutatePreview("estimate", { job, role: "pro", minutes }, () => M.updateDuration(job, pro, minutes));
    if (result.error) return formError(result.error, form);
    render();
    $("#job-duration-form button")?.focus();
    announce("Estimated duration saved.");
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
  const form = event.target.closest("#join-form");
  if (form) {
    updateDraft(form);
    saveWorkerDraft();
  }
  if (event.target.matches('.schedule-inputs input')) {
    const field = event.target.closest(".schedule-field");
    const hasDateOrTime = [...field.querySelectorAll(".schedule-inputs input")].some((input) => input.value);
    setTimingShortcut(field, hasDateOrTime ? "" : "flexible");
  }
  if (event.target.id === "service-search") suggestions(event.target.value.trim());
  if (event.target.id === "chat-message") Contact.saveDraft(event.target);
});

document.addEventListener("change", (event) => {
  const r = route();
  if (event.target.id === "worker-language") {
    M.save({ ...M.current(), workerLanguage: event.target.value === "hi" ? "hi" : "en" });
    render();
    $("#worker-language").focus();
  } else if (event.target.name === "appearance") {
    Appearance.set(event.target.value);
  } else if (event.target.id === "sort") {
    go(browse(r.id, { ...resultParams(r, M.read()), sort: event.target.value }));
  } else if (event.target.id === "workspace-pro") {
    const state = M.read();
    go(workerLink(workerContext(r, state).page, M.pro(event.target.value, state)));
  } else if (event.target.id === "agenda-date" && event.target.value) {
    const { person } = workerContext(r, M.read());
    go(href("/workspace/schedule", { pro: person.id, date: event.target.value }));
  }
});

document.addEventListener("click", async (event) => {
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
      openDialog(t("Appearance"), appearanceChoices());
      break;
    case "location":
      openDialog("Choose your neighbourhood", `<form id="area-form" class="stack"><label>Area in ${M.city}
        <select name="area">${areaOptions(r.query.get("area") || state.area)}</select></label>
        <button class="btn primary" type="submit">Use this area</button></form>`);
      break;
    case "filters": openDialog("Filter professionals", filterForm(resultParams(r, state), r.id, "filter-sheet")); break;
    case "appointment-now":
    case "appointment-offset":
    case "appointment-clear": {
      const field = control.closest(".schedule-field");
      const offset = Number(control.dataset.minutes);
      const [date, time] = action !== "appointment-offset" ? ["", ""]
        : M.localAppointment(Math.ceil(Date.now() / 60_000) * 60_000 + offset * 60_000).split("T");
      field.querySelector('[name="date"]').value = date;
      field.querySelector('[name="time"]').value = time;
      setTimingShortcut(field, action === "appointment-now" ? "now" : date ? "" : "flexible");
      break;
    }
    case "worker-immediate": {
      if (!state.profile || workerContext(r, state)?.person?.id !== state.profile.id) break;
      const immediate = !M.immediateEnabled(state.profile);
      control.disabled = true;
      const result = await mutatePreview("immediate", { enabled: immediate }, () => {
        M.save({ ...state, profile: { ...state.profile, immediate } });
        return {};
      });
      control.disabled = false;
      if (result.error) { announce(result.error); break; }
      control.setAttribute("aria-pressed", immediate);
      control.querySelector("span").textContent = t(immediate ? "On" : "Off");
      announce(immediate ? "Immediate requests are on." : "Immediate requests are off.");
      break;
    }
    case "remove-schedule-block": {
      if (!state.profile || workerContext(r, state)?.person?.id !== state.profile.id) break;
      const blocks = (state.profile.blocks || []).filter((block) => block.id !== control.dataset.block);
      const result = await mutatePreview("remove-block", { id: control.dataset.block }, () => {
        M.save({ ...state, profile: { ...state.profile, blocks } });
        return {};
      });
      if (result.error) { announce(result.error); break; }
      render();
      $("#agenda-date")?.focus();
      announce("Time block removed.");
      break;
    }
    case "help":
      if (workerContext(r, state)) {
        openDialog(t("HandyHive Work help"), `<p>${t("Today shows incoming requests and upcoming jobs. Open a job to respond, chat or update its progress.")}</p>
          ${Live.enabled ? "" : `<div class="action-row">${button(t("Replay worker walkthrough"), "start-worker-tour", "dark")}</div>`}`);
      } else {
        openDialog("Help", `<div class="stack"><p>Choose a service, compare professionals and track your requests in Bookings. The demo keeps your activity in this browser.</p>
          ${Live.enabled ? "" : button("Replay walkthrough", "start-tour", "dark", "right")}</div>`);
      }
      break;
    case "start-tour":
      if (dialog.open) dialog.close();
      Walkthrough.start(control, completeTour);
      go("#/");
      break;
    case "start-worker-tour":
      startWorkerTour(control, state);
      break;
    case "skip-worker-tour":
      completeWorkerTour();
      render();
      content.focus({ preventScroll: true });
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
      const details = { ...checkout, proId: r.id };
      const result = await mutatePreview("request", details, () => M.request(details));
      if (result.error) {
        control.disabled = false;
        formError(result.error);
        break;
      }
      checkout = null;
      go(href(`/bookings/${result.job.id}`));
      announce(Live.enabled ? "Request sent to the worker." : "Request sent to the worker in this demo.");
      break;
    }
    case "cancel-job":
      openDialog("Cancel this request?", `<p>You can choose another professional using the same job details.</p><div class="action-row">
        ${button("Keep request", "close")}
        <button class="btn dark" type="button" data-action="confirm-cancel" data-job="${esc(control.dataset.job)}">Cancel request</button></div>`);
      break;
    case "confirm-cancel": {
      const job = control.dataset.job;
      const result = await mutatePreview("transition", { job, role: "customer", change: "cancel" }, () => M.transition(job, "cancel", "customer"));
      dialog.close();
      render();
      announce(result.error || "Request cancelled.");
      break;
    }
    case "pro-job": {
      const { job, change, pro } = control.dataset;
      const result = await mutatePreview("transition", { job, role: "pro", change }, () => M.transition(job, change, "pro", pro));
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
      const result = await mutatePreview("tracking", { job, role: "pro", change }, () => M.track(job, pro, change));
      if (result.error) announce(result.error);
      else {
        Tracking.refresh(M.read().requests);
        const panel = control.closest(".tracking-panel");
        if (control.hidden) panel?.querySelector(".tracking-controls button:not([hidden])")?.focus();
      }
      break;
    }
    case "map-zoom-in":
    case "map-recenter":
      Tracking.zoom(control, action === "map-recenter");
      break;
    case "join-back":
      joinStep -= 1;
      saveWorkerDraft(state);
      render(true);
      break;
    case "toggle-profile": {
      const published = !state.profile.published;
      const result = await mutatePreview("published", { enabled: published }, () => {
        M.save({ ...state, profile: { ...state.profile, published } });
        return {};
      });
      if (result.error) { announce(result.error); break; }
      render();
      announce(Live.enabled ? (published ? "Worker profile published." : "Worker profile unpublished.")
        : (published ? "Demo profile published." : "Demo profile unpublished."));
      break;
    }
    case "toggle-booking-sms": {
      control.disabled = true;
      const enabled = !state.bookingSms;
      const result = await Live.command("booking-sms", { enabled });
      if (result.error) {
        control.disabled = false;
        announce(result.error);
        break;
      }
      render();
      announce(enabled ? "Booking SMS turned on." : "Booking SMS turned off.");
      break;
    }
    case "live-logout": {
      control.disabled = true;
      const result = await Live.command("logout", {});
      if (result.error) {
        control.disabled = false;
        announce(result.error);
        break;
      }
      draft = null;
      joinStep = 0;
      checkout = null;
      Contact.reset();
      render(true);
      break;
    }
    case "reset-dialog":
      openDialog("Reset this demo?", `<p>This clears bookings, demo messages, worker profiles and preferences saved in this browser.</p>
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

window.addEventListener("hashchange", async () => {
  if (dialog.open) dialog.close();
  render(true);
  if (await Live.refresh()) refreshConnectedView();
});
window.addEventListener("storage", (event) => {
  if (event.key === M.storageKey && ["bookings", "workspace", "services"].includes(route().page)) render();
});
window.setInterval(() => {
  const state = M.read();
  if (!Live.enabled && M.expire(state)) {
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

function refreshConnectedView() {
  const state = M.read();
  const r = route();
  if (state.account?.id !== renderedAccount) {
    if (dialog.open) dialog.close();
    draft = null;
    joinStep = 0;
    checkout = null;
    Contact.reset();
    render(true);
    return;
  }
  if (dialog.open) {
    Contact.sync(state);
    return;
  }
  if (["join", "request", "account"].includes(r.page) && content.contains(document.activeElement)) return;
  if (r.page === "workspace" && document.activeElement.closest("form")) return;
  render();
}

if (Live.enabled) {
  Live.refresh().then(() => render());
  window.setInterval(async () => {
    if (await Live.refresh()) refreshConnectedView();
  }, 2500);
} else render();
