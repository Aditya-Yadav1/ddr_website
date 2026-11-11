"use strict";

const Appearance = (() => {
  const key = "handyhive-appearance";
  const options = { system: "System", light: "Light", dark: "Dark" };
  const device = matchMedia("(prefers-color-scheme: dark)");
  let choice = "system";

  function apply() {
    const dark = choice === "dark" || (choice === "system" && device.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').content = dark ? "#141916" : "#f7f6f2";
    for (const radio of document.querySelectorAll('input[name="appearance"]')) {
      radio.checked = radio.value === choice;
    }
  }

  function read() {
    try {
      const saved = localStorage.getItem(key);
      choice = Object.hasOwn(options, saved) ? saved : "system";
    } catch { /* Use the device preference if storage is unavailable. */ }
    apply();
  }

  function set(value) {
    if (!Object.hasOwn(options, value)) return;
    choice = value;
    try { localStorage.setItem(key, choice); } catch { /* Keep the choice for this page. */ }
    apply();
  }

  read();
  device.addEventListener("change", apply);
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) read();
  });
  return { options, set, get choice() { return choice; } };
})();
