"use strict";

const Contact = (() => {
  const messageTime = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const drafts = new Map();
  const scrollPositions = new Map();
  const suggestions = ["Please confirm the job details.", "What time works for you?", "Thanks for the update."];
  let view;
  let callState;

  function actions(job, role, person) {
    const available = Marketplace.activeStatuses.includes(job.status);
    if (!available && !job.messages.length) return "";
    const name = role === "pro" ? t("Customer") : job.proName;
    const attributes = `data-job="${esc(job.id)}" data-role="${role}"`;
    return `<section class="panel booking-contact" aria-label="${t("Booking contact")}">
      <div class="contact-person">${role === "customer" && person ? portrait(person) : `<span class="feature-icon">${icon("user")}</span>`}
        <div><h2>${esc(name)}</h2><p>${role === "pro" ? esc(t(job.area)) : esc(Marketplace.service(job.service).name)}</p></div>
      </div>
      <div class="contact-actions">
        ${available ? `<button class="btn secondary" type="button" data-action="booking-call" ${attributes}>${icon("phone", 18)} ${t("Call")}</button>` : ""}
        <button class="btn secondary" type="button" data-action="booking-chat" ${attributes}>${icon("message", 18)} ${t(available ? "Chat" : "Chat history")}
          <span class="unread" data-unread ${attributes} hidden></span></button>
      </div>
    </section>`;
  }

  function open(job, role, kind) {
    if (!job || (kind === "call" && !Marketplace.activeStatuses.includes(job.status))) return;
    const name = role === "pro" ? t("Customer") : job.proName;
    view = { id: job.id, role, proId: job.proId, kind, key: `${job.id}:${role}` };
    if (kind === "call") {
      callState = "ready";
      openDialog(t("Call {name}", { name: esc(name) }), `<p class="muted">${t("Demo call · No phone number is dialled.")}</p>
        <div class="call-status" aria-live="polite"></div><div class="action-row call-controls"></div>`, "call");
      renderCall();
      return;
    }
    openDialog(t("Chat with {name}", { name: esc(name) }), `<p class="muted chat-note">${t(Live.enabled ? "Messages are shared with the other person on this booking." : "Demo chat · Saved in this browser.")}</p>
      <div class="chat-thread" role="log" aria-label="${t("Messages")}" tabindex="0"></div>
      <div class="chat-compose">
        <div class="quick-messages" aria-label="${t("Quick messages")}">${suggestions.map((message, index) =>
          `<button class="btn secondary" type="button" data-action="quick-message" data-index="${index}">${t(message)}</button>`).join("")}</div>
        <form id="message-form" class="message-form">
          <label class="sr-only" for="chat-message">${t("Message")}</label>
          <input id="chat-message" name="message" maxlength="280" placeholder="${t("Write a message")}" value="${esc(drafts.get(view.key) || "")}" required>
          <button class="btn dark" type="submit">${t("Send")} ${icon("message", 16)}</button>
        </form>
      </div><p class="muted chat-closed" hidden>${t("This booking’s conversation is read-only.")}</p>
      <p class="error contact-error" role="alert" hidden></p>`, "chat");
    sync(Marketplace.read(), true);
    const previousScroll = scrollPositions.get(view.key);
    if (previousScroll !== undefined) dialog.querySelector(".chat-thread").scrollTop = previousScroll;
  }

  function renderCall() {
    const statuses = {
      ready: "Ready to call",
      connecting: "Connecting…",
      connected: "Demo call connected",
      unavailable: view.role === "pro" ? "Customer unavailable" : "Professional unavailable",
      ended: "Demo call ended",
    };
    const controls = {
      ready: [["Start demo call", "connecting", "primary"]],
      connecting: [["Simulate answer", "connected", "primary"], ["Simulate no answer", "unavailable"]],
      connected: [["End call", "ended", "primary"]],
      unavailable: [["Try again", "connecting", "primary"]],
      ended: [["Done", "close", "primary"]],
    };
    dialog.querySelector(".call-status").textContent = t(statuses[callState]);
    dialog.querySelector(".call-controls").innerHTML = controls[callState].map(([label, next, style]) =>
      button(t(label), next === "close" ? "close" : `call-${next}`, style)).join("");
  }

  function advanceCall(next) {
    if (view?.kind !== "call" || !dialog.open) return;
    const job = Marketplace.current().requests.find((item) => item.id === view.id);
    callState = job && Marketplace.activeStatuses.includes(job.status) ? next : "unavailable";
    renderCall();
    dialog.querySelector(".call-controls button")?.focus();
  }

  function updateThread(job, scrollToEnd) {
    const thread = dialog.querySelector(".chat-thread");
    if (thread.dataset.count === String(job.messages.length)) return;
    const nearEnd = scrollToEnd || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 35;
    thread.dataset.count = job.messages.length;
    const label = view.role === "pro" ? t("Customer") : job.proName;
    thread.innerHTML = job.messages.length ? `<ul class="messages">${job.messages.map((item) =>
      `<li class="${item.role === view.role ? "mine" : ""}"><div class="message-meta">
        <b>${item.role === view.role ? t("You") : esc(label)}</b>
        <time datetime="${new Date(item.time).toISOString()}">${messageTime.format(item.time)}</time></div>
        <p>${esc(item.message)}</p></li>`).join("")}</ul>` : `<p class="chat-empty muted">${t("No messages yet.")}</p>`;
    if (nearEnd) thread.scrollTop = thread.scrollHeight;
    if (Live.enabled) {
      if (Marketplace.unread(job, view.role)) Live.command("read-chat", { job: job.id, role: view.role });
    } else Marketplace.readChat(job.id, view.role);
  }

  function sync(state, scrollToEnd = false) {
    if (dialog.open && view) {
      const job = state.requests.find((item) => item.id === view.id);
      const open = job && Marketplace.activeStatuses.includes(job.status);
      if (!job) dialog.close();
      else if (view.kind === "chat") {
        updateThread(job, scrollToEnd);
        dialog.querySelector(".chat-compose").hidden = !open;
        dialog.querySelector(".chat-closed").hidden = open;
      } else if (!open && callState !== "ended") {
        callState = "ended";
        renderCall();
      }
    }
    const requests = Marketplace.read().requests;
    for (const badge of document.querySelectorAll("[data-unread]")) {
      const job = requests.find((item) => item.id === badge.dataset.job);
      const count = job ? Marketplace.unread(job, badge.dataset.role) : 0;
      badge.hidden = count === 0;
      badge.textContent = count > 9 ? "9+" : count;
      badge.setAttribute("aria-label", t(count === 1 ? "{count} unread message" : "{count} unread messages", { count }));
    }
  }

  function saveDraft(input) {
    if (view?.kind === "chat") drafts.set(view.key, input.value);
  }

  function quickMessage(index) {
    const input = dialog.querySelector("#chat-message");
    if (!input || !suggestions[index]) return;
    const current = input.value.trim();
    const message = t(suggestions[index]);
    const draft = current ? current + " " + message : message;
    input.value = draft.slice(0, input.maxLength);
    saveDraft(input);
    input.focus();
  }

  async function send(form) {
    if (view?.kind !== "chat") return;
    const input = form.elements.message;
    const message = input.value.trim();
    const error = dialog.querySelector(".contact-error");
    const { id, role, proId, key } = view;
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const result = message ? await mutatePreview("message", { job: id, role, message },
      () => Marketplace.contact(id, role, proId, message)) : { error: "Enter a message." };
    submit.disabled = false;
    if (view?.key !== key || !form.isConnected) return;
    error.hidden = !result.error;
    error.textContent = t(result.error || "");
    if (result.error) return;
    if (input.value.trim() === message) {
      input.value = "";
      drafts.delete(key);
    }
    sync(Marketplace.read(), true);
    input.focus();
  }

  document.querySelector("#dialog").addEventListener("close", () => {
    if (view?.kind === "chat") scrollPositions.set(view.key, dialog.querySelector(".chat-thread").scrollTop);
    view = null;
  });

  function reset() {
    drafts.clear();
    scrollPositions.clear();
  }

  return { actions, open, sync, advanceCall, quickMessage, saveDraft, send, reset };
})();
