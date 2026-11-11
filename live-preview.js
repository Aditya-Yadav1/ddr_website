"use strict";

const Live = (() => {
  const mode = document.querySelector('meta[name="handyhive-mode"]')?.content;
  const enabled = Boolean(mode);
  let snapshot = { account: null, profile: null, profiles: [], requests: [], matches: null };
  let operation = 0;
  let commands = 0;
  let polling = false;
  let loaded = false;
  let online = true;
  const prefs = ["area", "draft", "tutorial", "workerTutorial", "workerLanguage"];

  const adapter = {
    authoritative: false,
    getItem(key) {
      const scope = key + "-connected-" + (snapshot.account?.id || "guest");
      let local = {};
      try { local = JSON.parse(localStorage.getItem(scope)) || {}; } catch {}
      return JSON.stringify({ ...local, ...snapshot, connected: true });
    },
    setItem(key, value) {
      const scope = key + "-connected-" + (snapshot.account?.id || "guest");
      const state = JSON.parse(value);
      const local = Object.fromEntries(prefs.map((name) => [name, state[name]]));
      localStorage.setItem(scope, JSON.stringify(local));
    },
  };

  function query() {
    const r = route();
    if (!["services", "pros", "request"].includes(r.page)) return "";
    const { area, appointment, timing } = resultParams(r, M.read());
    return "?" + new URLSearchParams({ area, appointment, timing });
  }

  async function fetchState(action, body) {
    const response = await fetch("/api/" + action + query(), body === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return response.json();
  }

  async function refresh() {
    if (!enabled || polling || commands) return false;
    polling = true;
    const version = operation;
    try {
      const response = await fetchState("state");
      if (!response.state || version !== operation) return false;
      const changed = JSON.stringify(response.state) !== JSON.stringify(snapshot) || !online || !loaded;
      snapshot = response.state;
      loaded = true;
      online = true;
      return changed;
    } catch {
      const changed = online;
      online = false;
      return changed;
    } finally { polling = false; }
  }

  async function command(action, body) {
    const version = ++operation;
    commands++;
    try {
      const result = await fetchState(action, body);
      if (version === operation && result.state) snapshot = result.state;
      if (version === operation && !result.state && result.error === "Sign in to continue.") {
        snapshot = { ...snapshot, account: null, profile: null, requests: [], bookingUpdates: [], bookingSms: null };
      }
      online = true;
      return result;
    } catch {
      online = false;
      return { error: "Can’t reach the preview server. Check your connection and try again." };
    } finally { commands--; }
  }

  function available(person, params, state) {
    if (!enabled) return M.available(person, params.area, params.appointment, state, params.timing);
    if (!person?.published) return false;
    const matches = snapshot.matches;
    if (matches?.area === params.area && matches.appointment === params.appointment && matches.timing === params.timing) {
      return matches.ids.includes(person.id);
    }
    return person.id !== snapshot.account?.id && M.available(person, params.area, params.appointment, state, params.timing);
  }

  return { enabled, smsSignIn: mode === "twilio", adapter, command, refresh, available, get online() { return online; } };
})();
