const Marketplace = (() => {
  const city = "Delhi";
  const areas = ["Lajpat Nagar", "Dwarka", "Rohini", "Saket"];
  const indiaOffset = 330 * 60_000;
  const appointmentFormat = new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
  const timing = { today: "Today", tomorrow: "Tomorrow", flexible: "Flexible" };
  const units = { visit: "diagnostic visit", hourly: "hour", fixed: "package" };
  const services = [
    { id: "plumbing", name: "Plumbing", icon: "wrench", note: "Leaks, taps & fittings", terms: ["plumb", "tap", "leak", "pipe", "drain", "toilet"], tasks: ["Fix a leaking tap", "Unblock a drain", "Install a fitting", "Other plumbing work"] },
    { id: "electrical", name: "Electrical", icon: "bolt", note: "Fans, lights & wiring", terms: ["electr", "fan", "light", "switch", "wiring", "socket"], tasks: ["Repair a switch or socket", "Install a light or fan", "Check wiring", "Other electrical work"] },
    { id: "cleaning", name: "Home cleaning", icon: "sparkles", note: "Rooms, kitchens & more", terms: ["clean", "bathroom", "kitchen", "dust"], tasks: ["Clean a kitchen", "Clean a bathroom", "Clean a room", "Other cleaning work"] },
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
    id, name, service, years, price, unit, rating, reviews, next, bio, languages, photo,
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
      const raw = localStorage.getItem(key);
      if (raw) memory = { ...initialState(), ...JSON.parse(raw) };
    } catch { /* The demo still works in memory when storage is unavailable. */ }
    return memory;
  }

  function save(state) {
    memory = state;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* In-memory fallback. */ }
    return state;
  }

  function reset() { return save(initialState()); }
  function pros(state = read()) { return [...samplePros, ...(state.profile ? [state.profile] : [])]; }
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

  function appointmentLabel(value) {
    const timestamp = appointmentTime(value);
    return Number.isFinite(timestamp) ? appointmentFormat.format(timestamp) + " IST" : "Flexible timing";
  }

  function occupied(requests, proId, appointment, excludeId) {
    return Boolean(appointment) && requests.some((job) => job.id !== excludeId
      && job.proId === proId && job.appointment === appointment
      && activeStatuses.includes(job.status) && job.status !== "pending");
  }

  function available(person, area, appointment = "", state = read()) {
    if (!person?.published || !person.areas.includes(area) || person.next === "offline") return false;
    if (!appointment) return true;
    const now = Date.now();
    if (!(appointmentTime(appointment) > now)) return false;
    if (person.next === "tomorrow" && appointment.slice(0, 10) === localAppointment(now).slice(0, 10)) return false;
    return !occupied(state.requests, person.id, appointment);
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
    if (expire(state)) save(state);
    return state;
  }

  function id() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function request({ intent, proId, scope, area, appointment = "", contact }) {
    const state = current();
    const existing = state.requests.find((job) => job.intent === intent && activeStatuses.includes(job.status));
    if (existing) return { job: existing };
    const person = pro(proId, state);
    const trade = service(person?.service);
    const now = Date.now();
    if (appointment && !(appointmentTime(appointment) > now)) {
      return { error: "Choose an appointment in the future." };
    }
    if (!trade?.tasks.includes(scope) || !available(person, area, appointment, state)) {
      return { error: "This professional is unavailable for that area or timing. Try another option." };
    }
    const job = {
      id: id(), intent, proId, scope, area, appointment, contact, service: trade.id,
      proName: person.name, price: person.price, unit: person.unit, status: "pending",
      createdAt: now, updatedAt: now, deadline: now + responseWindow, messages: [],
    };
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
    if (!next) return { error: "The request has changed. Check its latest status." };
    if (next === "accepted" && job.appointment && !(appointmentTime(job.appointment) > Date.now())) {
      return { error: "This appointment time has passed. Ask the customer to choose a new time." };
    }
    if (next === "accepted" && occupied(state.requests, job.proId, job.appointment, job.id)) {
      return { error: "There is already an accepted job at that time. Decline this request or ask the customer for a different time." };
    }
    job.status = next;
    job.updatedAt = Date.now();
    if (next !== "en_route") delete job.tracking;
    save(state);
    return { job };
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

  return { city, areas, timing, units, services, statuses, read, save, reset, current, expire,
    pros, pro, service, matches, available, id, request, transition, contact, unread, readChat, track,
    position, localAppointment, appointmentTime, appointmentLabel, journeyStatuses, activeStatuses,
    cancellableStatuses, storageKey: key };
})();
