"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const site = require("../site-metadata.js");

test("public service pages have specific metadata and private pages are not indexed", () => {
  const origin = "https://asaan.example";
  assert.match(site.metadata("/tasks/plumbing-0", origin), /Fix a leaking tap \| ASAAN/);
  assert.match(site.metadata("/tasks/plumbing-0", origin), /canonical.*tasks\/plumbing-0/);
  assert.match(site.metadata("/bookings/example", origin), /noindex,nofollow/);
  assert.doesNotMatch(site.sitemap(origin), /\/bookings|\/admin/);
  assert.match(site.robots(origin), /Disallow: \/admin/);
});
