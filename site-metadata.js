"use strict";
const { services, tasks } = require("./mobile/shared/service-catalog.js");
const publicPages = ["/", "/customer", "/help", ...services.map((service) => "/services/" + service.id),
  ...tasks.map((task) => "/tasks/" + task.id),
  ...["about", "how", "coverage", "professional", "safety", "accessibility"].map((topic) => "/information/" + topic)];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function metadata(pathname, origin) {
  const service = services.find((item) => pathname === "/services/" + item.id);
  const task = tasks.find((item) => pathname === "/tasks/" + item.id);
  const title = task ? task.task + " | ASAAN" : service ? service.name + " services | ASAAN" : pathname === "/" ? "ASAAN | Home services" : "ASAAN";
  const description = task ? "Find local professionals for " + task.task.toLowerCase() + ". Check availability and review the starting rate before requesting a visit." : service ? "Browse " + service.name.toLowerCase() + " services and find professionals serving your area." : "Find local home service professionals, review their offers and request a visit with ASAAN.";
  const indexable = publicPages.includes(pathname);
  const canonical = origin.replace(/\/$/, "") + pathname;
  return `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${indexable ? "index,follow" : "noindex,nofollow"}">` +
    (indexable ? `<link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(canonical)}">` : "");
}
function sitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages.map((page) => `<url><loc>${escape(origin.replace(/\/$/, "") + page)}</loc></url>`).join("")}</urlset>`;
}
function robots(origin) { return `User-agent: *\nDisallow: /account\nDisallow: /admin\nDisallow: /bookings\nDisallow: /request\nDisallow: /worker\nDisallow: /support\nDisallow: /sign-in\nSitemap: ${origin.replace(/\/$/, "")}/sitemap.xml\n`; }
module.exports = { metadata, sitemap, robots, publicPages };
