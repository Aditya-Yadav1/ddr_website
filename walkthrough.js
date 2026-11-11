"use strict";

const Walkthrough = (() => {
  const version = 2;
  const pages = ["", "services", "pros"];
  const steps = [
    ["Choose a service", "Select Plumbing to see professionals near you.", '.category[href="#/services/plumbing"]'],
    ["Compare professionals", "Check the rate and experience, then open this profile.", ".pro-action a"],
    ["Request a professional", "Open the request form to review the job details.", ".desktop-request, .mobile-request a"],
  ];
  let routes = [];
  let trigger;
  let target;
  let layer;
  let card;
  let frame;
  let onFinish;
  let previousDescription;
  const isolated = [];
  const resize = new ResizeObserver(schedule);

  function start(source, finish) {
    trigger = source;
    onFinish = finish;
    routes = ["#/"];
  }

  function isActive() { return routes.length > 0; }

  function clear() {
    resize.disconnect();
    cancelAnimationFrame(frame);
    for (const element of isolated.splice(0)) element.inert = false;
    if (target) {
      if (previousDescription === null) target.removeAttribute("aria-describedby");
      else target.setAttribute("aria-describedby", previousDescription);
    }
    target = null;
    layer?.remove();
    layer = null;
    card = null;
  }

  function finish(restoreFocus = true) {
    clear();
    routes = [];
    onFinish?.();
    onFinish = null;
    if (restoreFocus) {
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
      else document.querySelector("#content").focus({ preventScroll: true });
    }
    trigger = null;
  }

  function isolate(element) {
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      for (const sibling of current.parentElement.children) {
        if (sibling === current || sibling === layer || sibling.inert) continue;
        sibling.inert = true;
        isolated.push(sibling);
      }
    }
  }

  function sync(page, hash) {
    clear();
    if (!isActive()) return;
    const step = pages.indexOf(page);
    if (step < 0) return finish(false);
    routes[step] = hash || "#/";
    routes.length = step + 1;
    const [title, description, selector] = steps[step];
    const element = [...document.querySelectorAll(selector)].find((candidate) => candidate.getClientRects().length);
    layer = document.createElement("div");
    layer.className = "walkthrough";
    layer.innerHTML = `<div class="walkthrough-shade" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="walkthrough-ring" aria-hidden="true"></div>
      <section class="walkthrough-card" aria-labelledby="walkthrough-title" tabindex="-1">
        <p class="walkthrough-progress">Step ${step + 1} of ${steps.length}</p>
        <h2 id="walkthrough-title">${element ? title : "This step is unavailable"}</h2>
        <p id="walkthrough-description">${element ? description : "Go back or close the walkthrough to keep browsing."}</p>
        <div class="action-row">
          ${step > 0 && routes[step - 1] ? `<a class="btn secondary" href="${routes[step - 1].replaceAll('"', "&quot;")}">Back</a>` : ""}
          <button class="btn text-btn" type="button" data-action="skip-tour">Skip</button>
        </div>
      </section>`;
    document.body.append(layer);
    card = layer.querySelector(".walkthrough-card");
    target = element || null;
    if (target) {
      previousDescription = target.getAttribute("aria-describedby");
      target.setAttribute("aria-describedby", [previousDescription, "walkthrough-description"].filter(Boolean).join(" "));
      isolate(target);
      target.scrollIntoView({ block: "center", inline: "nearest" });
      resize.observe(target);
    } else {
      isolate(layer);
    }
    resize.observe(document.querySelector("#content"));
    resize.observe(card);
    place();
    (target || card).focus({ preventScroll: true });
  }

  function place() {
    if (!layer) return;
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const rect = target?.getBoundingClientRect();
    const left = rect ? Math.max(0, Math.min(width, rect.left - 5)) : 0;
    const right = rect ? Math.max(left, Math.min(width, rect.right + 5)) : 0;
    const top = rect ? Math.max(0, Math.min(height, rect.top - 5)) : 0;
    const bottom = rect ? Math.max(top, Math.min(height, rect.bottom + 5)) : 0;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const below = rect && bottom + cardHeight + 24 < height;
    const cardTop = rect ? (below ? bottom + 13 : top - cardHeight - 13) : (height - cardHeight) / 2;
    const cardLeft = rect ? (left + right - cardWidth) / 2 : (width - cardWidth) / 2;
    const x = Math.max(12, Math.min(width - cardWidth - 12, cardLeft));
    const y = Math.max(12, Math.min(height - cardHeight - 12, cardTop));
    const variables = {
      x: left, y: top, w: right - left, h: bottom - top,
      "card-x": x, "card-y": y,
      arrow: Math.max(20, Math.min(cardWidth - 20, (left + right) / 2 - x)),
    };
    for (const [name, value] of Object.entries(variables)) layer.style.setProperty("--" + name, value + "px");
    layer.dataset.arrow = rect && top < height && bottom > 0 ? (below ? "top" : "bottom") : "";
    layer.classList.toggle("no-target", !target);
  }

  function schedule() {
    if (!layer) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (target && !target.getClientRects().length) sync(pages[routes.length - 1], routes.at(-1));
      else place();
    });
  }

  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, true);
  document.addEventListener("load", schedule, true);
  window.visualViewport?.addEventListener("resize", schedule);
  document.addEventListener("keydown", (event) => {
    if (!layer) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
    if (event.key !== "Tab") return;
    const controls = [target, ...card.querySelectorAll("a, button")].filter(Boolean);
    const index = controls.indexOf(document.activeElement);
    const next = index < 0 && event.shiftKey ? controls.length - 1
      : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
  });

  return { start, sync, finish, isActive, version, clear };
})();
