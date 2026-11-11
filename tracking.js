"use strict";

const Tracking = (() => {
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
  const labels = { live: "Demo tracking active", paused: "Tracking paused", stale: "Update overdue", unavailable: "Location unavailable" };
  const routePath = "M46 181 L122 181 Q135 181 135 168 L135 140 L240 140 Q252 140 252 128 L252 101 L341 101";

  function map() {
    return `<div class="tracking-map">
      <svg viewBox="0 0 400 240" role="img" aria-label="${t("Illustrative route from the professional to the job destination")}">
        <title>${t("Sample Delhi journey")}</title>
        <rect width="400" height="240" class="map-background"/>
        <path class="map-block" d="M9 9h108v58H9zM146 10h92v56h-92zM270 10h117v76H270zM13 90h104v73H13zM151 154h86v72h-86zM272 119h110v53H272z"/>
        <path class="map-park" d="M152 89h84v35h-84zM12 200h103v28H12zM270 188h78v40h-78z"/>
        <path class="map-water" d="M400 180v60h-44c-9-10-8-23 3-32 10-8 28-9 41-28Z"/>
        <g class="map-roads" fill="none" stroke-linecap="round">
          <path stroke-width="10" d="M-10 77h262M-8 181h142M135-10v260M252-10v260M252 101h155M135 140h117M-10 40h145M193 77v63M301 0v101M342 0v176M252 181h98M45 78v102M82 78v102M0 120h135M135 199h117M293 102v79"/>
          <path stroke-width="4" d="M135 37h117M193 0v77M135 221h117M350 0v80M251 158h89M1 211h128"/>
        </g>
        <path class="map-route-outline" d="${routePath}" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="map-route" data-map-route d="${routePath}" fill="none" stroke-width="4" stroke-dasharray="6 5" stroke-linecap="round"/>
        <text class="map-label" x="155" y="58">${Marketplace.city.toUpperCase()}</text>
        <text class="map-label" x="155" y="113">Park</text>
        <circle class="map-destination" cx="341" cy="101" r="10"/>
        <circle class="map-destination-center" cx="341" cy="101" r="3"/>
        <text class="map-label" x="281" y="125">Destination</text>
        <g data-map-marker hidden>
          <circle class="map-marker-halo" r="15"/>
          <circle class="map-marker" r="7"/>
        </g>
      </svg>
      <div class="map-tools" aria-label="${t("Map zoom")}">
        <button class="icon-btn" type="button" data-action="map-zoom-in" aria-label="${t("Zoom in on map")}">+</button>
        <button class="icon-btn" type="button" data-action="map-recenter" aria-label="${t("Reset map view")}">↺</button>
      </div>
    </div>`;
  }

  function render(job, role) {
    if (job.status !== "en_route") return "";
    const controls = role === "pro" ? `<div class="action-row tracking-controls">
      <button class="btn primary" type="button" data-action="tracking" data-change="play" data-job="${job.id}" data-pro="${job.proId}" data-track-play>${t("Start demo tracking")}</button>
      <button class="btn secondary" type="button" data-action="tracking" data-change="pause" data-job="${job.id}" data-pro="${job.proId}" data-track-pause hidden>${t("Pause tracking")}</button>
      <button class="btn secondary" type="button" data-action="tracking" data-change="replay" data-job="${job.id}" data-pro="${job.proId}" data-track-replay hidden>${t("Replay route")}</button>
    </div>` : "";
    return `<section class="panel tracking-panel" data-track-job="${job.id}">
      <div class="tracking-heading"><h2>${t("Live location")}</h2><span class="neutral-tag">${t("Simulation")}</span></div>
      ${map()}
      <div class="tracking-meta"><strong data-track-status role="status"></strong><span data-track-eta></span></div>
      <p class="muted tracking-update" data-track-update></p>
      ${controls}
    </section>`;
  }

  function refresh(requests) {
    for (const panel of document.querySelectorAll("[data-track-job]")) {
      const job = requests.find((item) => item.id === panel.dataset.trackJob);
      if (!job) continue;
      const position = Marketplace.position(job);
      const status = panel.querySelector("[data-track-status]");
      if (status.dataset.mode !== position.mode) {
        status.textContent = t(labels[position.mode]);
        status.dataset.mode = position.mode;
      }
      panel.querySelector("[data-track-eta]").textContent = position.eta === undefined ? ""
        : position.eta === 0 ? t("Sample route complete") : t("Sample ETA {minutes} min", { minutes: position.eta });
      panel.querySelector("[data-track-update]").textContent = position.lastUpdate
        ? t("Last sample update {time}", { time: time.format(position.lastUpdate) })
        : t("The professional can start sharing a sample route from the worker’s job page.");
      const marker = panel.querySelector("[data-map-marker]");
      marker.toggleAttribute("hidden", position.progress === undefined);
      if (position.progress !== undefined) {
        const path = panel.querySelector("[data-map-route]");
        const point = path.getPointAtLength(path.getTotalLength() * position.progress);
        marker.setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
      const play = panel.querySelector("[data-track-play]");
      if (play) {
        play.hidden = !["paused", "unavailable"].includes(position.mode);
        play.textContent = t(position.mode === "paused" ? "Resume tracking" : "Start demo tracking");
        panel.querySelector("[data-track-pause]").hidden = position.mode !== "live";
        panel.querySelector("[data-track-replay]").hidden = position.mode === "unavailable";
      }
    }
  }

  function zoom(control, reset) {
    const map = control.closest(".tracking-map").querySelector("svg");
    const view = map.viewBox.baseVal;
    const zoomIn = control.closest(".map-tools").querySelector('[data-action="map-zoom-in"]');
    if (reset) {
      map.setAttribute("viewBox", "0 0 400 240");
      zoomIn.disabled = false;
      return;
    }
    if (view.width <= 225) return;
    const width = view.width * 0.75;
    const height = view.height * 0.75;
    map.setAttribute("viewBox", `${(400 - width) / 2} ${(240 - height) / 2} ${width} ${height}`);
    zoomIn.disabled = width <= 225;
  }

  return { render, refresh, zoom };
})();
