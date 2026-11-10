const modalBackdrops = document.querySelectorAll(".modal-backdrop");
const toast = document.querySelector("#toast");

function openModal(id) {
  document.querySelector(`#${id}`).classList.add("open");
  document.querySelector(`#${id} input`)?.focus();
}

function closeModals() {
  modalBackdrops.forEach((modal) => modal.classList.remove("open"));
}

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.querySelectorAll(".modal-close").forEach((button) => button.addEventListener("click", closeModals));
modalBackdrops.forEach((modal) => modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModals();
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function selectService(service) {
  const input = document.querySelector("#search-input");
  input.value = service;
  input.focus();
  document.querySelector(".hero").scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => selectService(button.dataset.search));
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = document.querySelector("#search-input").value.trim();
  if (!value) {
    showToast("Tell us what you need help with first.");
    document.querySelector("#search-input").focus();
    return;
  }
  openModal("request-modal");
  document.querySelector("#request-modal input[name='service']").value = value;
});

document.querySelectorAll(".modal form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.hidden = true;
    form.nextElementSibling.hidden = false;
    window.setTimeout(closeModals, 2600);
  });
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelector(".main-nav").classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
