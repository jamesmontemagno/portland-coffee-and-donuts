import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PLACES } from "../site/places.js";

test("the shortlist contains six coffee shops and six doughnut shops", () => {
  assert.equal(PLACES.length, 12);
  assert.equal(PLACES.filter((place) => place.category === "coffee").length, 6);
  assert.equal(PLACES.filter((place) => place.category === "doughnut").length, 6);
});

test("every stop has a unique map key and usable public details", () => {
  const ids = new Set();
  const numbers = new Set();

  for (const place of PLACES) {
    assert.ok(place.id && !ids.has(place.id), `duplicate or missing id: ${place.id}`);
    assert.ok(place.number && !numbers.has(place.number), `duplicate or missing number: ${place.number}`);
    assert.ok(place.name && place.neighborhood && place.address && place.note);
    assert.match(place.website, /^https:\/\//);
    assert.ok(Number.isFinite(place.lat) && place.lat >= 45.49 && place.lat <= 45.58);
    assert.ok(Number.isFinite(place.lng) && place.lng >= -122.70 && place.lng <= -122.60);
    ids.add(place.id);
    numbers.add(place.number);
  }
});

test("the HTML exposes category filters, search, and map fallbacks", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="place-search"/);
  assert.match(html, /data-category="coffee"/);
  assert.match(html, /data-category="doughnut"/);
  assert.match(html, /id="map"/);
  assert.match(html, /id="map-alert"/);
  assert.match(html, /openstreetmap\.org\/copyright/);
});
