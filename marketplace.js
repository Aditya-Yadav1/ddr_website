function createMarketplace(adapter) {
  const city = "Delhi";
  const areas = ["Lajpat Nagar", "Dwarka", "Rohini", "Saket"];
  const indiaOffset = 330 * 60_000;
  const minute = 60_000;
  const day = 24 * 60 * minute;
  const appointmentOptions = {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  };
  const appointmentFormats = {
    "en-IN": new Intl.DateTimeFormat("en-IN", appointmentOptions),
    "hi-IN": new Intl.DateTimeFormat("hi-IN", appointmentOptions),
  };
  const defaultHours = { days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", buffer: 30 };
  const units = { visit: "diagnostic visit", hourly: "hour", fixed: "package" };
  const services = [
    { id: "plumbing", name: "Plumbing", icon: "wrench", note: "Leaks, taps & fittings", terms: ["plumb", "tap", "leak", "pipe", "drain", "toilet"], tasks: ["Fix a leaking tap", "Unblock a drain", "Install a fitting", "Other plumbing work"] },
    { id: "electrical", name: "Electrical", icon: "bolt", note: "Fans, lights & wiring", terms: ["electr", "fan", "light", "switch", "wiring", "socket"], tasks: ["Repair a switch or socket", "Install a light or fan", "Check wiring", "Other electrical work"] },
    { id: "cleaning", name: "Home cleaning", icon: "brush", note: "Rooms, kitchens & more", terms: ["clean", "bathroom", "kitchen", "dust"], tasks: ["Clean a kitchen", "Clean a bathroom", "Clean a room", "Other cleaning work"] },
    { id: "painting", name: "Painting", icon: "roller", note: "Walls, touch-ups & finishes", terms: ["paint", "wall", "touch-up", "roller"], tasks: ["Touch up a wall", "Paint one room", "Check a damp patch", "Other painting work"] },
  ];

  const samplePros = [
    ["ravi-kumar", "Ravi Kumar", "plumbing", 8, 650, "visit", 4.9, 128, "today", "Leak detection, tap repairs and bathroom fittings. I explain the fault and give you a price before starting any extra work.", ["Kannada", "Hindi", "English"], 1],
    ["imran-pasha", "Imran Pasha", "plumbing", 5, 450, "visit", 4.7, 63, "tomorrow", "I repair leaks, clear slow drains and replace worn fittings in homes and small offices.", ["Kannada", "Urdu", "Hindi"], 5],
    ["meera-nair", "Meera Nair", "electrical", 7, 550, "visit", 4.9, 104, "today", "I troubleshoot sockets, lighting and ceiling fans. My focus is on safe repairs and explaining your options clearly.", ["Malayalam", "English", "Hindi"], 2],
    ["arjun-singh", "Arjun Singh", "electrical", 10, 750, "visit", 4.8, 91, "tomorrow", "Electrical maintenance, lighting installs and fault finding for apartments and independent homes.", ["Hindi", "English"], 6],
    ["lakshmi-rao", "Lakshmi Rao", "cleaning", 6, 450, "hourly", 4.9, 117, "today", "Detailed home cleaning with attention to kitchens and bathrooms. Tell me which areas to prioritise before the visit.", ["Kannada", "Telugu", "English"], 3],
    ["farah-ali", "Farah Ali", "cleaning", 4, 1190, "fixed", 4.8, 74, "tomorrow", "My basic room package covers floors, dusting and reachable surfaces. Deep cleaning can be quoted separately.", ["Hindi", "Urdu", "English"], 7],
    ["suresh-babu", "Suresh Babu", "painting", 12, 600, "visit", 4.9, 82, "today", "I do paint touch-ups and full room refreshes. An assessment helps me check the wall and estimate materials before you commit.", ["Kannada", "Tamil", "English"], 4],
    ["deepak-shetty", "Deepak Shetty", "painting", 6, 500, "visit", 4.7, 46, "tomorrow", "Interior walls, repainting and small patch repairs with care around furniture and fittings.", ["Kannada", "Hindi"], 8],
  ].map(([id, name, service, years, price, unit, rating, reviews, next, bio, languages, photo], index) => ({
    id, name, service, years, price, unit, rating: 0, reviews: 0, next, bio, languages, photo,
    areas: index % 2 === 0 ? areas : areas.slice(0, 3), published: true,
    credential: "", sample: true,
  }));

  const key = `handyhive-marketplace-${city.toLowerCase()}-v1`;
  const responseWindow = 3 * 60 * 1000;
  const journeyStatuses = ["accepted", "en_route", "arrived", "in_progress", "completed"];
  const activeStatuses = ["pending", ...journeyStatuses.slice(0, -1)];
  const cancellableStatuses = activeStatuses.filter((status) => status !== "in_progress");
  const trackingDuration = 64_000;
  const statuses = {
    pending: "Awaiting response", accepted: "Accepted", declined: "Declined",
    expired: "Request expired", cancelled: "Cancelled", en_route: "On the way",
    arrived: "Arrived", in_progress: "In progress", completed: "Completed",
  };
  const initialState = () => ({ area: areas[0], requests: [], profile: null, draft: null, tutorial: false });
  let memory = initialState();

  function read() {
    try {
      const raw = (adapter || localStorage).getItem(key);
      if (raw) memory = { ...initialState(), ...JSON.parse(raw) };
    } catch { /* The demo still works in memory when storage is unavailable. */ }
    return memory;
  }

  function save(state) {
    memory = state;
    try { (adapter || localStorage).setItem(key, JSON.stringify(state)); } catch { /* In-memory fallback. */ }
    return state;
  }

  function reset() { return save(initialState()); }
  function pros(state = read()) { return [...(state.connected ? state.profiles : samplePros), ...(state.profile ? [state.profile] : [])]; }
  function pro(id, state) { return pros(state).find((person) => person.id === id); }
  function service(id) { return services.find((item) => item.id === id); }
  function matches(query) {
    const normalized = query.trim().toLowerCase();
    return services.filter((item) => !normalized || item.name.toLowerCase().includes(normalized)
      || item.terms.some((word) => normalized.includes(word) || word.startsWith(normalized)));
  }

  function localAppointment(timestamp) {
    return new Date(timestamp + indiaOffset).toISOString().slice(0, 16);
  }

  function appointmentTime(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
    const timestamp = Date.parse(value + "+05:30");
    return Number.isFinite(timestamp) && localAppointment(timestamp) === value ? timestamp : NaN;
  }

  function appointmentLabel(value, timing, locale = "en-IN") {
    if (timing === "now" && !value) return "As soon as available";
    const timestamp = appointmentTime(value);
    return Number.isFinite(timestamp) ? appointmentFormats[locale].format(timestamp) + " IST" : "Flexible timing";
  }

  function duration(job) {
    return job.duration || (job.unit === "hourly" ? 120 : 60);
  }

  function immediateEnabled(person) {
    return person.immediate ?? person.next === "today";
  }

  function acceptsAppointments(person) {
    return person.hours ? person.hours.days.length > 0 : person.next !== "offline";
  }

  function reservationStart(job) {
    return appointmentTime(job.appointment) || job.reservedAt
      || (["en_route", "arrived", "in_progress"].includes(job.status) ? job.updatedAt : NaN);
  }

  function overlaps(start, end, otherStart, otherEnd) {
    return start < otherEnd && otherStart < end;
  }

  function occupied(person, requests, start, end, excludeId, buffer, now) {
    return requests.some((job) => {
      if (job.id === excludeId || job.proId !== person.id || !journeyStatuses.includes(job.status)) return false;
      if (job.status === "completed") return job.updatedAt + buffer > start && job.updatedAt <= end;
      const reservedStart = reservationStart(job);
      const journeyStart = job.journeyStartedAt ?? reservedStart;
      const otherStart = Math.min(journeyStart, reservedStart);
      let otherEnd = Math.max(journeyStart, reservedStart) + duration(job) * minute;
      if (["en_route", "arrived", "in_progress"].includes(job.status)) otherEnd = Math.max(otherEnd, now + minute);
      return overlaps(start, end, otherStart - buffer, otherEnd + buffer);
    });
  }

  function withinHours(person, start, end, now) {
    if (!acceptsAppointments(person)) return false;
    const date = localAppointment(start).slice(0, 10);
    if (!person.hours) {
      return person.next !== "tomorrow" || date !== localAppointment(now).slice(0, 10);
    }
    const weekday = new Date(start + indiaOffset).getUTCDay();
    const { days, start: opens, end: closes } = person.hours;
    return days.includes(weekday) && start >= appointmentTime(date + "T" + opens)
      && end <= appointmentTime(date + "T" + closes);
  }

  function slotError(person, job, state, now = Date.now(), checkAvailability = true) {
    const immediate = job.timing === "now" && !job.appointment;
    if (!person || (checkAvailability && !person.published)) return "This professional is unavailable.";
    if (checkAvailability && immediate && !immediateEnabled(person)) return "This professional has paused immediate requests.";
    const start = immediate ? job.reservedAt || now : appointmentTime(job.appointment);
    if (!immediate && !job.appointment) {
      return !checkAvailability || acceptsAppointments(person) ? "" : "This professional is not taking future appointments.";
    }
    if (checkAvailability && !immediate && !(start > now)) return "Choose an appointment in the future (IST).";
    const end = start + duration(job) * minute;
    if (checkAvailability && !immediate && !withinHours(person, start, end, now)) {
      return "The estimated job length does not fit this professional’s working hours.";
    }
    return reservationError(person, job, state, start, end, now);
  }

  function reservationError(person, job, state, start, end, now) {
    if (person.blocks?.some((block) => overlaps(start, end, appointmentTime(block.start), appointmentTime(block.end)))) {
      return "This time overlaps a block in the professional’s schedule.";
    }
    const buffer = (person.hours?.buffer ?? defaultHours.buffer) * minute;
    if (occupied(person, state.requests, start, end, job.id, buffer, now)) {
      return "This time overlaps a booked job or its travel buffer.";
    }
    return "";
  }

  function available(person, area, appointment = "", state = read(), timing = "") {
    return Boolean(person?.published && person.areas.includes(area)
      && !slotError(person, { appointment, timing, unit: person.unit }, state));
  }

  function blockSchedule(start, end) {
    const state = current();
    const person = state.profile;
    const from = appointmentTime(start);
    const to = appointmentTime(end);
    const now = Date.now();
    if (!person || !(from >= Math.floor(now / minute) * minute && to > from)) {
      return { error: "Choose a future start and an end time after it." };
    }
    if (occupied(person, state.requests, from, to, null, 0, now)) {
      return { error: "This block overlaps a confirmed job. Choose another time." };
    }
    if (person.blocks?.some((block) => overlaps(from, to, appointmentTime(block.start), appointmentTime(block.end)))) {
      return { error: "This time overlaps an existing block." };
    }
    save({ ...state, profile: { ...person, blocks: [...(person.blocks || []), { id: id(), start, end }] } });
    return {};
  }

  function expire(state, now = Date.now()) {
    let changed = false;
    for (const job of state.requests) {
      if (job.status === "pending" && job.deadline <= now) {
        job.status = "expired";
        job.updatedAt = now;
        changed = true;
      }
    }
    return changed;
  }

  function current() {
    const state = read();
    if (adapter?.authoritative !== false && expire(state)) save(state);
    return state;
  }

  function id() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function request({ intent, proId, scope, area, appointment = "", timing = "", contact }) {
    const state = current();
    const existing = state.requests.find((job) => job.intent === intent
      && (!state.connected || job.customerId === state.account.id)
      && (activeStatuses.includes(job.status) || (state.connected && job.proId === proId)));
    if (existing) return { job: existing };
    const person = pro(proId, state);
    const trade = service(person?.service);
    const now = Date.now();
    if (!trade?.tasks.includes(scope) || !person.areas.includes(area)) {
      return { error: "This professional is unavailable for that service or neighbourhood." };
    }
    const job = {
      id: id(), intent, proId, scope, area, appointment, timing: !appointment && timing === "now" ? "now" : "", contact, service: trade.id,
      proName: person.name, price: person.price, unit: person.unit, status: "pending",
      createdAt: now, updatedAt: now, deadline: now + responseWindow, messages: [],
    };
    if (state.connected) {
      job.customerId = state.account.id;
      if (job.timing !== "now") {
        job.deadline = Math.min(now + day, appointmentTime(appointment) || Infinity);
      }
    }
    job.duration = duration(job);
    const error = slotError(person, job, state, now);
    if (error) return { error, code: "SLOT_UNAVAILABLE" };
    state.requests.unshift(job);
    save(state);
    return { job };
  }

  function transition(jobId, action, role, proId) {
    const state = current();
    const job = state.requests.find((item) => item.id === jobId);
    if (!job || (role === "pro" && job.proId !== proId)) return { error: "Request unavailable." };
    const actions = role === "pro" ? {
      pending: { accept: "accepted", decline: "declined", expire: "expired" },
      accepted: { depart: "en_route", arrive: "arrived" }, en_route: { arrive: "arrived" },
      arrived: { start: "in_progress" }, in_progress: { complete: "completed" },
    } : Object.fromEntries(cancellableStatuses.map((status) => [status, { cancel: "cancelled" }]));
    const next = actions[job.status]?.[action];
    if (!next) {
      return {
        error: "The request has changed. Check its latest status.",
        code: job.status === "expired" ? "REQUEST_EXPIRED" : "BOOKING_CHANGED",
      };
    }
    const now = Date.now();
    if (next === "accepted") {
      const error = slotError(pro(job.proId, state), job, state, now);
      if (error) return { error, code: "SLOT_UNAVAILABLE" };
      if (job.timing === "now") job.reservedAt = now;
    }
    if (["en_route", "arrived"].includes(next) && job.status === "accepted") {
      const person = pro(job.proId, state);
      if (!person) return { error: "This professional is unavailable." };
      const plannedStart = reservationStart(job) || now;
      const end = Math.max(now, plannedStart) + duration(job) * minute;
      const error = reservationError(person, job, state, now, end, now);
      if (error) return { error, code: "SLOT_UNAVAILABLE" };
      if (!job.appointment && !job.reservedAt) job.reservedAt = now;
      job.journeyStartedAt = now;
    }
    job.status = next;
    job.updatedAt = now;
    if (next !== "en_route") delete job.tracking;
    save(state);
    return { job };
  }

  function updateDuration(jobId, proId, minutes) {
    const state = current();
    const job = state.requests.find((item) => item.id === jobId && item.proId === proId);
    if (!job || !["pending", "accepted"].includes(job.status)) return { error: "The estimate can only be edited before starting a job." };
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 720) return { error: "Enter a duration from 15 to 720 minutes." };
    if (job.status === "accepted") {
      const person = pro(proId, state);
      const now = Date.now();
      const start = appointmentTime(job.appointment);
      if (start > now && minutes > duration(job) && !withinHours(person, start, start + minutes * minute, now)) {
        return { error: "The longer estimate does not fit your current working hours." };
      }
      const error = slotError(person, { ...job, duration: minutes }, state, now, false);
      if (error) return { error };
    }
    job.duration = minutes;
    save(state);
    return { job };
  }

  function agenda(person, requests, date) {
    const start = appointmentTime(date + "T00:00");
    const end = start + day;
    const jobs = requests.filter((job) => job.proId === person.id && journeyStatuses.includes(job.status))
      .map((job) => ({ job, start: reservationStart(job), end: reservationStart(job) + duration(job) * minute }));
    const blocks = (person.blocks || []).map((block) => ({
      block, start: appointmentTime(block.start), end: appointmentTime(block.end),
    }));
    return [...jobs, ...blocks].filter((item) => overlaps(start, end, item.start, item.end)).sort((a, b) => a.start - b.start);
  }

  function contact(jobId, role, proId, message) {
    const state = current();
    const job = state.requests.find((item) => item.id === jobId);
    if (!job || (role === "pro" && job.proId !== proId) || !activeStatuses.includes(job.status)) {
      return { error: "Contact is unavailable for this request." };
    }
    job.messages.push({ role, message, time: Date.now() });
    save(state);
    return { job };
  }

  function unread(job, role) {
    return job.messages.slice(job.chatSeen?.[role] ?? 0).filter((message) => message.role !== role).length;
  }

  function readChat(jobId, role) {
    const state = read();
    const job = state.requests.find((item) => item.id === jobId);
    if (!job || (job.chatSeen?.[role] ?? 0) === job.messages.length) return;
    job.chatSeen = { ...job.chatSeen, [role]: job.messages.length };
    save(state);
  }

  function track(jobId, proId, action) {
    const state = current();
    const job = state.requests.find((item) => item.id === jobId);
    if (!job || job.proId !== proId || job.status !== "en_route") {
      return { error: "Tracking is only available while this professional is on the way." };
    }
    const previous = job.tracking;
    const now = Date.now();
    if (action === "pause" && previous?.startedAt) {
      job.tracking = { elapsed: trackingElapsed(previous, now), startedAt: null, pausedAt: now };
    } else if (action === "play" && !previous?.startedAt) {
      const elapsed = previous?.elapsed >= trackingDuration ? 0 : (previous?.elapsed ?? 0);
      job.tracking = { elapsed, startedAt: now };
    } else if (action === "replay") {
      job.tracking = { elapsed: 0, startedAt: now };
    } else {
      return { error: "This tracking control is unavailable." };
    }
    save(state);
    return { job };
  }

  function trackingElapsed(tracking, now) {
    return Math.min(trackingDuration, tracking.elapsed + (tracking.startedAt
      ? Math.max(0, now - tracking.startedAt) : 0));
  }

  function position(job, now = Date.now()) {
    if (job.status !== "en_route" || !job.tracking) return { mode: "unavailable" };
    const tracking = job.tracking;
    const elapsed = trackingElapsed(tracking, now);
    const progress = elapsed / trackingDuration;
    const lastUpdate = tracking.startedAt
      ? tracking.startedAt + Math.max(0, (Math.floor(elapsed / 4000) * 4000) - tracking.elapsed)
      : tracking.pausedAt;
    const mode = !tracking.startedAt ? "paused" : now - lastUpdate > 15_000 ? "stale" : "live";
    return { mode, progress, lastUpdate, eta: Math.ceil((1 - progress) * 8) };
  }

  return { city, areas, units, services, statuses, read, save, reset, current, expire,
    pros, pro, service, matches, available, id, request, transition, contact, unread, readChat, track,
    position, localAppointment, appointmentTime, appointmentLabel, journeyStatuses, activeStatuses,
    immediateEnabled, acceptsAppointments, duration, defaultHours, blockSchedule, updateDuration, agenda,
    cancellableStatuses, storageKey: key };
}

const Marketplace = typeof module === "undefined" ? createMarketplace(Live.enabled ? Live.adapter : undefined) : null;
if (typeof module !== "undefined") module.exports = createMarketplace;
