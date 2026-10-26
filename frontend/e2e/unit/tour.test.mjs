import test from "node:test";
import assert from "node:assert/strict";
import { chooseTour } from "../../src/utils/tourState.js";
import { TOUR_VERSION, WELCOME, WHATS_NEW } from "../../src/data/tour.js";

const now = new Date("2026-10-26T10:00:00Z").getTime();
const daysAgo = (n) => new Date(now - n * 86400e3).toISOString();
const pick = (o) => chooseTour({ now, version: "v2.1", ...o });

test("brand-new account with nothing remembered gets the welcome tour", () => {
  assert.equal(pick({ state: null, createdAt: daysAgo(0) }), "welcome");
  assert.equal(pick({ state: {}, createdAt: daysAgo(2) }), "welcome");
});
test("an older account with nothing remembered gets What's new, not the beginner tour", () => {
  assert.equal(pick({ state: null, createdAt: daysAgo(30) }), "whatsnew");
  assert.equal(pick({ state: null, createdAt: undefined }), "whatsnew");
  assert.equal(pick({ state: null, createdAt: "garbage" }), "whatsnew");
});
test("after the welcome tour, nothing until the next release", () => {
  assert.equal(pick({ state: { welcome: true, whatsNew: "v2.1" }, createdAt: daysAgo(0) }), null);
  assert.equal(pick({ state: { welcome: true, whatsNew: "v2.0" }, createdAt: daysAgo(40) }), "whatsnew");
});
test("What's new is shown once per release", () => {
  assert.equal(pick({ state: { whatsNew: "v2.1" }, createdAt: daysAgo(90) }), null);
  assert.equal(pick({ state: { whatsNew: "v1.9" }, createdAt: daysAgo(90) }), "whatsnew");
});
test("every role has both tours, each step has English and Hindi text and a known icon", () => {
  const icons = new Set(["Bell", "ClipboardCheck", "CreditCard", "Droplet", "HeartHandshake", "Image", "MessageCircle", "ShieldCheck", "Siren", "Sparkles", "Tent", "Users", "Warehouse"]);
  for (const set of [WELCOME, WHATS_NEW]) {
    for (const role of ["donor", "seeker", "hospital"]) {
      assert.ok(set[role].length >= 3, role);
      for (const s of set[role]) {
        assert.ok(icons.has(s.icon), s.icon);
        for (const k of ["title", "body"]) assert.ok(s[k].en.length > 5 && s[k].hi.length > 5 && /[\u0900-\u097F]/.test(s[k].hi), `${role}: ${s.title.en}`);
      }
    }
  }
  assert.equal(TOUR_VERSION, "v2.1");
});
